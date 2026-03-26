# Technical Legacy — Archived Instructions (from AI_Instructions.md)

## LangGraph Orchestration (Legacy v1.0)
The application originally mandated **LangGraph** as the sole orchestration engine. 
WORKFORCE:
1. Concierge (Triage)
2. Planner (Intent Harvesting Hard Gate)
3. Finder (Discovery)
4. Supplies (Sourcing)
5. Scribe (Persistence)

## Infrastructure Governance
- Port Governance: 8734 (FE), 8735 (BE), 8740 (Privacy Gate).
- Cloudflare Proxy: Mandatory for public masking.

## Backend & API Architecture
- Specialist Role Registry: 11 Human Specialist Roles (PANDIT, TEMPLE_ADMIN, SUPPLIER, CATERER, DECORATOR, DJ_COMPERE, LOCATION_MANAGER, MEDIA, MEHENDI_ARTIST, etc.).
- Model Selection: `gemini-3.1-flash-lite-preview` with `v1beta` explicitly set.

## Stability Standards
- 25-Second Ceiling for all requests.
- Async-Only I/O for heavy processing.
- Multi-composite Location Governance.
