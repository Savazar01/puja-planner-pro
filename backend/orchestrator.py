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

# --- Helpers ---

def log_agent_action(db, agent: str, tool: str, outcome: str, event_id: str = None):
    """Standardized audit logging for administrative visibility."""
    try:
        log = AgentLog(
            id=str(uuid.uuid4()),
            event_id=event_id,
            agent_type=agent.upper(),
            tool_used=tool,
            summary_outcome=outcome[:500] 
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Logging Failure: {e}")

# --- 5-Agent Node Registry ---

async def concierge_node(state: VedicEventState):
    """Concierge Agent: Initial greeting and triage."""
    db = SessionLocal()
    try:
        log_agent_action(db, "CONCIERGE", "Triage", f"Request received: {state.get('user_query')[:100]}", state.get("event_id"))
        return {
            "next_node": "scribe",
            "last_node": "concierge",
            "status": state.get("status") or "PLANNING"
        }
    finally:
        db.close()

async def scribe_node(state: VedicEventState):
    """Scribe Agent: Database Persistence."""
    db = SessionLocal()
    try:
        event_id = state.get("event_id")
        user_query = state.get("user_query", "")
        customer_id = state.get("customer_id") or "system"
        
        # [Supervisor Rule] Only create Event Record if we have a Ritual Name or explicit Approval
        harvested = state.get("intent_harvested", False)
        ritual = state.get("ritual_name")
        approval = state.get("customer_approval", False)

        if not event_id and (harvested or ritual or approval):
            # Create NEW event record only when we have enough data (Draft)
            event_id = str(uuid.uuid4())
            new_event = Event(
                id=event_id,
                customer_id=customer_id,
                title=f"Ritual: {ritual or user_query[:30]}",
                location=state.get("location"),
                status="PLANNING",
                intent_json=state 
            )
            db.add(new_event)
            db.commit()
            db.refresh(new_event)
            log_agent_action(db, "SCRIBE", "DB Persistence", f"Created new event record: {event_id}", event_id)
        elif event_id:
            event = db.query(Event).filter(Event.id == event_id).first()
            if event:
                # Sync volatile state to DB
                event.intent_json = state
                if ritual: event.title = f"Ritual: {ritual}"
                if state.get("location"): event.location = state.get("location")
                db.commit()
                log_agent_action(db, "SCRIBE", "DB Persistence", f"Updated event state for: {event_id}", event_id)

        # Static Routing Pattern
        last = state.get("last_node")
        if last == "concierge":
            target = "planner"
        elif last in ["finder", "supplies"]:
            target = "END" # Hand back to user after tools
        else:
            target = "END"

        return {"event_id": event_id, "next_node": target, "last_node": "scribe"}
    except Exception as e:
        print(f"Scribe Error: {e}")
        return {"next_node": "END", "last_node": "scribe"}
    finally:
        db.close()

def get_planner_greeting():
    """Mandatory Turn 1 Greeting."""
    return "Hello! I am your AI Event Manager. I’m here to help you coordinate and bring your vision to life. To get started, what is the name or occasion of the ritual you are planning?"

async def planner_node(state: VedicEventState):
    """Supervisor Agent: Intent Harvesting & Gatekeeper."""
    db = SessionLocal()
    try:
        # Robust Message Retrieval
        messages = state.get("messages", [])
        if messages:
            last_msg = messages[-1]
            # Handle both BaseMessage objects and tuples
            user_msg = last_msg.content if hasattr(last_msg, "content") else (last_msg[1] if isinstance(last_msg, tuple) else str(last_msg))
        else:
            user_msg = state.get("user_query", "")

        event_id = state.get("event_id")
        log_agent_action(db, "PLANNER", "Processing", f"Analyzing intent: {user_msg[:50]}...", event_id)
        
        # 1. Blank Canvas Greeting (Empty/Generic)
        if not user_msg or user_msg.lower() in ["hi", "hello", "start", "welcome"]:
            log_agent_action(db, "PLANNER", "Dialogue", "Returning Turn 1 Greeting", event_id)
            return {
                "clarification_needed": True,
                "clarification_message": get_planner_greeting(),
                "next_node": "scribe",
                "last_node": "planner"
            }

        # 2. Intent Analysis & Feedback Generation
        prompt = f"""
        Analyze intent: "{user_msg}"
        Current State: Ritual: {state.get('ritual_name')}, Lang: {state.get('language')}, Style: {state.get('style')}, Loc: {state.get('location')}.
        
        Requirements:
        1. Summarize what you understood (e.g., "I see you're planning a Satyanarayana Puja in Hyderabad...").
        2. Identify missing core details (Date, Time, Style, Language).
        3. Set intent_harvested=True only if Ritual, Language, Style, and Location are all set.
        4. Provide a empathetic feedback message.
        
        Return ONLY valid JSON: 
        {{
            "ritual_name": "...", 
            "language": "...", 
            "style": "...", 
            "location": "...", 
            "intent_harvested": bool, 
            "feedback": "Your summary and feedback here...",
            "missing_details_question": "Questions for missing info..."
        }}
        """
        
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=settings.gemini_api_key)
        print(f"DEBUG: Calling LLM for intent: {user_msg[:50]}")
        response = await llm.ainvoke(prompt)
        print(f"DEBUG: LLM Response received: {response.content[:100]}")
        
        # Robust JSON extraction
        raw_text = response.content.strip()
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0].strip()
        
        data = json.loads(raw_text)
        
        # State Sync
        ritual = data.get("ritual_name") or state.get("ritual_name")
        harvested = data.get("intent_harvested", False)
        customer_approved = state.get("customer_approval", False)
        
        # Reliable Turn-0 Detection (Check if we JUST came from Concierge->Scribe sequence)
        is_first_interaction = state.get("last_node") == "scribe" and not state.get("intent_harvested", False)

        log_agent_action(db, "PLANNER", "Intent Analysis", f"Harvested: {harvested}, Ritual: {ritual}", event_id)

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
                "clarification_message": f"**PLAN SUMMARY:**\n- **Ritual:** {ritual}\n- **Location:** {data.get('location') or state.get('location')}\n- **Style:** {data.get('style') or state.get('style')}\n\nI have everything I need to help you find a Pandit, Venue, and Caterer for your {ritual}. Shall I proceed to get everything ready for you?",
                "next_node": "scribe",
                "last_node": "planner"
            }
        
        # Case C: Approved -> HAND OFF TO TOOLS
        log_agent_action(db, "PLANNER", "Supervisor", "Handing off to Finder/Discovery", event_id)
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
    finally:
        db.close()

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
