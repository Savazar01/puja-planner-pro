# Savaz Agent Infrastructure

## Auto-Discovering Privacy Gate (v2.6.0)
The Universal Privacy Gate sits between the user prompts and the Cloud LLM providers (e.g. Gemini).

**This gate is now self-healing. It automatically masks all 20+ PII types supported by Microsoft Presidio, including financial and location data.**

Features:
1. **Dynamic Entities:** Extracts all supported scrubbing entities via `analyzer.get_supported_entities()`.
2. **Universal Resolver:** Seamlessly parses `AGENT_{NAME}_LLM` from the environment to route between Local Server (Ollama) and Cloud Server (Gemini).
3. **Scrubbing Engine:** Employs an "Anonymize All" strategy. All PII payload detected going towards the `gemini` LLM will be hard-replaced with `<REDACTED>`. Bypasses local AI inference smoothly.
4. **Port Protocol:** The Privacy Gate operates strictly on Port 8740 as a secure intermediary outbox for all LLM calls.

## Agent Registry (v2.9.0)
The following 5 agents are registered within the Savaz ecosystem:
- **Planner Agent**: `AGENT_PLANNER_LLM` - Orchestrates the overarching event and acts as the project manager.
- **Finder Agent**: `AGENT_FINDER_LLM` - Handles Parallel Sourcing protocol (Internal Database search first, followed by external search via SerpAPI/Firecrawl).
- **Concierge Agent**: `AGENT_CONCIERGE_LLM` - Dedicated to human-in-the-loop support, answering questions.
- **Scribe Agent**: `AGENT_SCRIBE_LLM` - Manages text generation tasks like crafting personalized invites and bios.
- **Supplies Agent**: `AGENT_SUPPLIES_LLM` - Responsible for identifying necessary materials (pooja samagri) for a given event.

## Architecture Guidelines
- **Parallel Sourcing Protocol**: The Finder Agent MUST first prioritize existing internal Verified Members in our local Postgres/pgvector DB before triggering external deep web searches.
- **Zero-Variable Logic**: All data variables must be extracted via function calls. No variable mapping happens natively in un-typed Python dicts.
- **Audit Logging**: All Agentic action is actively monitored, stamped by timestamp, agent name, tool, and outcome summary without exposing PII.
