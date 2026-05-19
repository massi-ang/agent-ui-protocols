import os
import json
import asyncio
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
import uvicorn

from strands import Agent, tool
from strands.models import BedrockModel
from a2ui.schema.manager import A2uiSchemaManager, CatalogConfig
from a2ui.basic_catalog.provider import BasicCatalog
from a2ui.parser.parser import parse_response
from a2ui.schema.constants import VERSION_0_9


# --- A2UI Schema Setup ---
schema_manager = A2uiSchemaManager(
    version=VERSION_0_9,
    catalogs=[
        CatalogConfig.from_path(
            name="custom",
            catalog_path=os.path.join(os.path.dirname(__file__), "assembled.json"),
            examples_path=os.path.join(os.path.dirname(__file__), "examples/custom"),
        )
    ],
)

_a2ui_instruction = schema_manager.generate_system_prompt(
    role_description=(
        "You are a helpful assistant with access to tools. Use get_weather and "
        "get_bank_account to fetch real data, then generate A2UI JSON to display "
        "it visually. Follow the A2UI schema provided in the conversation."
    ),
    workflow_description=(
        "Analyze the user's request. Use get_weather and get_bank_account tools "
        "to fetch data, then return A2UI JSON. Use WeatherCard for weather and "
        "BankAccountCard for bank data."
    ),
    ui_description=(
        "Use WeatherCard for weather displays, BankAccountCard for bank/finance "
        "displays. For other UIs use TextField for inputs, Card for profiles, "
        "Column/Row for layout, Button for actions, Text for labels."
    ),
    include_schema=True,
    include_examples=True,
)
print(_a2ui_instruction)


@tool
def get_weather(city: str) -> str:
    """Get current weather for a city including temperature, conditions, humidity, wind, and 3-day forecast."""
    data = {
        "london": {
            "temp": 14,
            "conditions": "Partly Cloudy",
            "humidity": 72,
            "wind": "12 km/h SW",
            "forecast": [
                {"day": "Tue", "high": 16, "low": 11},
                {"day": "Wed", "high": 18, "low": 12},
                {"day": "Thu", "high": 15, "low": 10},
            ],
        },
        "tokyo": {
            "temp": 26,
            "conditions": "Sunny",
            "humidity": 55,
            "wind": "8 km/h E",
            "forecast": [
                {"day": "Tue", "high": 28, "low": 22},
                {"day": "Wed", "high": 27, "low": 21},
                {"day": "Thu", "high": 29, "low": 23},
            ],
        },
        "new york": {
            "temp": 22,
            "conditions": "Clear",
            "humidity": 45,
            "wind": "15 km/h NW",
            "forecast": [
                {"day": "Tue", "high": 24, "low": 18},
                {"day": "Wed", "high": 21, "low": 16},
                {"day": "Thu", "high": 23, "low": 17},
            ],
        },
    }
    weather = data.get(
        city.lower(),
        {
            "temp": 20,
            "conditions": "Fair",
            "humidity": 60,
            "wind": "10 km/h",
            "forecast": [
                {"day": "Tue", "high": 22, "low": 15},
                {"day": "Wed", "high": 21, "low": 14},
                {"day": "Thu", "high": 23, "low": 16},
            ],
        },
    )
    return json.dumps({"city": city, **weather})


@tool
def get_bank_account() -> str:
    """Get bank account summary including balances, recent transactions, and spending breakdown."""
    return json.dumps(
        {
            "accounts": [
                {"name": "Checking", "balance": 4285.50, "number": "****4821"},
                {
                    "name": "Savings",
                    "balance": 12740.00,
                    "number": "****3390",
                    "apy": "4.25%",
                },
            ],
            "recent_transactions": [
                {
                    "date": "2024-06-05",
                    "description": "Grocery Store",
                    "amount": -82.40,
                },
                {
                    "date": "2024-06-04",
                    "description": "Salary Deposit",
                    "amount": 3500.00,
                },
                {
                    "date": "2024-06-03",
                    "description": "Electric Bill",
                    "amount": -145.00,
                },
            ],
            "monthly_spending": {
                "Housing": 1200,
                "Food": 380,
                "Transport": 145,
                "Entertainment": 210,
            },
        }
    )


# --- Strands Agent with Bedrock (Claude) ---
model_id = os.getenv("BEDROCK_MODEL", "global.anthropic.claude-sonnet-4-6")
region = os.getenv("AWS_REGION", "us-east-1")

bedrock_model = BedrockModel(
    model_id=model_id,
    region_name=region,
)

agent = Agent(
    model=bedrock_model,
    system_prompt=_a2ui_instruction,
    tools=[get_weather, get_bank_account],
    callback_handler=None,  # we handle streaming below via stream_async
)

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
            # Accumulate streamed text from the Strands agent
            final_text = ""
            async for event in agent.stream_async(message):
                if "data" in event:
                    final_text += event["data"]

            # Parse A2UI from the response
            try:
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
            except:
                yield {
                    "event": "message",
                    "data": json.dumps({"text": final_text}),
                }

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
    return {"status": "healthy"}


# Serve static frontend files
frontend_path = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(frontend_path):
    frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/out")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")

if __name__ == "__main__":
    port = int(os.getenv("PORT", "3002"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False, log_level="info")
