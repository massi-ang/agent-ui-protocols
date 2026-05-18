"""json-render Agent Backend — generates JSON specs using Amazon Bedrock."""
import json
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import boto3

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

REGION = os.environ.get("AWS_REGION", "us-east-1")
MODEL = os.environ.get("BEDROCK_MODEL", "global.anthropic.claude-sonnet-4-6")

CATALOG_PROMPT = """You are a UI generator. You output ONLY valid JSON matching the json-render spec format.

Available components in the catalog:

PREDEFINED (shadcn/ui):
- Card: { title?: string, description?: string, maxWidth?: string } — container with optional heading. Has children.
- Stack: { direction?: "row"|"column", gap?: number, align?: string, justify?: string } — flex container. Has children.
- Grid: { columns?: number, gap?: number } — grid layout. Has children.
- Heading: { level?: "h1"|"h2"|"h3"|"h4" } — heading text. Has children (text content).
- Text: { variant?: "body"|"caption"|"muted"|"lead"|"code" } — paragraph text. Has children (text content).
- Button: { label: string, variant?: "primary"|"secondary"|"danger", disabled?: boolean }
- Input: { label: string, name: string, type?: string, placeholder?: string, value?: string }
- Select: { label: string, name: string, options: string[], value?: string }
- Badge: { text: string, variant?: "default"|"secondary"|"destructive"|"outline" }
- Alert: { title: string, message: string, type?: "success"|"warning"|"info"|"error" }
- Separator: { orientation?: "horizontal"|"vertical" }
- Table: { columns: string[], rows: string[][] }
- Progress: { value: number, max?: number, label?: string }
- Tabs: { tabs: Array<{label: string, value: string}>, defaultValue: string } — has children per tab.
- Avatar: { src?: string, name: string, size?: "sm"|"md"|"lg" }
- Skeleton: { width?: string, height?: string }

CUSTOM:
- Metric: { label: string, value: string, trend?: "up"|"down"|"flat", format?: "currency"|"percent"|"number" }
- BarChart: { title: string, data: Array<{label: string, value: number}> }

Output format — a single JSON object:
{
  "root": "<id of root element>",
  "elements": {
    "<id>": {
      "type": "<ComponentName>",
      "props": { ... },
      "children": ["<child-id>", ...] // optional
    }
  }
}

Rules:
- Output ONLY the JSON object, no markdown, no explanation
- Use descriptive IDs like "revenue-card", "sales-metric"
- Create realistic sample data relevant to the user's prompt
- Compose components logically (Cards contain content, Stacks arrange layout)
- For text content in Heading/Text, use a child Text element or put content in props
- Prefer Stack for layouts over raw nesting
"""


def get_bedrock_client():
    return boto3.client("bedrock-runtime", region_name=REGION)


async def stream_spec(prompt: str, previous_spec: dict | None = None):
    client = get_bedrock_client()
    messages = [{"role": "user", "content": prompt}]
    if previous_spec:
        messages.insert(0, {
            "role": "user",
            "content": f"Current UI state:\n{json.dumps(previous_spec, indent=2)}\n\nUpdate it based on the next instruction."
        })
        messages.insert(1, {"role": "assistant", "content": "I'll update the UI. Here's the new spec:"})

    response = client.invoke_model_with_response_stream(
        modelId=MODEL,
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "system": CATALOG_PROMPT,
            "messages": messages,
        }),
    )
    for event in response["body"]:
        chunk = json.loads(event["chunk"]["bytes"])
        if chunk["type"] == "content_block_delta":
            text = chunk["delta"].get("text", "")
            if text:
                yield text


@app.post("/api/generate")
async def generate(request: Request):
    body = await request.json()
    prompt = body.get("prompt", "")
    previous_spec = body.get("previousSpec")
    return StreamingResponse(stream_spec(prompt, previous_spec), media_type="text/plain")


@app.get("/health")
async def health():
    return {"status": "ok"}
