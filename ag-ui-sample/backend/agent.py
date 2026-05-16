from strands import Agent, tool
from strands.handlers import null_callback_handler
from strands.models.bedrock import BedrockModel
from ag_ui_strands import StrandsAgent
from ag_ui.core import RunAgentInput
from ag_ui.encoder import EventEncoder

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.middleware.cors import CORSMiddleware
import os


@tool
def get_time() -> str:
    """Get the current time."""
    from datetime import datetime
    return datetime.now().strftime("%H:%M:%S")


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = BedrockModel(
    model_id=os.environ.get("BEDROCK_MODEL", "us.anthropic.claude-sonnet-4-20250514-v1:0"),
    region_name=os.environ.get("AWS_REGION", "us-east-1"),
)

agent = Agent(
    model=model,
    system_prompt=(
        "You are a helpful assistant with access to UI tools. "
        "You can control the sidebar, theme, counter, notifications, and panels. "
        "You can also fetch weather, user profiles, and create charts. "
        "Be concise and helpful."
    ),
    tools=[get_time],
    callback_handler=null_callback_handler,
)

agui_agent = StrandsAgent(
    agent=agent,
    name="sample_agent",
    description="A helpful assistant that can control UI and fetch data",
)


@app.post("/invocations")
async def invocations(input_data: dict, request: Request):
    accept_header = request.headers.get("accept")
    encoder = EventEncoder(accept=accept_header)

    async def event_generator():
        run_input = RunAgentInput(**input_data)
        async for event in agui_agent.run(run_input):
            yield encoder.encode(event)

    return StreamingResponse(
        event_generator(),
        media_type=encoder.get_content_type(),
    )


@app.get("/ping")
async def ping():
    return JSONResponse({"status": "healthy"})


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
