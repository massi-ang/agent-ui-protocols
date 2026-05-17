import os
import json
import asyncio
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
import uvicorn

from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from a2ui.schema.manager import A2uiSchemaManager
from a2ui.basic_catalog.provider import BasicCatalog
from a2ui.parser.parser import parse_response

# --- A2UI Schema Setup ---
schema_manager = A2uiSchemaManager(
    version="0.9",
    catalogs=[BasicCatalog.get_config(version="0.9")],
)

_a2ui_instruction = schema_manager.generate_system_prompt(
    role_description="You are a UI generation assistant. Generate rich interactive UIs based on user requests.",
    workflow_description="Analyze the user's request and return A2UI JSON for forms, cards, or surveys.",
    ui_description="Use TextField for inputs, Card for profiles, Column/Row for layout, Button for actions, Text for labels.",
    include_schema=True,
    include_examples=True,
)

# Use a simple instruction for ADK (no curly braces) and prepend the A2UI schema as a user context
instruction = "You are a UI generation assistant. Follow the A2UI schema provided in the conversation to generate valid A2UI JSON."

# --- ADK Agent with Bedrock (Claude) ---
model_id = os.getenv("BEDROCK_MODEL", "global.anthropic.claude-sonnet-4-6")
region = os.getenv("AWS_REGION", "us-east-1")
os.environ.setdefault("AWS_REGION_NAME", region)

agent = LlmAgent(
    model=f"bedrock/{model_id}",
    name="a2ui_agent",
    description="An agent that generates A2UI interfaces",
    instruction=instruction,
)

# --- Runner ---
session_service = InMemorySessionService()
runner = Runner(agent=agent, app_name="a2ui_sample", session_service=session_service)

# --- FastAPI App ---
app = FastAPI(title="A2UI Sample")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/chat")
async def chat(request: Request):
    """Handle chat messages and stream A2UI responses"""
    body = await request.json()
    message = body.get("message", "")

    async def generate():
        try:
            session = await session_service.create_session(
                app_name="a2ui_sample", user_id="user"
            )

            content = types.Content(
                role="user", parts=[
                    types.Part(text=_a2ui_instruction + "\n\nUser request: " + message)
                ]
            )

            final_text = ""
            async for event in runner.run_async(
                user_id="user", session_id=session.id, new_message=content
            ):
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if part.text:
                            final_text += part.text

            # Parse A2UI from the response
            response_parts = parse_response(final_text)

            for part in response_parts:
                if part.a2ui_json:
                    yield {
                        "event": "message",
                        "data": json.dumps({"a2ui": part.a2ui_json}),
                    }
                elif part.text:
                    yield {
                        "event": "message",
                        "data": json.dumps({"text": part.text}),
                    }
                await asyncio.sleep(0.05)

        except Exception as e:
            import traceback
            traceback.print_exc()
            yield {
                "event": "message",
                "data": json.dumps({"error": str(e)}),
            }

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
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False, log_level="info")
