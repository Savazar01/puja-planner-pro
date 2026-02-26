# Savaz Agent Infrastructure

## Auto-Discovering Privacy Gate (v2.6.0)
The Universal Privacy Gate sits between the user prompts and the Cloud LLM providers (e.g. Gemini).

**This gate is now self-healing. It automatically masks all 20+ PII types supported by Microsoft Presidio, including financial and location data.**

Features:
1. **Dynamic Entities:** Extracts all supported scrubbing entities via `analyzer.get_supported_entities()`.
2. **Universal Resolver:** Seamlessly parses `AGENT_{NAME}_LLM` from the environment to route between Local Server (Ollama) and Cloud Server (Gemini).
3. **Scrubbing Engine:** Employs an "Anonymize All" strategy. All PII payload detected going towards the `gemini` LLM will be hard-replaced with `<REDACTED>`. Bypasses local AI inference smoothly.
