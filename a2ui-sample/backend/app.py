import os
import json
import asyncio
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
import uvicorn

from agent import BedrockAgent
from a2ui_generator import A2UIGenerator

app = FastAPI(title="A2UI Sample")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agent and A2UI generator
bedrock_agent = BedrockAgent()
a2ui_gen = A2UIGenerator()

@app.post("/api/chat")
async def chat(request: Request):
    """Handle chat messages and stream A2UI responses"""
    body = await request.json()
    message = body.get("message", "")
    
    async def generate():
        # Get agent response
        agent_response = await bedrock_agent.process(message)
        
        # Determine UI type based on response
        if "form" in message.lower() or "input" in message.lower():
            ui_type = "form"
        elif "card" in message.lower() or "profile" in message.lower():
            ui_type = "card"
        elif "survey" in message.lower() or "question" in message.lower():
            ui_type = "survey"
        else:
            ui_type = "card"
        
        # Generate A2UI JSONL messages
        a2ui_messages = a2ui_gen.generate(ui_type, {
            "title": agent_response.get("title", "Generated UI"),
            "fields": agent_response.get("fields", []),
            "data": agent_response.get("data", {}),
        })
        
        # Stream each JSONL message
        for msg in a2ui_messages:
            yield {
                "event": "message",
                "data": json.dumps(msg)
            }
            await asyncio.sleep(0.1)  # Simulate streaming
    
    return EventSourceResponse(generate())

@app.get("/health")
async def health():
    return {"status": "ok", "service": "a2ui-sample"}

# Serve static frontend files
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")

if __name__ == "__main__":
    port = int(os.getenv("PORT", "3002"))
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
