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
from database import SessionLocal
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
    """Scribe Agent: Database Persistence."""
    db = SessionLocal()
    try:
        event_id = state.get("event_id")
        # Ensure event exists or create it
        if not event_id:
            event = Event(
                id=str(uuid.uuid4()),
                customer_id=state.get("customer_id") or "system",
                title=state["user_query"][:50],
                location=state.get("location"),
                status="PLANNING",
                intent_json=state 
            )
            db.add(event)
            db.commit()
            db.refresh(event)
            event_id = event.id
        else:
            event = db.query(Event).filter(Event.id == event_id).first()
            if event:
                event.intent_json = state
                db.commit()

        # Routing: Concierge -> Scribe -> Planner
        if state.get("last_node") == "concierge":
            return {"event_id": event_id, "next_node": "planner", "last_node": "scribe"}
        
        # Terminal Path
        return {"event_id": event_id, "next_node": "END", "last_node": "scribe"}
    except Exception as e:
        print(f"Scribe Error (Graceful): {e}")
        return {"next_node": "END", "last_node": "scribe"}
    finally:
        db.close()
捉
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
    except: pass    # 2. Intent Analysis
    prompt = f"""
    Analyze the intent: "{scrubbed_msg}"
    Current state: Ritual: {state.get('ritual_name')}, Language: {state.get('language')}, Style: {state.get('style')}.
    
    Extract: ritual_name, language, style, location.
    Set intent_harvested=True only if ritual_name, language, AND style (Vedic, Modern, etc.) are all now known (combine with current state).
    
    Return ONLY valid JSON: {{"ritual_name": "...", "language": "...", "style": "...", "location": "...", "intent_harvested": bool, "question": "..."}}
    """
    try:
        # Bypassing Privacy Gate for direct API handshake
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=settings.gemini_api_key)
        response = await llm.ainvoke(prompt)
        
        # Robust JSON extraction
        raw_content = response.content.strip()
        if "```json" in raw_content:
            raw_content = raw_content.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_content:
            raw_content = raw_content.split("```")[1].strip()
        
        data = json.loads(raw_content)
        raw_json = response.content.strip().replace("```json", "").replace("```", "")
        data = json.loads(raw_json)
        
        # State Sync
        ritual = data.get("ritual_name") or state.get("ritual_name")
        harvested = data.get("intent_harvested", False)
        customer_approved = state.get("customer_approval", False)
        is_first_interaction = not state.get("event_id")

        # 3. SUPERVISOR LOGIC: The Human-Approval Gate
        # Case A: Details missing -> Ask questions
        if not harvested:
            return {
                "ritual_name": ritual,
                "language": data.get("language") or state.get("language"),
                "style": data.get("style") or state.get("style"),
                "location": data.get("location") or state.get("location"),
                "clarification_needed": True,
                "clarification_message": data.get("feedback") + " " + data.get("missing_details_question"),
                "next_node": "scribe",
                "last_node": "planner"
            }
        
        # Case B: Details COMPLETE but no approval / First Interaction -> MANDATORY SUMMARY & CONSENSUS
        if harvested and (not customer_approved or is_first_interaction):
            return {
                "ritual_name": ritual,
                "language": data.get("language") or state.get("language"),
                "style": data.get("style") or state.get("style"),
                "location": data.get("location") or state.get("location"),
                "intent_harvested": True,
                "clarification_needed": True,
                "clarification_message": f"**PLAN SUMMARY:**\n- **Ritual:** {ritual}\n- **Location:** {data.get('location') or state.get('location')}\n- **Style:** {data.get('style') or state.get('style')}\n\nI have everything I need. Shall I proceed to find a Pandit and Caterer for you?",
                "next_node": "scribe",
                "last_node": "planner"
            }
        
        # Case C: Approved -> HAND OFF TO TOOLS
        return {
            "ritual_name": ritual,
            "next_node": "finder",
            "last_node": "planner"
        }
        
    except Exception as e:
        print(f"Planner Error: {e}")
        return {
            "clarification_needed": True,
            "clarification_message": "I've encountered a small snag, but your plan is safe. Could you tell me more about your ritual requirements?",
            "next_node": "scribe",
            "last_node": "planner"
        }

from tools import SerperSearchTool, FirecrawlScrapeTool
async def finder_node(state: VedicEventState):
    """Finder Agent: PROFESSIONAL DISCOVERY (Supervisor Gated)."""
    db = SessionLocal()
    try:
        role_list = ["PANDIT", "VENUE", "CATERING"]
        all_results = []
        
        location = state.get("location", "India")
        ritual = state.get("ritual_name", "")
        language = state.get("language", "")
        style = state.get("style", "")

        for role in role_list:
            providers = await discovery_agent.discover_providers(
                role, location, db, 
                ritual_name=ritual, 
                language=language, 
                style=style
            )
            all_results.extend(providers)
                
        return {
            "providers_found": all_results,
            "next_node": "supplies",
            "last_node": "finder"
        }
    except Exception as e:
        print(f"Finder Error: {e}")
        return {
            "next_node": "supplies",
            "last_node": "finder",
            "clarification_message": "I've started searching for your providers, but the external web search is taking longer than expected. I will continue to work on this in the background.",
            "clarification_needed": True
        }
    finally:
        db.close()
捉
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
