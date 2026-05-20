# AG-UI Address Sample — Server-Side Data Enrichment Pattern

This sample demonstrates how to **enrich client-side tool call arguments with server-side data** using the AG-UI protocol with Strands Agents and CopilotKit.

## The Pattern: `args_streamer` for Server-Side Enrichment

The core challenge: the LLM generates a tool call with minimal arguments (e.g., just a postcode), but the client-side UI needs additional data (e.g., a list of matching addresses) that only the server can provide.

```
┌─────────┐         ┌──────────────────┐         ┌──────────────┐
│   LLM   │────────►│  args_streamer   │────────►│  Client UI   │
│         │         │  (server-side)   │         │  (React)     │
│ postcode│         │ + address lookup │         │ full args    │
│ only    │         │ = enriched args  │         │ + addresses  │
└─────────┘         └──────────────────┘         └──────────────┘
```

### Why not use a Strands `BeforeToolCallEvent` hook?

Hooks fire at tool **execution** time, but AG-UI streams tool call args to the client **as the LLM generates them** — before the hook runs. By the time the hook modifies `event.tool_use["input"]`, the client has already received the original (un-enriched) args.

### The Solution: `ToolBehavior.args_streamer`

`args_streamer` intercepts the tool call args **before** they're sent to the client via AG-UI events. It replaces the LLM's raw output with enriched data:

```python
from ag_ui_strands.config import StrandsAgentConfig, ToolBehavior, ToolCallContext

async def address_args_streamer(ctx: ToolCallContext):
    """Enrich tool args with server-side data before sending to client."""
    args = json.loads(ctx.args_str)
    postcode = args.get("postcode", "")
    
    # Server-side data lookup
    addresses = get_addresses_for_postcode(postcode)
    
    # Yield enriched args — this is what the client receives
    yield json.dumps({"postcode": postcode, "addresses": addresses})

agui_agent = StrandsAgent(
    agent=agent,
    config=StrandsAgentConfig(
        tool_behaviors={
            "select_address_for_postcode": ToolBehavior(
                args_streamer=address_args_streamer,
            ),
        }
    ),
)
```

## Architecture

```
User: "My postcode is SW1A 1AA"
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend (Strands Agent + Bedrock)                           │
│                                                             │
│  1. validate_postcode("SW1A 1AA")  ← @tool (server-side)   │
│     → {"valid": true}                                       │
│                                                             │
│  2. LLM calls select_address_for_postcode(postcode="SW1A")  │
│     → args_streamer intercepts                              │
│     → Looks up addresses from API/database                  │
│     → Streams enriched args to client                       │
└─────────────────────────────────────────────────────────────┘
         │
         ▼ AG-UI TOOL_CALL_ARGS (with addresses)
         │
┌─────────────────────────────────────────────────────────────┐
│ Frontend (CopilotKit + React)                               │
│                                                             │
│  renderAndWaitForResponse({ args, respond, status })        │
│    - Wait for status === "executing" (args fully received)  │
│    - Render <AddressSelector> with addresses                │
│    - User picks an address                                  │
│    - respond(selectedAddress) → sends result back to agent  │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
Agent confirms the selected address
```

## Key Implementation Details

### 1. Server-side tool: `validate_postcode`

A standard `@tool`-decorated Strands tool that runs on the server. The agent calls it to validate the postcode format before looking up addresses.

```python
@tool
def validate_postcode(postcode: str) -> dict:
    """Validate a UK postcode format."""
    normalized = postcode.strip().upper()
    pattern = r'^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$'
    is_valid = bool(re.match(pattern, normalized))
    return {"valid": is_valid, "postcode": normalized}
```

### 2. Client-side tool: `select_address_for_postcode`

Registered via `useCopilotAction` with `renderAndWaitForResponse` — renders UI in the chat and waits for user interaction.

```tsx
useCopilotAction({
  name: 'select_address_for_postcode',
  parameters: [
    { name: 'postcode', type: 'string', required: true },
    { name: 'addresses', type: 'object[]', attributes: [...] },
  ],
  renderAndWaitForResponse: ({ args, respond, status }) => {
    // ⚠️ IMPORTANT: Wait for args to be fully received
    if (status !== 'executing') {
      return <LoadingState />
    }
    return <AddressSelector addresses={args.addresses} onSelect={respond} />
  },
})
```

### 3. Critical: Check `status` before rendering

CopilotKit calls `renderAndWaitForResponse` multiple times as args stream in:

| Status | Meaning | Args state |
|--------|---------|-----------|
| `"inProgress"` | Args still streaming | Partial — may be incomplete |
| `"executing"` | Args fully received, waiting for user response | Complete |
| `"complete"` | User has responded | Final |

**Always gate your UI on `status === "executing"`** to avoid rendering with partial data.

## Running

### With Docker

```bash
docker-compose up --build ag-ui-address-backend ag-ui-address-frontend
```

Access at http://localhost:3006

### Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
python agent.py

# Frontend
cd frontend
npm install
npm run dev
```

## Try It

Use these postcodes (mocked data):
- `SW1A 1AA` — 3 addresses (Westminster, London)
- `EC2R 8AH` — 2 addresses (City of London)
- `M1 1AA` — 4 addresses (Manchester)
- Any other valid postcode — 1 fallback address

## When to Use This Pattern

Use `args_streamer` when you need to:

- **Enrich LLM tool calls with server-side data** (database lookups, API calls)
- **Keep sensitive data server-side** (the LLM never sees the full address list)
- **Decouple the LLM from data fetching** (LLM only needs to know the postcode)
- **Control what the client receives** (filter, transform, or augment args)

## Alternatives Considered

| Approach | Why it doesn't work |
|----------|-------------------|
| `BeforeToolCallEvent` hook | Fires after AG-UI events are already streamed to client |
| Two-step tool calls (lookup → select) | Works but adds latency and complexity |
| Include all data in system prompt | Doesn't scale, wastes tokens |
| Client-side API call | Exposes backend APIs, duplicates logic |

## Stack

- **Backend**: Python, Strands Agents SDK, Amazon Bedrock (Claude), FastAPI
- **Frontend**: Next.js 15, React, CopilotKit, TypeScript, Tailwind CSS
- **Protocol**: AG-UI (Agent-UI Protocol)
- **Infra**: Docker Compose
