# --- New Unified Orchestrator v2.5 ---

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
    clarification_message: Optional[str]

# --- 5-Agent Node Registry ---

async def concierge_node(state: VedicEventState):
    """Concierge Agent: Initial greeting and triage."""
    # Logic: If it's the first message, provide a professional greeting.
    # Check if event_id already has data.
    return {
        "next_node": "planner",
        "status": state.get("status") or "DRAFT"
    }

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
    Extract: ritual_name, language, style, location.
    Set intent_harvested=True only if ritual_name, language, AND style are all present.
    
    Return JSON: {{"ritual_name": "...", "language": "...", "style": "...", "location": "...", "intent_harvested": bool, "question": "..."}}
    """
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=settings.gemini_api_key)
    response = await llm.ainvoke(prompt)
    
    try:
        data = json.loads(response.content.strip().replace("```json", "").replace("```", ""))
        return {
            "ritual_name": data.get("ritual_name") or state.get("ritual_name"),
            "language": data.get("language") or state.get("language"),
            "style": data.get("style") or state.get("style"),
            "location": data.get("location") or state.get("location"),
            "intent_harvested": data.get("intent_harvested", False),
            "clarification_message": data.get("question") if not data.get("intent_harvested") else None,
            "next_node": "finder" if data.get("intent_harvested") else "scribe"
        }
    except:
        return {"next_node": "scribe"}

async def finder_node(state: VedicEventState):
    """Finder Agent: PROFESSIONAL DISCOVERY (HARD GATED)."""
    # Only reachable if intent_harvested is True via router
    role_list = ["PANDIT", "VENUE", "CATERING"]
    all_results = []
    
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
    return {"supplies_suggested": suggested, "next_node": "scribe"}

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
        
    return {"event_id": event_id}

# --- Unified Graph Construction ---

workflow = StateGraph(VedicEventState)

workflow.add_node("concierge", concierge_node)
workflow.add_node("planner", planner_node)
workflow.add_node("finder", finder_node)
workflow.add_node("supplies", supplies_node)
workflow.add_node("scribe", scribe_node)

workflow.add_edge(START, "concierge")
workflow.add_edge("concierge", "planner")

def router(state: VedicEventState):
    return state.get("next_node", "scribe")

workflow.add_conditional_edges("planner", router)
workflow.add_edge("finder", "supplies")
workflow.add_edge("supplies", "scribe")
workflow.add_edge("scribe", END)

checkpointer = MemorySaver()
graph = workflow.compile(checkpointer=checkpointer)
