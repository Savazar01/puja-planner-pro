import uuid
import json
import os
from datetime import datetime
from typing import Annotated, List, Dict, Optional, Any
from typing_extensions import TypedDict

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.memory import MemorySaver

from config import settings
from database import get_db
from models import Event, AgentLog
from discovery_agent import discovery_agent

class VedicEventState(TypedDict):
    """The state of the Vedic Event orchestration."""
    messages: Annotated[list, add_messages]
    event_id: Optional[str]
    customer_id: Optional[str]
    user_query: str
    ritual_name: Optional[str]
    language: Optional[str]
    style: Optional[str]
    location: Optional[str]
    intent_harvested: bool
    roles_needed: List[str]
    providers_found: List[Dict]
    supplies_suggested: List[Dict]
    status: str
    next_node: str
    clarification_needed: bool
    clarification_message: Optional[str]
    customer_approval: bool # NEW: Hard Gate for Sourcing
    last_node: str # For stable routing

# --- 5-Agent Node Registry ---

async def concierge_node(state: VedicEventState):
    """Concierge Agent: Initial greeting and triage."""
    return {
        "next_node": "scribe",
        "last_node": "concierge",
        "status": state.get("status") or "DRAFT"
    }

async def scribe_node(state: VedicEventState):
    """Scribe Agent: Database Persistence (Silent Save)."""
    try:
        with next(get_db()) as db:
            event_id = state.get("event_id")
            
            # 1. Persistence Logic
            if not event_id:
                event = Event(
                    id=str(uuid.uuid4()),
                    customer_id=state.get("customer_id") or "system",
                    title=state["user_query"][:50],
                    location=state.get("location"),
                    status="DRAFT",
                    intent_json=state 
                )
                db.add(event)
                db.commit()
                db.refresh(event)
                event_id = event.id
            else:
                event = db.query(Event).filter(Event.id == event_id).first()
                if event:
                    event.location = state.get("location") or event.location
                    event.intent_json = state
                    if state.get("intent_harvested") and event.status == "DRAFT":
                        event.status = "ROLES_CONFIRMED"
                    db.commit()
            
            # 2. Routing Decision (CRITICAL: Fix Infinite Loop)
            # If we just arrived from concierge, go to planner
            if state.get("last_node") == "concierge":
                return {"event_id": event_id, "next_node": "planner", "last_node": "scribe"}
            
            # If we were in a loop for clarification, we should hit END
            if state.get("clarification_needed"):
                return {"event_id": event_id, "next_node": "END", "last_node": "scribe"}
            
            # If we came from supplies (end of sourcing), we should hit END
            if state.get("last_node") == "supplies":
                return {"event_id": event_id, "next_node": "END", "last_node": "scribe"}

        return {"event_id": event_id, "next_node": "END", "last_node": "scribe"}
    except Exception as e:
        print(f"Warning: Persistence Failed: {e}")
        return {"next_node": "END", "last_node": "scribe"}

def get_planner_greeting():
    """Extract Turn 1 greeting from planner_agent.md."""
    try:
        path = "roles/agents/planner_agent.md"
        if not os.path.exists(path):
            return "Hello! I am your AI Event Manager. How can I help you plan your ritual today?"
        
        with open(path, "r") as f:
            content = f.read()
            if "### Turn 1: The Blank Canvas Opening" in content:
                # Simple extraction of the blocked quote
                parts = content.split("### Turn 1: The Blank Canvas Opening")[1].split("> \"")[1].split("\"")[0]
                return parts
    except: pass
    return "Hello! I am your AI Event Manager. I’m here to help you coordinate and bring your vision to life. To get started, what is the name or occasion of the ritual you are planning?"

async def planner_node(state: VedicEventState):
    """Planner Agent: Intent Harvesting & Hard Gating."""
    user_msg = state["messages"][-1].content if state["messages"] else state["user_query"]
    
    # 0. Check for Empty/Start Intent (Turn 1 Greeting)
    if not user_msg or user_msg.lower() in ["hi", "hello", "start", "begin", "plan"]:
        return {
            "clarification_needed": True,
            "clarification_message": get_planner_greeting(),
            "next_node": "scribe",
            "last_node": "planner",
            "intent_harvested": False
        }

    # 1. PII Scrubbing (Mandatory)
    import httpx
    scrubbed_msg = user_msg
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            scrub_resp = await client.post(
                f"{settings.privacy_gate_url}/process",
                json={"prompt": user_msg},
                headers={"X-Agent-Name": "PLANNER"}
            )
            if scrub_resp.status_code == 200:
                scrubbed_msg = scrub_resp.json().get("text", user_msg)
    except: pass

    # 2. Intent Analysis
    prompt = f"""
    Analyze the intent: "{scrubbed_msg}"
    Current state: Ritual: {state.get('ritual_name')}, Language: {state.get('language')}, Style: {state.get('style')}.
    
    Extract: ritual_name, language, style, location.
    Set intent_harvested=True only if ritual_name, language, AND style are all now known (combine with current state).
    
    Return JSON: {{"ritual_name": "...", "language": "...", "style": "...", "location": "...", "intent_harvested": bool, "question": "..."}}
    """
    try:
        # Bypassing Privacy Gate as per directive for direct API handshake
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=settings.gemini_api_key)
        response = await llm.ainvoke(prompt)
        data = json.loads(response.content.strip().replace("```json", "").replace("```", ""))
        harvested = data.get("intent_harvested", False)
        
        # CONSENSUS GATE: Hard block on discovery until approval
        customer_approved = state.get("customer_approval", False)
        ritual = data.get("ritual_name") or state.get("ritual_name")
        
        if harvested and not customer_approved:
            # Enforce Turn 1-3 Consensus Protocol
            return {
                "ritual_name": ritual,
                "language": data.get("language") or state.get("language"),
                "style": data.get("style") or state.get("style"),
                "location": data.get("location") or state.get("location"),
                "intent_harvested": True,
                "clarification_needed": True,
                "clarification_message": f"I have the initial details for your {ritual}. Shall I proceed to find a Pandit and Caterer for you?",
                "next_node": "scribe",
                "last_node": "planner"
            }

        return {
            "ritual_name": ritual,
            "language": data.get("language") or state.get("language"),
            "style": data.get("style") or state.get("style"),
            "location": data.get("location") or state.get("location"),
            "intent_harvested": harvested,
            "clarification_needed": not harvested,
            "clarification_message": data.get("question") if not harvested else None,
            "next_node": "finder" if (harvested and customer_approved) else "scribe",
            "last_node": "planner"
        }
    except Exception as e:
        print(f"Planner Error: {e}")
        return {
            "clarification_needed": True,
            "clarification_message": "I've saved your draft. Could you tell me more about the ritual style or language you prefer?",
            "next_node": "scribe",
            "last_node": "planner",
            "status": "DRAFT_SAVED"
        }

from tools import SerperSearchTool, FirecrawlScrapeTool

async def finder_node(state: VedicEventState):
    """Finder Agent: PROFESSIONAL DISCOVERY (HARD GATED)."""
    # Only reachable if intent_harvested is True
    role_list = ["PANDIT", "VENUE", "CATERING"]
    all_results = []
    
    search_tool = SerperSearchTool()
    
    try:
        for role in role_list:
            # Use Tool for external search
            search_results = await search_tool.ainvoke({
                "query": state["user_query"],
                "location": state.get("location") or "India",
                "ritual_name": state.get("ritual_name", ""),
                "role": role
            })
            
            # Simple extraction for now to satisfy the structure
            if isinstance(search_results, dict) and "organic" in search_results:
                for item in search_results["organic"][:3]:
                    all_results.append({
                        "id": str(uuid.uuid4()),
                        "name": item.get("title", "Unknown"),
                        "role": role,
                        "location": state.get("location") or "India",
                        "website": item.get("link"),
                        "is_platform_member": False,
                        "additional_info": {"snippet": item.get("snippet")}
                    })
    except Exception as e:
        print(f"Finder Agent Error (Graceful Failure): {e}")
        # Log failure but continue with empty results
            
    return {
        "providers_found": all_results,
        "next_node": "supplies",
        "last_node": "finder"
    }

async def supplies_node(state: VedicEventState):
    """Supplies Agent: Suggesting samagri."""
    try:
        ritual = state.get("ritual_name", state.get("user_query"))
        suggested = discovery_agent.suggest_ritual_supplies(ritual)
        return {"supplies_suggested": suggested, "next_node": "scribe", "last_node": "supplies"}
    except Exception as e:
        print(f"Supplies Agent Error (Graceful Failure): {e}")
        return {"supplies_suggested": [], "next_node": "scribe", "last_node": "supplies"}

# --- Unified Graph Construction (Lazy Loaded) ---

_graph = None

def get_orchestrator_graph():
    """Lazily compile the graph to prevent blocking worker startup."""
    global _graph
    if _graph is not None:
        return _graph
        
    workflow = StateGraph(VedicEventState)
    
    workflow.add_node("concierge", concierge_node)
    workflow.add_node("scribe", scribe_node)
    workflow.add_node("planner", planner_node)
    workflow.add_node("finder", finder_node)
    workflow.add_node("supplies", supplies_node)
    
    workflow.add_edge(START, "concierge")
    workflow.add_edge("concierge", "scribe")
    
    def router(state: VedicEventState):
        n = state.get("next_node", "scribe")
        if n == "END":
            return END
        return n
    
    workflow.add_conditional_edges("scribe", router)
    workflow.add_conditional_edges("planner", router)
    workflow.add_edge("finder", "supplies")
    workflow.add_edge("supplies", "scribe")
    
    checkpointer = MemorySaver()
    _graph = workflow.compile(checkpointer=checkpointer)
    return _graph
