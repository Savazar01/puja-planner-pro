import json
import uuid
from typing import Annotated, Dict, List, Optional, TypedDict, Union
from datetime import datetime

from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END, START
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from pydantic import BaseModel, Field

from config import settings
from database import get_db
from models import Event, AgentLog, Supply
from discovery_agent import DiscoveryAgent

# Initialize standard components
discovery_agent = DiscoveryAgent()

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
    roles_needed: List[str]
    providers_found: List[Dict]
    supplies_suggested: List[Dict]
    status: str
    next_node: str
    clarification_needed: bool
    clarification_message: Optional[str]

# --- Nodes ---

async def planner_node(state: VedicEventState):
    """Planner Agent: Analyzes intent and context."""
    user_msg = state["messages"][-1].content if state["messages"] else state["user_query"]
    
    # Intent Analysis Prompt
    prompt = f"""
    You are the Planner Agent for MyPandits. Analyze the user's intent: "{user_msg}"
    
    Extract:
    1. ritual_name (e.g., Satyanarayana Swamy, Wedding)
    2. language (e.g., Telugu, Hindi)
    3. style (e.g., Sattvik, Grand, Simple)
    4. location (e.g., Hyderabad, Mumbai)
    
    Determine if context for 'language' and 'style' is complete.
    
    Return JSON:
    {{
        "ritual_name": "Satyanarayana Swamy",
        "language": "Telugu",
        "style": "Sattvik",
        "location": "Hyderabad",
        "context_complete": true,
        "question": "Only if context_complete is false, a warm question to ask"
    }}
    """
    
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=settings.gemini_api_key)
    response = await llm.ainvoke(prompt)
    
    try:
        # Simple extraction logic (can be refined with Pydantic output parsers)
        data = json.loads(response.content.strip().replace("```json", "").replace("```", ""))
        
        return {
            "ritual_name": data.get("ritual_name") or state.get("ritual_name"),
            "language": data.get("language") or state.get("language"),
            "style": data.get("style") or state.get("style"),
            "location": data.get("location") or state.get("location"),
            "clarification_needed": not data.get("context_complete"),
            "clarification_message": data.get("question"),
            "next_node": "finder" if data.get("context_complete") else "scribe"
        }
    except Exception as e:
        print(f"Planner Error: {e}")
        return {"next_node": "scribe"}

async def finder_node(state: VedicEventState):
    """Finder Agent: Sourcing professionals."""
    if state.get("clarification_needed"):
        return {"next_node": "scribe"}
        
    role_list = ["PANDIT", "VENUE", "CATERING"]
    all_results = []
    
    # Run searches through the DiscoveryAgent which uses the Privacy Gate
    # In a real LangGraph, we might use tools, but here we wrap the existing agent logic
    with next(get_db()) as db:
        for role in role_list:
            res = await discovery_agent.discover_providers(
                role=role,
                location=state.get("location") or "India",
                db=db,
                ritual_name=state.get("ritual_name", ""),
                language=state.get("language", ""),
                style=state.get("style", "")
            )
            all_results.extend(res)
            
    return {
        "providers_found": all_results,
        "next_node": "supplies"
    }

async def supplies_node(state: VedicEventState):
    """Supplies Agent: Suggesting samagri."""
    ritual = state.get("ritual_name", state.get("user_query"))
    suggested = discovery_agent.suggest_ritual_supplies(ritual)
    
    return {
        "supplies_suggested": suggested,
        "next_node": "scribe"
    }

async def scribe_node(state: VedicEventState):
    """Scribe Agent: Persistent State Management (Silent Save)."""
    with next(get_db()) as db:
        event_id = state.get("event_id")
        customer_id = state.get("customer_id")
        
        if not event_id:
            # Create new DRAFT event
            event = Event(
                id=str(uuid.uuid4()),
                customer_id=customer_id or "system",
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
                # Auto-transition status if context is complete
                if not state.get("clarification_needed") and event.status == "DRAFT":
                    event.status = "ROLES_CONFIRMED"
                db.commit()
        
        # Save supplies if any were suggested
        if state.get("supplies_suggested"):
            # Check if supplies already exist to avoid duplicates
            existing_count = db.query(Supply).filter(Supply.event_id == event_id).count()
            if existing_count == 0:
                for item in state["supplies_suggested"]:
                    supply = Supply(
                        id=str(uuid.uuid4()),
                        event_id=event_id,
                        name=item["name"],
                        category=item.get("category"),
                        quantity=item.get("quantity")
                    )
                    db.add(supply)
                db.commit()

        # Audit Log
        log = AgentLog(
            id=str(uuid.uuid4()),
            event_id=event_id,
            agent_type="SCRIBE",
            tool_used="Checkpointer",
            summary_outcome=f"State Persisted for {event_id}. Status: {event.status if event else 'N/A'}"
        )
        db.add(log)
        db.commit()
        
    return {"event_id": event_id}

# --- Graph ---

workflow = StateGraph(VedicEventState)

workflow.add_node("planner", planner_node)
workflow.add_node("finder", finder_node)
workflow.add_node("supplies", supplies_node)
workflow.add_node("scribe", scribe_node)

workflow.add_edge(START, "planner")

def router(state: VedicEventState):
    return state.get("next_node", "scribe")

workflow.add_conditional_edges("planner", router)
workflow.add_edge("finder", "supplies")
workflow.add_edge("supplies", "scribe")
workflow.add_edge("scribe", END)

# Memory Checkpointer for now (In Production this would be Postgres)
checkpointer = MemorySaver()
graph = workflow.compile(checkpointer=checkpointer)
捉
