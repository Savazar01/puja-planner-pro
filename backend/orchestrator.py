import uuid
import json
import os
from datetime import datetime
import traceback
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

def get_agent_prompt(agent_name: str) -> str:
    """Load agent persona from audited .md files."""
    try:
        path = os.path.join(os.getcwd(), "roles", "agents", f"{agent_name}_agent.md")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
    except Exception as e:
        print(f"Warning: Could not load {agent_name} prompt: {e}")
    return "You are a helpful AI assistant."

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
    event_date: Optional[str]
    event_time: Optional[str]
    guest_count: Optional[int]
    needs_pandit: bool
    needs_caterer: bool
    needs_venue: bool
    cuisine_type: Optional[str]
    intent_harvested: bool
    roles_needed: List[str]
    providers_found: List[Dict]
    supplies_suggested: List[Dict]
    agent_commands: Dict[str, str] # Instructions for other agents
    status: str
    next_node: str
    clarification_needed: bool
    clarification_message: Optional[str]
    customer_approval: bool 
    last_node: str 

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

        # [Supervisor Rule] Only save serializable fields to DB
        serializable_state = {k: v for k, v in state.items() if k not in ["messages"]}

        # [Supervisor Rule] Proactively create Event Record (Draft) as soon as we have a query
        if not event_id and user_query:
            event_id = str(uuid.uuid4())
            new_event = Event(
                id=event_id,
                customer_id=customer_id,
                title=user_query[:50],
                location=state.get("location"),
                status="PLANNING",
                intent_json=serializable_state 
            )
            db.add(new_event)
            db.commit()
            db.refresh(new_event)
            log_agent_action(db, "SCRIBE", "DB Persistence", f"Proactively created draft event: {event_id}", event_id)
        # [Silent Save Protocol] Force commit to DB if intent is harvested or if it's a new draft
        if harvested or (not event_id and user_query):
            if not event_id: event_id = str(uuid.uuid4())
            event = db.query(Event).filter(Event.id == event_id).first()
            if not event:
                event = Event(id=event_id, customer_id=customer_id, title=user_query[:50], status="PLANNING")
                db.add(event)
            
            event.intent_json = serializable_state
            if ritual: event.title = f"Ritual: {ritual}"
            if state.get("location"): event.location = state.get("location")
            
            # Sync Event Date/Time with robust parsing
            raw_date = state.get("event_date")
            raw_time = state.get("event_time")
            if raw_date and raw_date != "null":
                try:
                    dt_str = raw_date
                    if raw_time and raw_time != "null" and " " not in dt_str: dt_str += f" {raw_time}"
                    if "T" in dt_str: event.event_date = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
                    else:
                        try: event.event_date = datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
                        except: event.event_date = datetime.strptime(raw_date, "%Y-%m-%d")
                except: pass

            db.commit()
            log_agent_action(db, "SCRIBE", "Silent Save", "Hard committed event state to DB.", event_id)

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
    """Mandatory Turn 1 Greeting from planner_agent.md."""
    return "Hello! I am your AI Event Manager. I’m here to help you coordinate and bring your vision to life. To help me get started, could you share a bit about what you are planning? I’m ready to help you organize every detail, and I will take my lead entirely from you."

async def planner_node(state: VedicEventState):
    """Supervisor Agent: Intent Harvesting & Gatekeeper."""
    db = SessionLocal()
    try:
        system_prompt = get_agent_prompt("planner")
        
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
            }        # 2. Intent Analysis & Feedback Generation
        prompt = f"""
        {system_prompt}
        
        Current State for Analysis:
        - Ritual: {state.get('ritual_name') or 'Unknown'}
        - Location: {state.get('location') or 'Unknown'}
        - Date: {state.get('event_date') or 'Unknown'}
        - Time: {state.get('event_time') or 'Unknown'}
        - Guests: {state.get('guest_count') or 0}
        - Services: Pandit:{state.get('needs_pandit')}, Caterer:{state.get('needs_caterer')}, Venue:{state.get('needs_venue')}
        
        User input: "{user_msg}"
        
        Rules:
        - summarize strictly what was provided.
        - intent_harvested = True ONLY if 1, 2, 3, 4, 5, and 6 are all resolved.
        - Generate a specific "agent_commands" for the Finder Agent describing exactly who to look for.
        
        Return ONLY valid JSON.
        """
        
        # [UPGRADE] Using gemini-3-flash-preview with forced v1beta API version
        llm = ChatGoogleGenerativeAI(
            model=settings.agent_planner_llm, 
            google_api_key=settings.gemini_api_key,
            version="v1beta" 
        )
        response = await llm.ainvoke(prompt)
        
        # Robust JSON extraction
        raw_text = response.content.strip()
        json_str = ""
        
        if "```json" in raw_text:
            json_str = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            json_str = raw_text.split("```")[1].split("```")[0].strip()
        elif "{" in raw_text and "}" in raw_text:
            # Fallback: extract substring between first { and last }
            start = raw_text.find("{")
            end = raw_text.rfind("}") + 1
            json_str = raw_text[start:end]
        else:
            json_str = raw_text

        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as je:
            log_agent_action(db, "PLANNER", "ERROR", f"JSON Decode Error. Raw: {raw_text[:100]}", event_id)
            raise je
        
        # State Sync
        ritual = data.get("ritual_name") or state.get("ritual_name")
        harvested = data.get("intent_harvested", False)
        customer_approved = state.get("customer_approval", False)
        
        is_first_interaction = state.get("last_node") == "scribe" and not state.get("intent_harvested", False)

        log_agent_action(db, "PLANNER", "Supervisor Analysis", f"Harvested: {harvested}, Data: {data.get('feedback', '')[:100]}", event_id)

        # 3. SUPERVISOR LOGIC: The Human-Approval Gate
        if not harvested:
            return {
                **data,
                "clarification_needed": True,
                "clarification_message": data.get("feedback") + "\n\n" + data.get("missing_details_question"),
                "next_node": "scribe",
                "last_node": "planner"
            }
        
        if harvested and (not customer_approved or is_first_interaction):
            return {
                **data,
                "clarification_needed": True,
                "clarification_message": f"**PLAN SUMMARY:**\n- **Ritual:** {ritual}\n- **Date/Time:** {data.get('event_date')} at {data.get('event_time')}\n- **Location:** {data.get('location')}\n- **Guests:** {data.get('guest_count')}\n- **Services:** {'Pandit, ' if data.get('needs_pandit') else ''}{'Catering, ' if data.get('needs_caterer') else ''}{'Venue' if data.get('needs_venue') else ''}\n\nShall I proceed to source these providers for you?",
                "next_node": "scribe",
                "last_node": "planner"
            }
        
        # Case C: Approved -> HAND OFF TO TOOLS
        log_agent_action(db, "PLANNER", "Supervisor", "Handing off to Discovery Agents", event_id)
        return {
            **data,
            "next_node": "finder",
            "last_node": "planner"
        }
        
    except Exception as e:
        err_msg = traceback.format_exc()
        print(f"Planner Critical Failure: {err_msg}")
        log_agent_action(db, "PLANNER", "ERROR", f"Crash in supervisor: {str(e)[:200]}", event_id)
        return {
            "clarification_needed": True,
            "clarification_message": f"I've encountered a small snag, but your plan is safe. Could you tell me more about your ritual requirements?",
            "next_node": "scribe",
            "last_node": "planner"
        }
    finally:
        db.close()

async def finder_node(state: VedicEventState):
    """Finder Agent: PROFESSIONAL DISCOVERY (Supervisor Gated)."""
    # [FIX] Do NOT hold a DB connection here while awaiting long web searches.
    # discovery_agent.discover_providers will now handle its own short-lived sessions.
    try:
        # Use supervisor-generated roles or commands
        commands = state.get("agent_commands", {})
        finder_prompt = commands.get("finder", "")
        
        role_list = []
        if state.get("needs_pandit"): role_list.append("PANDIT")
        if state.get("needs_venue"): role_list.append("VENUE")
        if state.get("needs_caterer"): role_list.append("CATERING")
        
        if not role_list:
            role_list = ["PANDIT"] # Default fallback

        all_results = []
        location = state.get("location", "India")
        ritual = state.get("ritual_name", "")

        for role in role_list:
            providers = await discovery_agent.discover_providers(
                role, location, db=None, # Pass None so discovery_agent creates short-lived sessions
                ritual_name=ritual, 
                language=state.get("language", ""), 
                style=state.get("style", ""),
                agent_command=finder_prompt
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
            "clarification_message": "I've started searching for your providers, but the external web search is taking longer than expected.",
            "clarification_needed": True
        }
    finally:
        db.close()

async def supplies_node(state: VedicEventState):
    """Supplies Agent: Suggesting samagri."""
    try:
        commands = state.get("agent_commands", {})
        ritual_hint = commands.get("supplies") or state.get("ritual_name") or state.get("user_query")
        suggested = discovery_agent.suggest_ritual_supplies(ritual_hint)
        return {"supplies_suggested": suggested, "next_node": "scribe", "last_node": "supplies"}
    except Exception as e:
        print(f"Supplies Agent Error: {e}")
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
