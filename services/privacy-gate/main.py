import os
import httpx
import logging
from fastapi import FastAPI, Header, Request, HTTPException
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("privacy-gate")

app = FastAPI(title="Savaz Universal Privacy Gate")

# Initialize Presidio Engines
analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

# AUTO-DISCOVERY: Get every entity Presidio supports (Credit Cards, Phone, etc.)
ALL_SUPPORTED_ENTITIES = analyzer.get_supported_entities()

@app.post("/process")
async def process_request(request: Request, x_agent_name: str = Header(None)):
    """
    Resolves agent config from Coolify Env and applies Auto-PII scrubbing.
    """
    if not x_agent_name:
        raise HTTPException(status_code=400, detail="X-Agent-Name header is missing")

    # 1. Resolver: Check Coolify Env (Format: AGENT_PLANNER_LLM)
    env_key = f"AGENT_{x_agent_name.upper()}_LLM"
    target_llm = os.getenv(env_key, "local").lower()
    
    body = await request.json()
    user_prompt = body.get("prompt", "")

    # 2. Routing Logic
    if "gemini" in target_llm:
        logger.info(f"Routing {x_agent_name} to Gemini. Applying Auto-PII Scrubbing...")
        
        # Privacy Engine: Analyze all known PII entities
        analysis_results = analyzer.analyze(
            text=user_prompt, 
            entities=ALL_SUPPORTED_ENTITIES, 
            language='en'
        )
        
        anonymized_result = anonymizer.anonymize(
            text=user_prompt,
            analyzer_results=analysis_results,
            operators={"DEFAULT": OperatorConfig("replace", {"new_value": "<REDACTED>"})}
        )
        
        # Return scrubbed prompt for Cloud transmission
        return {
            "status": "scrubbed",
            "target": "gemini",
            "text": anonymized_result.text,
            "agent": x_agent_name
        }

    # 3. Fallback (Local Ollama)
    logger.info(f"Routing {x_agent_name} to Local. Bypassing Scrubbing.")
    return {
        "status": "raw",
        "target": "ollama",
        "text": user_prompt,
        "agent": x_agent_name
    }

import json

@app.post("/outbound")
async def outbound_proxy(request: Request):
    """
    Forwarding proxy for external APIs (Serper, Firecrawl) that redacts PII in responses.
    """
    try:
        body = await request.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
        
    url = body.get("url")
    method = body.get("method", "POST")
    headers = body.get("headers", {})
    payload = body.get("payload")

    if not url:
        raise HTTPException(status_code=400, detail="Missing target URL")

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            if method.upper() == "POST":
                response = await client.post(url, json=payload, headers=headers)
            else:
                response = await client.get(url, params=payload, headers=headers)
            
            # Simple Scrubbing on response content if it's JSON
            try:
                data = response.json()
                data_str = json.dumps(data)
            except:
                data_str = response.text
            
            analysis_results = analyzer.analyze(text=data_str, entities=ALL_SUPPORTED_ENTITIES, language='en')
            anonymized_result = anonymizer.anonymize(
                text=data_str,
                analyzer_results=analysis_results,
                operators={"DEFAULT": OperatorConfig("replace", {"new_value": "<REDACTED>"})}
            )
            
            try:
                return json.loads(anonymized_result.text)
            except:
                return {"text": anonymized_result.text}
                
        except Exception as e:
            logger.error(f"Outbound Proxy Error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8740)
