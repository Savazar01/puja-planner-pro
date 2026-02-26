# AI_INSTRUCTIONS.md (The Global Standard)

## 0. Planner Agent Role
The Planner Agent serves as the core orchestrator of the Savaz ecosystem. Its primary responsibilities include:
- Designing and enforcing the overall system architecture, network topology, and module structures.
- Orchestrating complex AI interactions and service integrations (e.g., Savaz Intelligence Stack).
- Authorizing architectural pivots and ensuring infrastructure conventions are universally followed.
- Note: With the v1.3.0 stack finalized, the infrastructure is now "Stable & Verified", strictly local-first, and fully primed for agentic logic implementation.

## I. Infrastructure & Orchestration (The "Coolify" Laws)
- **Pure Compose Policy**: `docker-compose.yml` must contain zero proxy labels (Traefik/Caddy). All routing is handled via the Orchestrator UI using the `https://{DOMAIN}:{PORT}` handshake.
- **Port Governance**: Use `${VARIABLE:-default}` for all port mappings.
- **Network Topology**:
  - **External**: `savaz-prod-net` for database isolation.
  - **Internal**: `default` bridge for service discovery and proxy attachment.
- **Environment Parity & Hygiene**: Any time an environment variable is created, updated, or removed, the change MUST be instantly mirrored across `.env.example` and `.env.production.example`. Furthermore, `README.md` and `DEPLOYMENT.md` must be updated to reflect the new requirements. All template files and documentation MUST be sanitized—never commit real secrets, API keys, or administrative credentials to version control. Use placeholders (e.g., `your_api_key_here`).

## II. Backend & API Architecture (FastAPI)
- **Statelessness**: The API must remain stateless. All persistent data must reside in PostgreSQL.
- **Strict Typing**: Use Pydantic models for all Request/Response schemas. No "raw JSON" returns.
- **Error Handling**: Implement global exception handlers. Every API error must return a consistent JSON structure: `{ "error": "Type", "message": "Detailed info", "code": 400 }`.
- **CORS**: Origins must be pulled from the `CORS_ORIGINS` environment variable. Never hardcode allowed domains.
- **Service Discovery**: Internal connections to the Database must always use the service name `savaz_db` as defined in the infrastructure layer.

## III. AI Agent & Search Logic
- **Provider Agnostic**: AI logic must use environment variables for model selection (e.g., `GEMINI_API_KEY`).
- **Tool-Use Integrity**: Agents must follow a "Plan-Act-Observe" loop.
- **Rate Limiting & Cost Safety**: Always implement timeouts and maximum token limits for agentic loops to prevent runaway API costs.
- **Search Decoupling**: Use variables for search providers (e.g., `SERPER_API_KEY`). Ensure search results are cleaned/sanitized before being fed to the LLM context.

## IV. UI/UX & Frontend Philosophy (React/Vite/Tailwind)
- **Atomic Design**: Keep components small and reusable. Logic should be extracted into custom hooks (e.g., `useApi`).
- **Responsive-First**: Use Tailwind CSS utility classes. Every feature must be tested for mobile-friendliness.
- **State Management**: Use lightweight state (Zustand or React Context) over prop-drilling.
- **UX Consistency**:
  - **Loading States**: Every async action must have a visual loader/skeleton.
  - **Feedback**: Use "Toast" notifications for success/error feedback on form submissions.
- **Environment Sync**: Frontend must only talk to the Backend via `VITE_API_URL`.
