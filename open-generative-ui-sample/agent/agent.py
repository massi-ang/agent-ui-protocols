from pathlib import Path

from strands import Agent, AgentSkills, tool
from strands.handlers import null_callback_handler
from strands.models.bedrock import BedrockModel
from ag_ui_strands import StrandsAgent
from ag_ui.core import RunAgentInput
from ag_ui.encoder import EventEncoder
from sideseat import SideSeat, Frameworks

SideSeat(framework=Frameworks.Strands)

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.middleware.cors import CORSMiddleware
import os


@tool
def get_weather(city: str) -> str:
    """Get current weather for a city. Returns JSON with temperature, conditions, humidity, wind, and 3-day forecast."""
    import json
    data = {
        "london": {"temp": 14, "conditions": "Partly Cloudy", "humidity": 72, "wind": "12 km/h SW", "forecast": [{"day": "Tue", "high": 16, "low": 11, "conditions": "Cloudy"}, {"day": "Wed", "high": 18, "low": 12, "conditions": "Sunny"}, {"day": "Thu", "high": 15, "low": 10, "conditions": "Rain"}]},
        "tokyo": {"temp": 26, "conditions": "Sunny", "humidity": 55, "wind": "8 km/h E", "forecast": [{"day": "Tue", "high": 28, "low": 22, "conditions": "Sunny"}, {"day": "Wed", "high": 27, "low": 21, "conditions": "Cloudy"}, {"day": "Thu", "high": 29, "low": 23, "conditions": "Sunny"}]},
        "new york": {"temp": 22, "conditions": "Clear", "humidity": 45, "wind": "15 km/h NW", "forecast": [{"day": "Tue", "high": 24, "low": 18, "conditions": "Clear"}, {"day": "Wed", "high": 21, "low": 16, "conditions": "Rain"}, {"day": "Thu", "high": 23, "low": 17, "conditions": "Sunny"}]},
    }
    weather = data.get(city.lower(), {"temp": 20, "conditions": "Fair", "humidity": 60, "wind": "10 km/h", "forecast": [{"day": "Tue", "high": 22, "low": 15, "conditions": "Fair"}, {"day": "Wed", "high": 21, "low": 14, "conditions": "Cloudy"}, {"day": "Thu", "high": 23, "low": 16, "conditions": "Sunny"}]})
    return json.dumps({"city": city, **weather})


@tool
def get_bank_account() -> str:
    """Get bank account summary. Returns JSON with account balances, recent transactions, and monthly spending breakdown."""
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

SYSTEM_PROMPT = """\
You are a helpful assistant that creates rich interactive visualizations.

You have access to data tools (get_weather, get_bank_account) and a frontend rendering tool called `widgetRenderer`.

## How to create visualizations:

1. When the user asks for data (weather, bank account, etc.), first call the appropriate data tool.
2. Then call the `widgetRenderer` tool with:
   - title: A short title for the visualization
   - description: Brief description of what's shown
   - html: A complete, self-contained HTML document that visualizes the data

## HTML Guidelines:

- Write a complete HTML document with inline CSS and JavaScript
- Use modern CSS (flexbox, grid, gradients, shadows, border-radius)
- Make it visually appealing with colors, icons (use emoji), and good typography
- Use the CSS variable `var(--text)` for text color and `var(--bg)` for background (supports dark mode)
- For charts, use inline SVG or Canvas — do NOT use external libraries
- Make the design responsive
- Keep it self-contained — no external resources

## When NOT to use widgetRenderer:

- Simple factual answers → just respond with text
- Code questions → use code blocks
- Conversational responses → plain text

## Examples of good visualizations:

- Weather: gradient card with temperature, conditions icon, forecast bars
- Bank account: dashboard with balance cards, transaction list, spending pie chart
- Algorithm: step-by-step animated visualization
- Data: charts, tables, diagrams
"""

SKILLS_DIR = str(Path(__file__).parent / "skills")

skills_plugin = AgentSkills(skills=SKILLS_DIR)

agent = Agent(
    model=model,
    system_prompt=SYSTEM_PROMPT,
    tools=[get_weather, get_bank_account],
    plugins=[skills_plugin],
    callback_handler=null_callback_handler,
)

agui_agent = StrandsAgent(
    agent=agent,
    name="open_generative_ui_agent",
    description="An assistant that creates rich interactive HTML visualizations",
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
    uvicorn.run(app, host="0.0.0.0", port=8082)
