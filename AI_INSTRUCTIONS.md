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
- **Architecture Registry**: Explicitly forbidding the creation or hallucination of any new user types. All future logic, roles, and UI flows MUST strictly map to the exact 11 specialist roles defined here and in the `/humans` directory: `customer`, `PANDIT`, `TEMPLE_ADMIN`, `SUPPLIER`, `EVENT_MANAGER`, `CATERER`, `DECORATOR`, `DJ_COMPERE`, `LOCATION_MANAGER`, `MEDIA`, `MEHENDI_ARTIST`, and `OTHER`. No ad-hoc roles are permitted.
- **Pristine State Rule**: New events MUST initialize with empty `guests` and `supplies` arrays. Seed/Mock data is prohibited in production flows.
- **Model Selection (The "500 RPD" Lock)**: 
  - Primary Model: `gemini-3.1-flash-lite-preview` (Mandatory for all 5 agents).
  - API Version: `v1beta` (Must be explicitly set in `http_options` during SDK initialization).
- **Automation**: Model fallback logic is deprecated; the system must optimize for the Flash-Lite 3.1 context at all times.

## III. AI Agent & Search Logic
- **Privacy Gate Routing**: Outbound LLM traffic must pass through `:8740` for PII redaction.
- **Parallel Sourcing**: Finder must check internal DB first, then trigger external web search.
- **Location Governance**: "Location" parameters for external search (e.g., Google Serper `gl` parameter) MUST be derived from the user's structured `address_country` field. 
- **Structured Address**: The location string for agents is now a composite object: `[Locality], [City], [State], [Country], [Zip/Pincode]`, ensuring precise geographical indexing.

## V. Performance & Stability (25-Second Ceiling)
- **The 25-Second Ceiling**: No single request (Login, Save, Search) can exceed 25 seconds of processing time to stay under the 30s Cloudflare threshold.
- **Async-Only I/O**: Forbid synchronous I/O or heavy data processing (e.g., Base64 image manipulation) on the main thread. All such operations MUST be handled asynchronously.
- **Fail-Safe Login**: The login flow must prioritize the JWT/Session handshake. Trigger background telemetry or agent syncing ONLY after the user session is established.
- **Specialist Registry Consistency**: Maintain the 11-role Specialist Registry in all future UI/Backend updates (Caterer, Media, Mehendi Artist, etc.).
- **Client-Side Heavy Lifting**: Move all possible logic (string formatting, image resizing, data validation) to the React frontend to minimize backend CPU cycles.

## IV. UI/UX & Frontend Philosophy
- **Scribe Persistence**: Intent harvesting must be persisted to the DB as it happens. Do not wait for a final "Submit".
- **Visual Excellence**: Dark modes, glassmorphism, and modern typography (Outfit/Inter).

## V. MCP & Agentic AI Protocols (v3.0.0)
- **Sequential Thinking**: Mandatory for architectural pivots.
- **Zero-Variable Logic**: Derive parameters (search radius, tiers) from User Intent via LLM, not hardcoded dicts.

