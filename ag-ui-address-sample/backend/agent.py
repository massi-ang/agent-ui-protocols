from strands import Agent, tool
from strands.handlers import null_callback_handler
from strands.models.bedrock import BedrockModel
from ag_ui_strands import StrandsAgent
from ag_ui_strands.config import StrandsAgentConfig, ToolBehavior, ToolCallContext
from ag_ui.core import RunAgentInput
from ag_ui.encoder import EventEncoder
from sideseat import SideSeat, Frameworks

SideSeat(framework=Frameworks.Strands)

import uvicorn
import json
import logging
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.middleware.cors import CORSMiddleware
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mocked postcode → addresses API
MOCK_ADDRESSES = {
    "SW1A 1AA": [
        {"id": "1", "line1": "Buckingham Palace", "line2": "Westminster", "city": "London", "postcode": "SW1A 1AA"},
        {"id": "2", "line1": "1 Palace Gate", "line2": "Westminster", "city": "London", "postcode": "SW1A 1AA"},
        {"id": "3", "line1": "2 The Mall", "line2": "St James", "city": "London", "postcode": "SW1A 1AA"},
    ],
    "EC2R 8AH": [
        {"id": "4", "line1": "1 Bank Street", "line2": "City of London", "city": "London", "postcode": "EC2R 8AH"},
        {"id": "5", "line1": "20 Moorgate", "line2": "City of London", "city": "London", "postcode": "EC2R 8AH"},
    ],
    "M1 1AA": [
        {"id": "6", "line1": "1 Piccadilly", "line2": "City Centre", "city": "Manchester", "postcode": "M1 1AA"},
        {"id": "7", "line1": "15 Portland Street", "line2": "City Centre", "city": "Manchester", "postcode": "M1 1AA"},
        {"id": "8", "line1": "42 Deansgate", "line2": "City Centre", "city": "Manchester", "postcode": "M1 1AA"},
        {"id": "9", "line1": "8 Albert Square", "line2": "City Centre", "city": "Manchester", "postcode": "M1 1AA"},
    ],
}


def get_addresses_for_postcode(postcode: str) -> list[dict]:
    """Simulate an API call to retrieve addresses for a postcode."""
    normalized = postcode.strip().upper()
    return MOCK_ADDRESSES.get(normalized, [
        {"id": "99", "line1": "10 High Street", "line2": "", "city": "Anytown", "postcode": normalized},
    ])


import re


@tool
def validate_postcode(postcode: str) -> dict:
    """Validate a UK postcode format. Returns whether it's valid and the normalized form."""
    normalized = postcode.strip().upper()
    # UK postcode regex pattern
    pattern = r'^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$'
    is_valid = bool(re.match(pattern, normalized))
    return {"valid": is_valid, "postcode": normalized}


async def address_args_streamer(ctx: ToolCallContext):
    """Enrich the select_address_for_postcode args with looked-up addresses before sending to client."""
    logger.info(ctx)
    args = json.loads(ctx.args_str) if isinstance(ctx.args_str, str) else ctx.tool_input
    postcode = args.get("postcode", "")
    addresses = get_addresses_for_postcode(postcode)
    args["addresses"] = addresses

    yield json.dumps({"postcode": postcode, "addresses": addresses})


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
        "You are an address collection assistant. Your job is to collect the user's address. "
        "First, ask the user for their postcode. Once they provide it, call validate_postcode to check "
        "it's a valid UK postcode. If invalid, ask them to try again. If valid, call the "
        "select_address_for_postcode tool with the postcode. This tool will show the user a list of "
        "matching addresses to choose from. Once the user selects an address, confirm it back to them. "
        "Be concise and friendly."
    ),
    tools=[validate_postcode],
    callback_handler=null_callback_handler,
)


agui_agent = StrandsAgent(
    agent=agent,
    name="address_agent",
    description="An assistant that collects user addresses via postcode lookup",
    config=StrandsAgentConfig(
        tool_behaviors={
            "select_address_for_postcode": ToolBehavior(
                args_streamer=address_args_streamer,
            ),
        },
    ),
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
    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="debug")
