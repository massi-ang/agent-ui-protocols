# A2UI Sample: Strands + Svelte + Bedrock

Declarative Generative UI demo using the Strands Agents SDK with Amazon Bedrock and Svelte renderer.

## Features

- 📝 **Dynamic Form Generation**: Agent creates forms based on requirements
- 🎴 **Contact Cards**: Generate user profiles declaratively
- 📊 **Survey Builder**: Multi-question surveys with various input types
- 🔄 **Streaming UI**: Progressive rendering via JSONL

## Architecture

```
┌──────────────────┐
│   Svelte UI      │
│  A2UI Renderer   │
│   Port 3002      │
└────────┬─────────┘
         │
         ↓
┌────────────────────────┐
│ Strands Agent (Python) │
│  Bedrock Integration   │
│  A2UI JSONL Output     │
└────────────────────────┘
```

## Tech Stack

- **Frontend**: Svelte + Vite + TypeScript
- **Backend**: Strands Agents SDK + Python + FastAPI
- **Agent**: Amazon Bedrock Claude
- **Protocol**: A2UI (JSONL streaming)
- **Styling**: Tailwind CSS

## Setup

### Local Development

**Backend:**

```bash
cd backend
pip install -r requirements.txt
python app.py
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

### Docker

```bash
docker build -t a2ui-sample .
docker run -p 3002:3002 \
  -e AWS_ACCESS_KEY_ID=xxx \
  -e AWS_SECRET_ACCESS_KEY=xxx \
  -e AWS_REGION=us-east-1 \
  a2ui-sample
```

## Environment Variables

```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
BEDROCK_MODEL=global.anthropic.claude-sonnet-4-6
```

## Usage

Visit http://localhost:3002 and try:

- "Create a contact form with name, email, and phone"
- "Build a user profile card for Alice"
- "Generate a feedback survey with 3 questions"

## How It Works

### A2UI Message Flow

1. **surfaceUpdate**: Define UI components

```json
{"surfaceUpdate": {
  "surfaceId": "main",
  "components": [
    {"id": "input1", "component": {"TextField": {...}}}
  ]
}}
```

2. **dataModelUpdate**: Initialize state

```json
{"dataModelUpdate": {
  "surfaceId": "main",
  "path": "/",
  "contents": {...}
}}
```

3. **beginRendering**: Signal to render

```json
{
  "beginRendering": {
    "surfaceId": "main",
    "root": "container"
  }
}
```

### Component Set

A2UI provides ~22 built-in components:

- Text, Button, Image, Link
- TextField, Checkbox, RadioButton
- Column, Row, List, Card
- DatePicker, Divider, etc.

## Key Files

- `backend/app.py` - FastAPI server with Strands agent and Bedrock integration
- `backend/custom_catalog.json` - Custom A2UI component catalog
- `frontend/src/App.svelte` - Main Svelte app
- `frontend/src/lib/A2UIRenderer.svelte` - A2UI component renderer

## Customization

### Add New A2UI Templates

Edit `backend/a2ui_templates.py`:

```python
TEMPLATES = {
    "form": {...},
    "card": {...},
    "survey": {...},
}
```

### Change Bedrock Model

Update `BEDROCK_MODEL` env var or change the `BedrockModel(model_id=...)` value in `backend/app.py`.

## Differences from AG-UI

- **AG-UI**: Pre-built React components, agent selects
- **A2UI**: Agent generates JSON structure, renderer interprets
- **AG-UI**: Full developer control
- **A2UI**: Balanced control, agent has more freedom
