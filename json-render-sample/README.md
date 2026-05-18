# json-render Sample

Schema-constrained generative UI using Vercel's json-render pattern with Amazon Bedrock.

## Architecture

```
┌──────────────────┐         ┌──────────────────┐
│  Next.js Client  │ ◄─────► │  Python Agent    │
│  json-render     │  HTTP   │  Bedrock Claude  │
│  Component       │  Stream │  JSON Spec Gen   │
│  Registry        │         │                  │
└──────────────────┘         └──────────────────┘
  Port 3004                    Port 8081
```

## How It Works

1. **Catalog** defines allowed components (Card, Metric, BarChart, Table, etc.)
2. **User prompts** describe desired UI ("Create a sales dashboard")
3. **Agent** (Bedrock Claude) generates JSON spec constrained to catalog
4. **Registry** maps spec types to real React components
5. **Renderer** streams components progressively

## Quick Start

### With Docker Compose (from root)

```bash
docker-compose up json-render-frontend json-render-agent
```

### Local Development

```bash
# Terminal 1: Agent
cd agent
pip install -r requirements.txt
uvicorn server:app --port 8081

# Terminal 2: Frontend
cd frontend
pnpm install
pnpm dev
```

Open http://localhost:3004

## Try These Prompts

- "Create a sales dashboard with revenue, customers, and growth metrics"
- "Show a table of top 5 employees with name, role, and department"
- "Build a project status board with 3 projects showing progress"
- "Create a bar chart of monthly sales for Q1 2024"

## Key Files

- `frontend/src/lib/catalog.ts` — Component type definitions (the guardrails)
- `frontend/src/lib/registry.tsx` — React component implementations + renderer
- `frontend/src/app/page.tsx` — Chat UI + spec rendering
- `agent/server.py` — Bedrock agent that generates JSON specs
