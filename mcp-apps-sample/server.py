import os
import json
import uuid
import logging
from typing import Dict, Any
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sse_starlette.sse import EventSourceResponse
import uvicorn
import boto3

# Filter out GET /mcp noise
class MCPLogFilter(logging.Filter):
    def filter(self, record):
        return "GET /mcp" not in record.getMessage()

logging.getLogger("uvicorn.access").addFilter(MCPLogFilter())

app = FastAPI(title="MCP Apps Sample")

# In-memory storage for UI resources
ui_resources: Dict[str, str] = {}
# Track latest resource per type
ui_latest: Dict[str, str] = {}

# Bedrock client
bedrock_client = boto3.client(
    'bedrock-runtime',
    region_name=os.getenv('AWS_REGION', 'us-east-1'),
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
)

MODEL_ID = os.getenv('BEDROCK_MODEL', 'global.anthropic.claude-sonnet-4-6')

# MCP Tools
TOOLS = [
    {
        "name": "create_chart",
        "description": "Create an interactive D3.js chart visualization",
        "inputSchema": {
            "type": "object",
            "properties": {
                "data": {
                    "type": "array",
                    "items": {"type": "number"},
                    "description": "Array of numeric values to chart"
                },
                "labels": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Labels for each data point"
                },
                "chart_type": {
                    "type": "string",
                    "enum": ["bar", "line", "pie"],
                    "description": "Type of chart to create"
                }
            },
            "required": ["data"]
        },
        "_meta": {
            "ui": {
                "resourceUri": "ui://chart"
            }
        }
    },
    {
        "name": "create_table",
        "description": "Create an interactive data table",
        "inputSchema": {
            "type": "object",
            "properties": {
                "data": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Array of row objects"
                },
                "columns": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Column names"
                }
            },
            "required": ["data"]
        },
        "_meta": {
            "ui": {
                "resourceUri": "ui://table"
            }
        }
    },
    {
        "name": "collect_recipe_preferences",
        "description": "Show an interactive form where the user selects cuisine, dietary restrictions, ingredients, and serving size. Returns their choices for recipe generation.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Optional message to display to the user"
                }
            }
        },
        "_meta": {
            "ui": {
                "resourceUri": "ui://recipe-form"
            }
        }
    }
]
async def mcp_sse_endpoint(request: Request):
    """MCP Server-Sent Events endpoint (legacy SSE transport)"""
    
    async def generate():
        # Send the POST endpoint location
        yield {
            "event": "endpoint",
            "data": "/mcp"
        }
    
    return EventSourceResponse(generate())


@app.post("/mcp")
async def mcp_post_endpoint(request: Request):
    """MCP Streamable HTTP transport - handles JSON-RPC requests"""
    body = await request.json()
    method = body.get("method")
    req_id = body.get("id")

    if method == "initialize":
        return JSONResponse({
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "serverInfo": {
                    "name": "agent-ui-mcp-sample",
                    "version": "1.0.0"
                },
                "capabilities": {
                    "tools": {"listChanged": False},
                    "resources": {"subscribe": False, "listChanged": False}
                }
            }
        })

    elif method == "notifications/initialized":
        return JSONResponse({"jsonrpc": "2.0", "id": req_id, "result": {}})

    elif method == "tools/list":
        return JSONResponse({
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"tools": TOOLS}
        })

    elif method == "tools/call":
        params = body.get("params", {})
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        print(f"\n🔧 Tool call: {tool_name}")
        print(f"   Arguments: {json.dumps(arguments, indent=2)}")

        if tool_name == "create_chart":
            ui_html = generate_chart_ui(
                arguments.get("data", []),
                arguments.get("labels", []),
                arguments.get("chart_type", "bar")
            )
            ui_id = str(uuid.uuid4())
            ui_resources[ui_id] = ui_html
            ui_latest["chart"] = ui_html
            resp = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Created {arguments.get('chart_type', 'bar')} chart with {len(arguments.get('data', []))} data points."
                        },
                        {
                            "type": "resource",
                            "resource": {
                                "uri": f"ui://{ui_id}",
                                "mimeType": "text/html",
                                "text": "done"
                            }
                        }
                    ]
                }
            }
            print(f"   📤 JSON-RPC:\n{json.dumps(resp, indent=2)}")
            return JSONResponse(resp)

        elif tool_name == "create_table":
            ui_html = generate_table_ui(
                arguments.get("data", []),
                arguments.get("columns", [])
            )
            ui_id = str(uuid.uuid4())
            ui_resources[ui_id] = ui_html
            ui_latest["table"] = ui_html
            resp = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Created table with {len(arguments.get('data', []))} rows and {len(arguments.get('columns', []))} columns."
                        },
                        {
                            "type": "resource",
                            "resource": {
                                "uri": f"ui://{ui_id}",
                                "mimeType": "text/html",
                                "text": "done"
                            }
                        }
                    ]
                }
            }
            print(f"   📤 JSON-RPC:\n{json.dumps(resp, indent=2)}")
            return JSONResponse(resp)

        elif tool_name == "collect_recipe_preferences":
            ui_html = generate_recipe_form(arguments.get("prompt", ""))
            ui_id = str(uuid.uuid4())
            ui_resources[ui_id] = ui_html
            ui_latest["recipe-form"] = ui_html
            resp = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {"type": "text", "text": "Showing recipe preferences form to user."},
                        {"type": "resource", "resource": {"uri": f"ui://{ui_id}", "mimeType": "text/html", "text": "done"}}
                    ]
                }
            }
            print(f"   📤 tool={tool_name} uri=ui://{ui_id}")
            return JSONResponse(resp)

        return JSONResponse({
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"}
        })

    elif method == "resources/list":
        return JSONResponse({
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"resources": []}
        })

    elif method == "resources/read":
        uri = body.get("params", {}).get("uri", "")
        ui_id = uri.replace("ui://", "")
        print(f"\n📖 resources/read: uri={uri} → lookup key={ui_id}")
        # Check dynamic UUIDs first, then static keys
        html = ui_resources.get(ui_id) or ui_latest.get(ui_id)
        print(f"   Found: {bool(html)} ({len(html) if html else 0} bytes)")
        if html:
            return JSONResponse({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "contents": [{
                        "uri": uri,
                        "mimeType": "text/html",
                        "text": html
                    }]
                }
            })
        return JSONResponse({
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32602, "message": f"Resource not found: {uri}"}
        })

    return JSONResponse({
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"}
    })

@app.get("/ui/{ui_id}")
async def get_ui_resource(ui_id: str):
    """Serve UI resource"""
    if ui_id in ui_resources:
        return HTMLResponse(ui_resources[ui_id])
    return HTMLResponse("<h1>UI not found</h1>", status_code=404)

def generate_chart_ui(data: list, labels: list, chart_type: str) -> str:
    """Generate chart HTML with inline SVG (no external dependencies)"""
    if not labels:
        labels = [f"Item {i+1}" for i in range(len(data))]
    if not data:
        data = [10, 25, 40, 30, 55]
        labels = ["A", "B", "C", "D", "E"]
    
    max_val = max(data) if data else 1
    width = 500
    height = 300
    margin_left = 50
    margin_bottom = 40
    bar_gap = 8
    chart_width = width - margin_left - 20
    chart_height = height - margin_bottom - 20
    bar_width = (chart_width - bar_gap * len(data)) / len(data)
    
    colors = ["#4F46E5", "#7C3AED", "#2563EB", "#0891B2", "#059669", "#D97706", "#DC2626", "#DB2777"]
    
    bars_svg = ""
    labels_svg = ""
    for i, val in enumerate(data):
        bar_h = (val / max_val) * chart_height
        x = margin_left + i * (bar_width + bar_gap)
        y = 20 + chart_height - bar_h
        color = colors[i % len(colors)]
        bars_svg += f'<rect x="{x}" y="{y}" width="{bar_width}" height="{bar_h}" fill="{color}" rx="4"><title>{labels[i]}: {val}</title></rect>'
        labels_svg += f'<text x="{x + bar_width/2}" y="{height - 10}" text-anchor="middle" font-size="11" fill="#666">{labels[i]}</text>'
        bars_svg += f'<text x="{x + bar_width/2}" y="{y - 5}" text-anchor="middle" font-size="11" fill="#333" font-weight="bold">{val}</text>'

    # Y-axis ticks
    y_axis = ""
    for i in range(5):
        tick_val = int(max_val * i / 4)
        y_pos = 20 + chart_height - (chart_height * i / 4)
        y_axis += f'<text x="{margin_left - 8}" y="{y_pos + 4}" text-anchor="end" font-size="10" fill="#999">{tick_val}</text>'
        y_axis += f'<line x1="{margin_left}" y1="{y_pos}" x2="{width - 20}" y2="{y_pos}" stroke="#eee" stroke-width="1"/>'

    return f"""<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ margin: 0; padding: 20px; font-family: -apple-system, sans-serif; background: white; }}
        h2 {{ margin: 0 0 16px 0; font-size: 18px; }}
        .footer {{ margin-top: 16px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 12px; color: #666; }}
        svg {{ display: block; }}
        rect {{ transition: opacity 0.2s; cursor: pointer; }}
        rect:hover {{ opacity: 0.8; }}
    </style>
</head>
<body>
    <h2>📊 {chart_type.capitalize()} Chart</h2>
    <svg width="{width}" height="{height}" viewBox="0 0 {width} {height}">
        {y_axis}
        {bars_svg}
        {labels_svg}
    </svg>
    <div class="footer">🎯 MCP Apps: Full HTML/JS application generated by agent • {len(data)} data points</div>
</body>
</html>"""

def generate_table_ui(data: list, columns: list) -> str:
    """Generate interactive table HTML"""
    if not data:
        return "<h1>No data to display</h1>"
    
    if not columns:
        columns = list(data[0].keys()) if data else []
    
    rows_html = ""
    for row in data:
        cells = "".join([f"<td>{row.get(col, '')}</td>" for col in columns])
        rows_html += f"<tr>{cells}</tr>"
    
    headers_html = "".join([f"<th>{col}</th>" for col in columns])
    
    return f"""<!DOCTYPE html>
<html>
<head>
    <title>Data Table</title>
    <style>
        body {{ margin: 0; padding: 20px; font-family: Arial, sans-serif; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background-color: #4CAF50; color: white; }}
        tr:hover {{ background-color: #f5f5f5; }}
    </style>
</head>
<body>
    <h2>📋 Interactive Data Table</h2>
    <table>
        <thead>
            <tr>{headers_html}</tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
    </table>
    <div style="margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 5px;">
        <small>🎯 MCP Apps: Dynamic table with {len(data)} rows</small>
    </div>
</body>
</html>"""

def generate_recipe_form(prompt: str) -> str:
    """Generate an interactive recipe preferences form"""
    return f"""<!DOCTYPE html>
<html>
<head>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ font-family: -apple-system, sans-serif; padding: 24px; background: #fefefe; color: #333; }}
        h2 {{ margin-bottom: 8px; font-size: 20px; }}
        .subtitle {{ color: #666; margin-bottom: 20px; font-size: 14px; }}
        .field {{ margin-bottom: 16px; }}
        label {{ display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px; color: #444; }}
        select, input[type="number"] {{ width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }}
        .chips {{ display: flex; flex-wrap: wrap; gap: 8px; }}
        .chip {{ padding: 6px 14px; border: 1px solid #ddd; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.2s; user-select: none; }}
        .chip:hover {{ border-color: #7c3aed; }}
        .chip.selected {{ background: #7c3aed; color: white; border-color: #7c3aed; }}
        .btn {{ margin-top: 20px; width: 100%; padding: 12px; background: #7c3aed; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }}
        .btn:hover {{ background: #6d28d9; }}
        .result {{ margin-top: 16px; padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 13px; display: none; }}
    </style>
</head>
<body>
    <h2>🍳 Recipe Maker</h2>
    <p class="subtitle">{prompt or "Tell me your preferences and I'll suggest a recipe!"}</p>

    <div class="field">
        <label>Cuisine</label>
        <select id="cuisine">
            <option value="">Select cuisine...</option>
            <option>Italian</option><option>Mexican</option><option>Japanese</option>
            <option>Indian</option><option>Thai</option><option>French</option>
            <option>Mediterranean</option><option>Chinese</option><option>American</option>
        </select>
    </div>

    <div class="field">
        <label>Dietary Restrictions</label>
        <div class="chips" id="diet-chips">
            <span class="chip" data-val="vegetarian">🥬 Vegetarian</span>
            <span class="chip" data-val="vegan">🌱 Vegan</span>
            <span class="chip" data-val="gluten-free">🚫 Gluten-Free</span>
            <span class="chip" data-val="dairy-free">🥛 Dairy-Free</span>
            <span class="chip" data-val="keto">🥑 Keto</span>
            <span class="chip" data-val="none">✅ None</span>
        </div>
    </div>

    <div class="field">
        <label>Main Ingredient</label>
        <div class="chips" id="ingredient-chips">
            <span class="chip" data-val="chicken">🍗 Chicken</span>
            <span class="chip" data-val="beef">🥩 Beef</span>
            <span class="chip" data-val="fish">🐟 Fish</span>
            <span class="chip" data-val="tofu">🧈 Tofu</span>
            <span class="chip" data-val="pasta">🍝 Pasta</span>
            <span class="chip" data-val="rice">🍚 Rice</span>
            <span class="chip" data-val="vegetables">🥦 Vegetables</span>
        </div>
    </div>

    <div class="field">
        <label>Servings</label>
        <input type="number" id="servings" value="2" min="1" max="12" />
    </div>

    <div class="field">
        <label>Max Cooking Time (minutes)</label>
        <select id="time">
            <option value="15">15 min (quick)</option>
            <option value="30" selected>30 min</option>
            <option value="45">45 min</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours (slow cook)</option>
        </select>
    </div>

    <button class="btn" onclick="submitForm()">🚀 Generate Recipe</button>
    <div class="result" id="result"></div>

    <script>
        document.querySelectorAll('.chip').forEach(chip => {{
            chip.addEventListener('click', () => chip.classList.toggle('selected'));
        }});

        function submitForm() {{
            const data = {{
                cuisine: document.getElementById('cuisine').value,
                dietary: [...document.querySelectorAll('#diet-chips .selected')].map(c => c.dataset.val),
                ingredient: [...document.querySelectorAll('#ingredient-chips .selected')].map(c => c.dataset.val),
                servings: parseInt(document.getElementById('servings').value),
                maxTime: parseInt(document.getElementById('time').value)
            }};
            const el = document.getElementById('result');
            el.style.display = 'block';
            el.innerHTML = '✅ <strong>Preferences submitted!</strong><br><pre>' + JSON.stringify(data, null, 2) + '</pre>';

            // Send back to MCP host if available
            if (window.parent !== window) {{
                window.parent.postMessage({{ type: 'mcp-app-result', data }}, '*');
            }}
        }}
    </script>
</body>
</html>"""


if __name__ == "__main__":
    port = int(os.getenv("PORT", "3003"))
    print(f"🚀 MCP Apps Server starting on port {port}")
    print(f"📡 MCP endpoint: http://localhost:{port}/mcp")
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
