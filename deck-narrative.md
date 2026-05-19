# Agent UI Protocols — Deck Narrative (v2)

## Narrative Arc (23 slides)

1. **Title**
2. **The Problem** — Agents respond with text, but users need rich interactive UIs
3. **Two Distinct Problems** — Separate the *wire protocol* from the *UI rendering*
4. **The Agentic Protocol Stack** — MCP / A2A / AG-UI triangle
5. **AG-UI — The Wire Protocol** — What it is, top 3 differentiators
6. **AG-UI — Event Categories** — Light overview of the 16+ event types
7. **The Generative UI Spectrum** — Controlled → Declarative → Open-ended
8. **A2UI** — Google's declarative spec, top 3 differentiators
9. **A2UI — How It Works** — 4 message types, rendering model
9b. **A2UI — Actions** — How the UI talks back (action message, context resolution)
9c. **A2UI — sendDataModel** — The batched state sync mechanism
10. **json-render** — Vercel's Zod-constrained library, top 3 differentiators
11. **A2UI vs json-render** — Comparison table
12. **MCP Apps** — Open-ended, client-agnostic, top 3 differentiators
13. **MCP Apps — postMessage Deep Dive** — JSON-RPC over postMessage, security model
14. **Open Generative UI** — Raw HTML, disposable interfaces
15. **Bidirectional: AG-UI** — Shared mutable state, frontend tools
16. **Bidirectional: A2UI** — Data model + action events
17. **Bidirectional: MCP Apps & Others** — Tool-based, one-directional
18. **Bidirectional Summary** — Comparison table
19. **How They Relate** — Relationship map (not a stack)
20. **Choosing — Two Orthogonal Decisions** — Wire protocol vs UI rendering
21. **The Future & CTA**

---

## Slide 1: Title

**Connecting UI to AI Agents**

Subtitle: Wire Protocols & Generative UI — The Full Stack

Visual: Agent ↔ Interface icon pair

---

## Slide 2: The Problem

**Traditional AI agents respond with plain text.**

- Complex data (charts, forms, dashboards) can't be expressed as text
- No real-time interactive interfaces
- No standardized way for agents to control or generate UI

Key insight callout: **Two separate problems are being conflated.**

---

## Slide 3: Two Distinct Problems

> [DIAGRAM: Two-layer split — side by side boxes]

**Problem 1 — Wire Protocol: How do agent and UI communicate?**

Without a standard, every agent framework defines its own message format. This is the same problem OpenAI's Chat API and Bedrock Converse API solved for LLM invocation — a standard protocol so clients don't reinvent the wheel for every provider.

- Streaming events bidirectionally
- State synchronization
- Tool calls, lifecycle, interrupts

**Problem 2 — UI Rendering: What does the agent show?**

- What format describes the UI?
- How much freedom does the agent have?
- How is it rendered safely?

Callout: These are **orthogonal concerns**. You need BOTH. Different protocols address different layers.

---

## Slide 4: The Agentic Protocol Stack

> [DIAGRAM: Three-leg triangle — MCP / A2A / AG-UI]

- **MCP** — Agent ↔ Tools (context, resources, capabilities)
- **A2A** — Agent ↔ Agent (delegation, collaboration)
- **AG-UI** — Agent ↔ User (the missing piece)

AG-UI completes the triangle. It's the user-facing layer that was missing.

---

## Slide 5: AG-UI — The Wire Protocol

**What it is:** Event-driven streaming protocol. 16 standard event types + extensible with custom events. Transport-agnostic.

**NOT a generative UI spec** — it's the pipe that carries them.

**Top 3 differentiators:**

1. **Bidirectional state sync** — Snapshot/delta pattern (RFC 6902 JSON Patch). Agent reads AND writes UI state.
2. **Transport-agnostic** — SSE, binary HTTP, WebSocket. Middleware layer adapts any agent framework.
3. **Natively supports generative UI specs** — A2UI, MCP Apps, Open-JSON-UI can all be transported over AG-UI events.

---

## Slide 6: AG-UI — Event Categories

Keep this light — just the categories and the pattern:

- **Lifecycle**: `RunStarted` → `StepStarted/Finished` → `RunFinished/Error`
- **Text Messages**: `Start` → `Content` (delta streaming) → `End`
- **Tool Calls**: `Start` → `Args` (streaming JSON) → `End` → `Result`
- **State**: `Snapshot` (full state) / `Delta` (JSON Patch)
- **Activity**: Structured progress updates between messages
- **Reasoning**: Chain-of-thought visibility (with encryption support)
- **Custom**: Application-specific extensions

> [DIAGRAM: AG-UI event stream — simple sequence showing a typical run]

---

## Slide 7: The Generative UI Spectrum

> [DIAGRAM: Horizontal spectrum bar with three zones]

← **More Control** ————————————————————— **More Flexibility** →

| Controlled | Declarative | Open-ended |
|---|---|---|
| Pre-built components | JSON spec → catalog render | Full HTML/JS |
| `useComponent` | A2UI, json-render | MCP Apps, Open GenUI |
| Developer owns every pixel | Agent picks from catalog | Agent owns the canvas |

Note: These specs use different transports. A2UI is transport-agnostic (AG-UI, A2A, MCP, SSE). MCP Apps requires MCP protocol. Open GenUI uses AG-UI via CopilotKit.

---

## Slide 8: A2UI — Declarative Generative UI (Google)

**What it is:** Transport-agnostic JSON streaming spec. Agent generates component tree, client renders from catalog.

**Top 3 differentiators:**

1. **Transport-decoupled** — Works over AG-UI, A2A, MCP, SSE, WebSocket. Not tied to any framework.
2. **Bidirectional actions** — Components declare events; user clicks → action sent to agent with full data model context.
3. **Swappable catalogs** — Define your own component catalog (your design system) or use the basic 18-component one.

Key concept: **Prompt-first** (v0.9) — Schema injected into LLM prompt. Agent generates JSON. Validate. Retry if invalid.

---

## Slide 9: A2UI — How It Works

4 message types streamed as JSONL:

1. `createSurface` — initialize a rendering surface (ID, catalog, theme)
2. `updateComponents` — flat adjacency-list of components referencing each other by ID
3. `updateDataModel` — populate/update data via JSON Pointers (RFC 6901)
4. `deleteSurface` — remove the UI

Rendering: Client creates the surface on `createSurface`, buffers components until the `root` component is defined, then renders the full tree. Dynamic updates arrive as additional `updateComponents` or `updateDataModel` messages.

> [DIAGRAM: A2UI message flow — Server streams createSurface → updateComponents → updateDataModel → Client renders tree]

---

## Slide 9b: A2UI — Actions: How the UI Talks Back

**The `action` message is the only client→server message type for user interactions.**

A Button declares what to send when clicked:

```json
{
  "component": "Button",
  "text": "Submit",
  "action": {
    "event": {
      "name": "submit_form",
      "context": {
        "email": { "path": "/formData/email" },
        "itemId": "123"
      }
    }
  }
}
```

**On click, the client:**
1. Resolves all `{ "path": "..." }` bindings against the local data model
2. Evaluates any function calls (e.g., `formatDate`)
3. Sends the resolved action:

```json
{
  "action": {
    "name": "submit_form",
    "surfaceId": "contact_form_1",
    "sourceComponentId": "submit_button",
    "timestamp": "2026-05-19T17:00:00Z",
    "context": { "email": "jane@example.com", "itemId": "123" }
  }
}
```

4. If `sendDataModel=true` on the surface → the **entire data model** is attached in transport metadata alongside the action

**Key:** The server receives concrete resolved values, not raw paths. It can then respond with new `updateComponents` or `updateDataModel` to update the UI.

---

## Slide 9c: A2UI — sendDataModel Explained

**`sendDataModel` is a flag on `createSurface`, not a message type.**

```json
{ "createSurface": { "surfaceId": "form_1", "catalogId": "...", "sendDataModel": true } }
```

**What it does:**
- Between actions: user types, toggles, selects → local data model updates reactively (no network)
- On action (button click): client attaches the **full data model snapshot** in transport metadata

> [DIAGRAM: Timeline showing local edits (no network) → button click → action + full data model sent together]

**Why this design:**
- Minimizes network traffic (no keystroke-by-keystroke sync)
- Server always gets complete, consistent state at decision points
- Two-way binding is local and instant; server sync is batched and explicit

**Transport metadata examples:**
- Over A2A: `metadata: { "a2uiClientDataModel": { "surfaces": { "form_1": { "email": "..." } } } }`
- Over HTTP: custom header or request body field
- Over AG-UI: carried in custom event payload

---

## Slide 10: json-render — Schema-Constrained GenUI (Vercel)

**What it is:** Library (not protocol). Zod catalog defines guardrails. AI generates JSON. Streaming render.

**Top 3 differentiators:**

1. **Zod-native guardrails** — TypeScript-first. AI can ONLY produce specs matching your catalog. Compile-time safety.
2. **Multi-framework** — React, Vue, Svelte, Solid, React Native from same catalog.
3. **Streaming via partial JSON parsing** — The LLM streams a single JSON tree token-by-token. json-render parses the incomplete JSON progressively, rendering components as soon as their props are complete. No waiting for the full response.

**How it works:**
1. Define catalog with Zod schemas (components, actions, validation)
2. `catalog.prompt()` → auto-generates system prompt for LLM
3. AI generates JSON spec constrained to catalog
4. Partial JSON parser renders components as tokens arrive

---

## Slide 11: A2UI vs json-render

Both: Agent generates JSON spec → client maps to real components from a catalog.

| Aspect | A2UI | json-render |
|--------|------|-------------|
| Nature | Protocol (multi-vendor, Google) | Library (Vercel, Apache-2.0) |
| Schema | JSON Schema | Zod (TypeScript) |
| Transport | Any (AG-UI, A2A, MCP, SSE) | Vercel AI SDK |
| Output | JSONL stream (4 message types) | Single JSON tree (partial-parsed) |
| Bidirectional | Built-in (actions + events) | Actions only (no event loop) |
| Platforms | React, Lit, Angular, Flutter | React, Vue, Svelte, Solid, RN |

**TL;DR:** Same pattern. A2UI = open protocol. json-render = typed library.

---

## Slide 12: MCP Apps — Open-ended GenUI

**What it is:** Full HTML/CSS/JS applications rendered in sandboxed iframes inside MCP hosts (Claude, VS Code, Goose, Postman).

**Key insight:** If you don't own the client code, MCP Apps is today the only client-agnostic way to render rich interactive UI from an agent. Any MCP-compatible host renders your app — no custom frontend needed.

**Top 3 differentiators:**

1. **Full web platform** — Use any JS library (D3, Three.js, CesiumJS). No component catalog constraints.
2. **Client-agnostic** — Works in any MCP host without custom frontend code. The host handles rendering.
3. **Context preservation** — UI lives inside the conversation. No tab switching. Integrated with LLM context.

---

## Slide 13: MCP Apps — Bidirectional Communication Deep Dive

> [DIAGRAM: Detailed postMessage flow between App iframe and MCP Host]

**The mechanism: `window.postMessage` + JSON-RPC**

`postMessage` is a browser API that allows cross-origin communication between windows. The host and the iframe app use it as a secure tunnel for structured JSON-RPC messages.

**Setup:**
1. Host renders app HTML in `<iframe sandbox="...">` — sandbox blocks DOM access, cookies, navigation
2. App calls `window.parent.postMessage({jsonrpc: "2.0", method: "ui/initialize", ...})` 
3. Host responds via `iframe.contentWindow.postMessage(...)` confirming capabilities

**App → Host (requests):**
```json
{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "get_data", "arguments": {...}}, "id": 1}
```
- `tools/call` — invoke any MCP tool on the server
- `ui/sendMessage` — inject a message into the conversation
- `ui/openLink` — request the host to open a URL

**Host → App (responses + notifications):**
```json
{"jsonrpc": "2.0", "result": {"content": [...]}, "id": 1}
```
- Responses carry tool results back to the app
- Host can also push unsolicited notifications (no `id` field)

**Security guarantees:**
- iframe `sandbox` attribute prevents: DOM access, cookie reading, parent navigation, script injection
- CSP (`_meta.ui.csp`) controls which external origins the app can load resources from
- Host decides which tools the app is allowed to call

**Key difference from AG-UI/A2UI:** This is request/response (like HTTP), not streaming state sync. The app must explicitly ask for data — nothing is pushed automatically unless the host initiates it.

---

## Slide 14: Open Generative UI — The Wild Card

**What it is:** Agent generates raw HTML. Rendered in double-iframe sandbox. Disposable, throwaway interfaces.

**How it works:**
1. Frontend registers an HTML-render tool via AG-UI
2. Agent writes complete HTML/CSS/JS as tool call response
3. CopilotKit renders in double-iframe sandbox
4. User interacts; interface is ephemeral

**Top 3 differentiators:**

1. **Zero coupling** — No catalog, no schema, no pre-built components. One flag: `openGenerativeUI={true}`.
2. **Disposable interfaces** — "Show me how electrons work" → unique visualization you'll never see again.
3. **Lowest dev effort** — One agent instruction. Frontend does the rest.

Trade-off: Unpredictable styling. Hard to brand. Security requires double-iframe.

---

## Slide 15: Bidirectional Communication — AG-UI

> [DIAGRAM: AG-UI bidirectional state flow — Agent ↔ Frontend with snapshot/delta arrows]

**AG-UI's model: Shared mutable state**

- Agent sends `StateSnapshot` → frontend gets full state object
- Agent sends `StateDelta` → frontend applies JSON Patch (RFC 6902) incrementally
- Frontend defines tools (via `useCopilotAction`) → agent invokes them to mutate UI state
- Both sides can read AND write the same state

**Key pattern:** The agent doesn't just push data — it can read the current UI state and make decisions based on it. "If the sidebar is closed, open it." This is unique to AG-UI.

Example flow:
1. User types "close sidebar and switch to dark mode"
2. Agent reads current state (sidebar: open, theme: light)
3. Agent calls frontend tool `toggle_sidebar({open: false})`
4. Agent calls frontend tool `change_theme({theme: "dark"})`
5. UI updates instantly (no server round-trip for the state change)

---

## Slide 16: Bidirectional Communication — A2UI

> [DIAGRAM: A2UI bidirectional flow — Server pushes data model, Client sends actions back]

**A2UI's model: Surface-scoped data model + action events**

- **Agent → UI**: `updateDataModel` messages update specific paths (JSON Pointer upserts)
- **UI → Agent**: User clicks a button → `action` message sent with:
  - Action name
  - Resolved context (data model values at bound paths)
  - Full data model snapshot (if `sendDataModel=true`)

**Key pattern:** Two-way data binding is local to the client. User types in a TextField → local data model updates reactively. But the server only receives data when an explicit action fires (e.g., button click). No continuous sync — event-driven.

Example flow:
1. Agent sends form components + data model
2. User fills in fields (local state updates reactively)
3. User clicks "Submit" button
4. Client resolves all bound paths, sends action with full context to agent
5. Agent processes, sends new `updateDataModel` or `updateComponents`

---

## Slide 17: Bidirectional Communication — MCP Apps & Others

**MCP Apps: Tool-based communication**
- App calls `tools/call` → host proxies to MCP server → result pushed back
- No shared state model. App manages its own DOM state.
- Communication is request/response (JSON-RPC), not streaming state sync.

**json-render: One-directional with actions**
- Agent → UI: Data binding via JSON Pointers in component props
- UI → Agent: Named actions fire with params, but no event loop back to agent
- Primarily a rendering library, not a communication protocol

**Open GenUI: Stateless**
- Agent writes full HTML. No incremental updates.
- User interacts within the iframe but there's no feedback channel to the agent.
- Each render is a fresh document. Ephemeral by design.

---

## Slide 18: Bidirectional Summary

> Verified against official docs: AG-UI (docs.ag-ui.com/concepts/state), A2UI (a2ui.org/specification/v0.9), MCP Apps (modelcontextprotocol.io/extensions/apps), json-render (json-render.org/docs/actions), Open GenUI (CopilotKit blog).

| | Shared State | Agent Reads UI | UI Sends Events | Continuous Sync |
|---|---|---|---|---|
| **AG-UI** | ✅ Snapshot + Delta | ✅ Full context | ✅ Frontend tools | ✅ Real-time |
| **A2UI** | ✅ Data model per surface | ❌ Only on action | ✅ Action events | ❌ Event-driven |
| **MCP Apps** | ❌ App-managed | ❌ | ✅ Tool calls | ❌ Request/response |
| **json-render** | ❌ Client-local | ❌ | ⚠️ Actions (no loop) | ❌ |
| **Open GenUI** | ❌ Stateless | ❌ | ❌ | ❌ |

**Takeaway:** The richer the bidirectional model, the more the agent can reason about and react to the current UI state. AG-UI is the richest. A2UI is event-driven. The rest are primarily one-way.

---

## Slide 19: How They Relate

> [DIAGRAM: Relationship map — NOT a strict stack]

```
                    ┌─────────────┐
                    │   AG-UI     │ ← Wire protocol (agent ↔ user)
                    │  (optional) │
                    └──────┬──────┘
                           │ can transport
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │   A2UI   │ │json-render│ │ Open GenUI│
        │(any transport)│(AI SDK) │ │(AG-UI)   │
        └──────────┘ └──────────┘ └──────────┘

        ┌──────────────────────────────────────┐
        │          MCP Protocol                 │
        │  ┌──────────┐                        │
        │  │ MCP Apps │ (requires MCP)         │
        │  └──────────┘                        │
        └──────────────────────────────────────┘
```

- **AG-UI** is a wire protocol. It can transport A2UI, json-render, or Open GenUI — but is NOT required by all.
- **A2UI** is transport-agnostic: works over AG-UI, A2A, MCP, raw SSE.
- **json-render** is a library: uses Vercel AI SDK for streaming, no protocol dependency.
- **MCP Apps** requires MCP protocol (not AG-UI). It's the only one tied to a specific transport.
- **Open GenUI** uses AG-UI (via CopilotKit) as its transport.

They're **complementary**, not competing. A single app can use multiple.

---

## Slide 20: Choosing — Two Orthogonal Decisions

These are **two separate choices**, not one:

### Decision 1: Wire Protocol (How do you connect agent ↔ UI?)

| Situation | Choice |
|-----------|--------|
| Building a custom agentic frontend | **AG-UI** — standard event stream, any backend |
| Using an MCP-compatible host (Claude, VS Code) | **MCP** — already built in |
| Multi-agent system, sub-agent generates UI | **A2A** — sub-agent sends A2UI to orchestrator, which forwards to client |
| Simple integration, no framework | **Raw SSE / WebSocket** — minimal overhead |

Note: A2A is agent↔agent. It's listed here because A2UI can be transported over A2A in multi-agent architectures where a sub-agent produces UI that the orchestrator relays to the user. It's not a direct frontend↔agent connection.

### Decision 2: UI Rendering (What does the agent show?)

| Situation | Choice |
|-----------|--------|
| Branded product UI, recurring flows | **Controlled** (`useComponent`) |
| Cross-platform, long-tail interactions | **A2UI** |
| Design-system-safe, TypeScript-first | **json-render** |
| Rich apps, don't own the client | **MCP Apps** |
| Throwaway visualizations | **Open GenUI** |

These decisions are independent. You can use AG-UI + A2UI, or MCP + MCP Apps, or AG-UI + Open GenUI.

---

## Slide 21: The Future & CTA

- **Hybrid apps**: Controlled for critical flows + Open-ended for exploration
- **Agent steering**: Human-in-the-loop via AG-UI interrupts
- **Convergence**: CopilotKit supports all three buckets. A2UI growing across platforms.
- **MCP Apps expanding**: More hosts adopting the standard.

Links: AG-UI, A2UI, json-render, MCP Apps, sample repo.

---

## Diagrams Needed (SVG)

1. **Two-layer split** (Slide 3): Wire protocol vs UI rendering as two distinct problem boxes
2. **Three-leg triangle** (Slide 4): MCP / A2A / AG-UI completing the agentic stack
3. **AG-UI event stream** (Slide 6): Sequence of events flowing agent → frontend
4. **Generative UI spectrum** (Slide 7): Horizontal bar from controlled → open-ended
5. **A2UI message flow** (Slide 9): Server → Client JSONL stream
6. **MCP Apps postMessage flow** (Slide 13): Detailed bidirectional communication
7. **AG-UI bidirectional state** (Slide 15): Agent ↔ Frontend shared state with snapshot/delta
8. **A2UI bidirectional flow** (Slide 16): Data model push + action events back
9. **Relationship map** (Slide 19): How protocols relate (not a strict stack)

---

## Slide 18 — Source Verification

| Claim | Source |
|-------|--------|
| AG-UI: Shared state via StateSnapshot + StateDelta (JSON Patch RFC 6902) | https://docs.ag-ui.com/concepts/state — "STATE_SNAPSHOT: Complete state representation" / "STATE_DELTA: Incremental state changes using JSON Patch format" |
| AG-UI: Agent reads UI state | https://docs.ag-ui.com/concepts/state — Agent receives full state context via snapshot events; frontend shares local state with agent |
| AG-UI: Frontend tools invoked by agent | https://docs.ag-ui.com/concepts/tools — Tools defined on frontend, agent invokes them as tool calls |
| AG-UI: Real-time continuous sync | https://docs.ag-ui.com/concepts/architecture — Streaming event-driven, delta pattern for ongoing changes |
| A2UI: Surface-scoped data model | https://a2ui.org/specification/v0.9-a2ui/#data-model-updates-synchronization-and-convergence — "updateDataModel message replaces the value at the specified path" |
| A2UI: Agent only gets state on action (sendDataModel) | https://a2ui.org/specification/v0.9-a2ui/#client-to-server-updates — "data model is sent exclusively to the server... only when a client-to-server message is triggered (e.g., by a user action like a button click)" |
| A2UI: Action events with resolved context | https://a2ui.org/specification/v0.9-a2ui/#action — action message includes name, surfaceId, sourceComponentId, timestamp, context |
| MCP Apps: No shared state, app-managed | https://modelcontextprotocol.io/extensions/apps/overview — App runs in sandboxed iframe, manages own state. Communication via JSON-RPC postMessage. |
| MCP Apps: Tool calls via postMessage | https://modelcontextprotocol.io/extensions/apps/overview — "app can call any tool on the MCP server... through the secure postMessage channel" |
| json-render: Actions defined, no event loop | https://json-render.org/docs/actions — Actions are named and typed but fire client-side; no built-in server round-trip event loop |
| Open GenUI: Stateless, no feedback | https://www.copilotkit.ai/blog/generative-ui-explained — "the agent generates raw HTML, we render it inside a sandboxed double iframe" — no mention of feedback channel from iframe to agent |
