from strands import Agent, tool
from strands.handlers import null_callback_handler
from strands.models.bedrock import BedrockModel
from ag_ui_strands import StrandsAgent
from ag_ui.core import RunAgentInput
from sideseat import SideSeat, Frameworks

SideSeat(framework=Frameworks.Strands)
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


@tool
def get_weather(city: str) -> str:
    """Get current weather for a city including temperature, conditions, humidity, wind, and 3-day forecast."""
    import json
    data = {
        "london": {"temp": 14, "conditions": "Partly Cloudy", "humidity": 72, "wind": "12 km/h SW", "forecast": [{"day": "Tue", "high": 16, "low": 11}, {"day": "Wed", "high": 18, "low": 12}, {"day": "Thu", "high": 15, "low": 10}]},
        "tokyo": {"temp": 26, "conditions": "Sunny", "humidity": 55, "wind": "8 km/h E", "forecast": [{"day": "Tue", "high": 28, "low": 22}, {"day": "Wed", "high": 27, "low": 21}, {"day": "Thu", "high": 29, "low": 23}]},
        "new york": {"temp": 22, "conditions": "Clear", "humidity": 45, "wind": "15 km/h NW", "forecast": [{"day": "Tue", "high": 24, "low": 18}, {"day": "Wed", "high": 21, "low": 16}, {"day": "Thu", "high": 23, "low": 17}]},
    }
    weather = data.get(city.lower(), {"temp": 20, "conditions": "Fair", "humidity": 60, "wind": "10 km/h", "forecast": [{"day": "Tue", "high": 22, "low": 15}, {"day": "Wed", "high": 21, "low": 14}, {"day": "Thu", "high": 23, "low": 16}]})
    return json.dumps({"city": city, **weather})


@tool
def get_bank_account() -> str:
    """Get bank account summary including balances, recent transactions, and spending breakdown."""
    import json
    return json.dumps({
        "accounts": [
            {"name": "Checking", "balance": 4285.50, "number": "****4821"},
            {"name": "Savings", "balance": 12740.00, "number": "****3390", "apy": "4.25%"},
            {"name": "Investment", "balance": 38920.75, "number": "****7714"},
        ],
        "recent_transactions": [
            {"date": "2024-06-05", "description": "Grocery Store", "amount": -82.40, "category": "Food"},
            {"date": "2024-06-04", "description": "Salary Deposit", "amount": 3500.00, "category": "Income"},
            {"date": "2024-06-03", "description": "Electric Bill", "amount": -145.00, "category": "Utilities"},
            {"date": "2024-06-02", "description": "Restaurant", "amount": -56.80, "category": "Dining"},
            {"date": "2024-06-01", "description": "Subscription", "amount": -14.99, "category": "Entertainment"},
        ],
        "monthly_spending": {"Housing": 1200, "Food": 380, "Transport": 145, "Entertainment": 210, "Health": 90},
    })


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
        "You are a helpful assistant with access to backend data tools and frontend display tools. "
        "When the user asks for weather or bank info: 1) call the backend tool (get_weather, get_bank_account) to fetch data, "
        "2) then call the frontend display tool (show_weather_card, show_bank_account_card) with the fetched data to render a widget. "
        "You can also control the sidebar, theme, counter, notifications, and panels. "
        "Be concise and helpful."
    ),
    tools=[get_time, get_weather, get_bank_account],
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
