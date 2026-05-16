import os
import json
import uuid
from typing import Dict, Any
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sse_starlette.sse import EventSourceResponse
import uvicorn
import boto3

app = FastAPI(title="MCP Apps Sample")

# In-memory storage for UI resources
ui_resources: Dict[str, str] = {}

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
    }
]

@app.get("/mcp")
async def mcp_endpoint(request: Request):
    """MCP Server-Sent Events endpoint"""
    
    async def generate():
        # Send initialization
        yield {
            "event": "endpoint",
            "data": json.dumps({
                "jsonrpc": "2.0",
                "id": 1,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "serverInfo": {
                        "name": "agent-ui-mcp-sample",
                        "version": "1.0.0"
                    },
                    "capabilities": {
                        "tools": {
                            "listChanged": False
                        },
                        "resources": {
                            "subscribe": False,
                            "listChanged": False
                        }
                    }
                }
            })
        }
        
        # Send tools list
        yield {
            "event": "message",
            "data": json.dumps({
                "jsonrpc": "2.0",
                "method": "tools/list",
                "params": {
                    "tools": TOOLS
                }
            })
        }
    
    return EventSourceResponse(generate())

@app.post("/mcp/tools/call")
async def call_tool(request: Request):
    """Handle tool calls from MCP client"""
    body = await request.json()
    tool_name = body.get("name")
    arguments = body.get("arguments", {})
    
    if tool_name == "create_chart":
        ui_html = generate_chart_ui(
            arguments.get("data", []),
            arguments.get("labels", []),
            arguments.get("chart_type", "bar")
        )
        ui_id = str(uuid.uuid4())
        ui_resources[ui_id] = ui_html
        
        return JSONResponse({
            "content": [
                {
                    "type": "resource",
                    "resource": {
                        "uri": f"ui://{ui_id}",
                        "mimeType": "text/html",
                        "text": ui_html
                    }
                }
            ]
        })
    
    elif tool_name == "create_table":
        ui_html = generate_table_ui(
            arguments.get("data", []),
            arguments.get("columns", [])
        )
        ui_id = str(uuid.uuid4())
        ui_resources[ui_id] = ui_html
        
        return JSONResponse({
            "content": [
                {
                    "type": "resource",
                    "resource": {
                        "uri": f"ui://{ui_id}",
                        "mimeType": "text/html",
                        "text": ui_html
                    }
                }
            ]
        })
    
    return JSONResponse({"error": "Unknown tool"}, status_code=400)

@app.get("/ui/{ui_id}")
async def get_ui_resource(ui_id: str):
    """Serve UI resource"""
    if ui_id in ui_resources:
        return HTMLResponse(ui_resources[ui_id])
    return HTMLResponse("<h1>UI not found</h1>", status_code=404)

def generate_chart_ui(data: list, labels: list, chart_type: str) -> str:
    """Generate D3.js chart HTML"""
    if not labels:
        labels = [f"Item {i+1}" for i in range(len(data))]
    
    return f"""<!DOCTYPE html>
<html>
<head>
    <title>Chart Visualization</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {{ margin: 0; padding: 20px; font-family: Arial, sans-serif; }}
        .bar {{ fill: steelblue; }}
        .bar:hover {{ fill: orange; }}
        .axis {{ font-size: 12px; }}
        .label {{ font-size: 14px; font-weight: bold; }}
    </style>
</head>
<body>
    <h2>📊 {chart_type.capitalize()} Chart</h2>
    <svg id="chart"></svg>
    <div style="margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 5px;">
        <small>🎯 MCP Apps: Full HTML/JS application generated by agent</small>
    </div>
    <script>
        const data = {json.dumps(data)};
        const labels = {json.dumps(labels)};
        const width = 600;
        const height = 400;
        const margin = {{top: 20, right: 20, bottom: 60, left: 60}};

        const svg = d3.select("#chart")
            .attr("width", width)
            .attr("height", height);

        const x = d3.scaleBand()
            .domain(labels)
            .range([margin.left, width - margin.right])
            .padding(0.1);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data)])
            .nice()
            .range([height - margin.bottom, margin.top]);

        svg.selectAll(".bar")
            .data(data)
            .join("rect")
            .attr("class", "bar")
            .attr("x", (d, i) => x(labels[i]))
            .attr("y", d => y(d))
            .attr("width", x.bandwidth())
            .attr("height", d => y(0) - y(d));

        svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${{height - margin.bottom}})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(${{margin.left}},0)`)
            .call(d3.axisLeft(y));
    </script>
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
