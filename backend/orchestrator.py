import uuid
import json
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

# --- 5-Agent Node Registry ---

async def concierge_node(state: VedicEventState):
    """Concierge Agent: Initial greeting and triage."""
    # Logic: Triage the user and hand off to the Scribe for initial save.
    return {
        "next_node": "scribe",
        "status": state.get("status") or "DRAFT"
    }

async def scribe_node(state: VedicEventState):
    """Scribe Agent: SILENT PERSISTENCE (Postgres)."""
    with next(get_db()) as db:
        event_id = state.get("event_id")
        
        if not event_id:
            event = Event(
                id=str(uuid.uuid4()),
                customer_id=state.get("customer_id") or "system",
                title=state["user_query"][:50],
                location=state.get("location"),
                status="DRAFT"
            )
            db.add(event)
            db.commit()
            db.refresh(event)
            event_id = event.id
        else:
            event = db.query(Event).filter(Event.id == event_id).first()
            if event:
                event.location = state.get("location") or event.location
                if state.get("intent_harvested") and event.status == "DRAFT":
                    event.status = "ROLES_CONFIRMED"
                db.commit()
        
        # Persistence for logs
        log = AgentLog(
            id=str(uuid.uuid4()),
            event_id=event_id,
            agent_type="SCRIBE",
            tool_used="LangGraph Persistence",
            summary_outcome=f"State synced for Event {event_id}. Intent Harvested: {state.get('intent_harvested')}."
        )
        db.add(log)
        db.commit()
        
        # Determine where to go next
        # If we just arrived from Concierge, go to Planner
        # If we arrived from Supplies, we are done
        prev_node = state.get("next_node")
        next_n = "planner" if prev_node == "scribe" or not prev_node else "END"
        if prev_node == "supplies":
            next_n = "END"
            
    return {"event_id": event_id, "next_node": next_n}

async def planner_node(state: VedicEventState):
    """Planner Agent: Intent Harvesting & Hard Gating."""
    user_msg = state["messages"][-1].content if state["messages"] else state["user_query"]
    
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
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=settings.gemini_api_key)
    response = await llm.ainvoke(prompt)
    
    try:
        data = json.loads(response.content.strip().replace("```json", "").replace("```", ""))
        harvested = data.get("intent_harvested", False)
        return {
            "ritual_name": data.get("ritual_name") or state.get("ritual_name"),
            "language": data.get("language") or state.get("language"),
            "style": data.get("style") or state.get("style"),
            "location": data.get("location") or state.get("location"),
            "intent_harvested": harvested,
            "clarification_needed": not harvested,
            "clarification_message": data.get("question") if not harvested else None,
            "next_node": "finder" if harvested else "scribe"
        }
    except:
        return {"next_node": "scribe"}

from tools import SerperSearchTool, FirecrawlScrapeTool

async def finder_node(state: VedicEventState):
    """Finder Agent: PROFESSIONAL DISCOVERY (HARD GATED)."""
    # Only reachable if intent_harvested is True
    role_list = ["PANDIT", "VENUE", "CATERING"]
    all_results = []
    
    search_tool = SerperSearchTool()
    
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
            
    return {
        "providers_found": all_results,
        "next_node": "supplies"
    }

async def supplies_node(state: VedicEventState):
    """Supplies Agent: Suggesting samagri."""
    ritual = state.get("ritual_name", state.get("user_query"))
    suggested = discovery_agent.suggest_ritual_supplies(ritual)
    return {"supplies_suggested": suggested, "next_node": "scribe"}

# --- Unified Graph Construction ---

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
graph = workflow.compile(checkpointer=checkpointer)
