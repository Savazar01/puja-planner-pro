## 0. LangGraph Orchestration (Unified 5-Agent Workforce)
The application MUST use **LangGraph** as the sole orchestration engine. The workforce consists of 5 specialized agents:
1. **Concierge**: Entry point / Triage.
2. **Planner**: Root Orchestrator / Intent Harvesting (Hard Gate).
3. **Finder**: Professional Discovery (Port 8740).
4. **Supplies**: Ritual Samagri Sourcing.
5. **Scribe**: Silent Persistence (Postgres).
- **Hard Gate**: Discovery tools MUST be unreachable until the Planner sets `intent_harvested=True`.
- **Parallel Execution**: Mandated for multi-role intents via the Graph topology.

## I. Infrastructure & Orchestration (The "Coolify" Laws)
- **Port Governance**: Public access via **443 (HTTPS)**. Internal mappings: **8734 (Frontend)**, **8735 (Backend)**, **8740 (Privacy Gate)**.
- **Environment Lockdown**: Enforce `VITE_API_URL` and `CORS_ORIGINS`. Hardcoded 'localhost' or '0.0.0.0' in production paths is strictly forbidden.
- **Cloudflare Proxy**: Mandatory for production API endpoints to mask origin and enforce HTTPS.

## II. Backend & API Architecture
- **Pristine State Rule**: New events MUST initialize with empty `guests` and `supplies` arrays. Seed/Mock data is prohibited in production flows.
- **Model Fallback Logic**: 
  - Primary: `gemini-1.5-pro` (Detailed parsing/complex logic).
  - Fallback: `gemini-1.5-flash` (High speed/quota resilient).
  - Automation: Fallback must be handle gracefully within the implementation to ensure service continuity.

## III. AI Agent & Search Logic
- **Privacy Gate Routing**: Outbound LLM traffic must pass through `:8740` for PII redaction.
- **Parallel Sourcing**: Finder must check internal DB first, then trigger external web search.

## IV. UI/UX & Frontend Philosophy
- **Scribe Persistence**: Intent harvesting must be persisted to the DB as it happens. Do not wait for a final "Submit".
- **Visual Excellence**: Dark modes, glassmorphism, and modern typography (Outfit/Inter).

## V. MCP & Agentic AI Protocols (v3.0.0)
- **Sequential Thinking**: Mandatory for architectural pivots.
- **Zero-Variable Logic**: Derive parameters (search radius, tiers) from User Intent via LLM, not hardcoded dicts.

