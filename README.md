# Agent-UI Protocols Samples

Practical implementations of AG-UI, A2UI, json-render, MCP Apps, and Open Generative UI protocols using Amazon Bedrock for inference.

## 📦 What's Included

### 1. AG-UI Sample (`ag-ui-sample/`)
- **Frontend**: CopilotKit + Next.js + React
- **Backend**: Strands Agents + Bedrock
- **Model**: Amazon Bedrock (Claude)
- **Demo**: Controlled generative UI with:
  - 📊 Server-side data tools (weather, profiles, charts)
  - 🎮 Client-side UI tools (sidebar, theme, counter, notifications)
  - 🔄 Bidirectional state management (agent reads & modifies UI state)

### 2. A2UI Sample (`a2ui-sample/`)
- **Frontend**: Svelte + A2UI Renderer
- **Backend**: Strands Agents + A2UI SDK
- **Model**: Amazon Bedrock (Claude)
- **Demo**: Dynamic form generation with declarative UI

### 3. json-render Sample (`json-render-sample/`)
- **Frontend**: React + json-render renderer
- **Backend**: Strands Agents + Bedrock
- **Model**: Amazon Bedrock (Claude)
- **Demo**: Schema-constrained generative UI with Zod catalogs

### 4. MCP Apps Sample (`mcp-apps-sample/`)
- **Server**: MCP Server with UI resources
- **Model**: Amazon Bedrock (Claude)
- **Client**: Use VS Code, Claude Desktop, or any MCP-compatible client
- **Demo**: Interactive data visualization app

### 5. Open Generative UI Sample (`open-generative-ui-sample/`)
- **Frontend**: CopilotKit v2 + Next.js + React
- **Backend**: Strands Agents + Bedrock
- **Model**: Amazon Bedrock (Claude)
- **Demo**: Open-ended generative UI — agent generates raw HTML visualizations rendered in sandboxed iframes

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- AWS credentials configured
- AWS Bedrock access enabled for Claude models

### Environment Setup

Create `.env` file in the root directory:

```env
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Bedrock Model
BEDROCK_MODEL=global.anthropic.claude-sonnet-4-6

# Optional: Specific endpoint
# AWS_ENDPOINT_URL=https://bedrock-runtime.us-east-1.amazonaws.com
```

### Run All Samples

```bash
# Build and start all containers
docker-compose up --build

# Run in background
docker-compose up -d --build
```

### Access the Samples

- **AG-UI Sample**: http://localhost:3001
- **A2UI Sample**: http://localhost:3002
- **MCP Apps Server**: http://localhost:3003/mcp (SSE endpoint)
- **Open Generative UI**: http://localhost:3004
- **json-render Sample**: http://localhost:3005

### Run Individual Samples

```bash
# AG-UI only
docker-compose up ag-ui-sample

# A2UI only
docker-compose up a2ui-sample

# MCP Apps only
docker-compose up mcp-apps-sample
```

## 📚 Sample Details

### AG-UI Sample

**Controlled Generative UI** - Pre-built components with type-safe data binding and client-side state control.

**Features:**
- 📊 Server-side data tools:
  - Weather tool with loading states
  - User profile cards
  - Chart visualization
- 🎮 Client-side UI tools:
  - Sidebar toggle (open/close navigation)
  - Theme switcher (light/dark mode)
  - Counter control (increment/decrement/set)
  - Notification system (add/clear messages)
  - Panel navigation (main/settings/help)
  - UI reset (restore defaults)
- 🔄 Bidirectional state:
  - Agent reads current UI state via `useCopilotReadable`
  - Agent modifies state via `useCopilotAction`
  - Instant updates without server round-trips

**How it works:**
1. User: "Close sidebar and change to dark theme"
2. Agent reads current UI state
3. Calls `toggle_sidebar({ open: false })`
4. Calls `change_theme({ theme: "dark" })`
5. UI updates instantly (client-side)
6. Pre-built React components render changes

**Try it:**
```
"Show me the weather in San Francisco"
"Close the sidebar"
"Change theme to dark and increment counter"
"Add notification: Meeting at 3pm"
"Switch to settings panel"
"What's the current counter value?"
"If sidebar is closed, open it"
```

### A2UI Sample

**Declarative Generative UI** - Agent generates JSON structure, frontend renders.

**Features:**
- Dynamic form generation
- Contact card creation
- Survey builder
- Agent constructs UI from JSONL spec

**How it works:**
1. Agent generates A2UI JSONL messages
2. Streams `surfaceUpdate`, `dataModelUpdate`, `beginRendering`
3. Svelte renderer interprets and displays
4. Components from ~22 A2UI primitives

**Try it:**
```
"Create a contact form with name, email, and message"
"Build a user profile card for Sarah"
"Generate a survey with 5 questions"
```

### MCP Apps Sample

**Open-ended Generative UI** - Full HTML/JS applications.

**Features:**
- Interactive D3.js chart viewer
- Data table with sorting
- Custom visualization tools
- Complete web apps as responses

**How it works:**
1. MCP server exposes tools with UI resources
2. Agent calls tool (e.g., `create_chart`)
3. Server returns UI resource URL
4. Client renders in sandboxed iframe
5. Bidirectional communication via postMessage

**Connect from VS Code:**
1. Install MCP extension
2. Add server config:
```json
{
  "mcpServers": {
    "agent-ui-samples": {
      "url": "http://localhost:3003/mcp"
    }
  }
}
```

**Try it:**
```
"Create a bar chart of quarterly sales"
"Show me a data table with user information"
"Visualize this data: [1,2,3,4,5]"
```

### Open Generative UI Sample

**Open-ended Generative UI** - Agent generates raw HTML/SVG/Canvas visualizations rendered in sandboxed iframes.

**Features:**
- 🎨 Sandboxed HTML/SVG visualizations (algorithm visualizations, diagrams, simulations)
- 📊 Agent writes complete self-contained HTML documents
- 🔧 Data tools (weather, bank account) feed into visualizations

**How it works:**
1. User sends a prompt via CopilotKit chat UI
2. Strands Agent decides: text response or render a visualization
3. Agent calls `widgetRenderer` tool with generated HTML
4. `useComponent` hook renders HTML in a sandboxed iframe
5. No pre-built components — agent creates everything from scratch

**Try it:**
```
"Show me the weather in Tokyo"
"Show my bank account summary"
"Visualize binary search algorithm"
"Create a pie chart of monthly spending"
"Show a 3D rotating cube"
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│  Sample 1: AG-UI (CopilotKit + Strands)        │
│  ┌──────────────┐         ┌─────────────────┐  │
│  │ Next.js UI   │ ◄─────► │ Strands Agent   │  │
│  │ CopilotKit   │         │ + Bedrock       │  │
│  └──────────────┘         └─────────────────┘  │
│  Port 3001                                      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Sample 2: A2UI (Svelte + Strands)              │
│  ┌──────────────┐         ┌─────────────────┐  │
│  │ Svelte UI    │ ◄─────► │ Strands Agent   │  │
│  │ A2UI Renderer│         │ + Bedrock       │  │
│  └──────────────┘         └─────────────────┘  │
│  Port 3002                                      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Sample 3: json-render (React + Strands)        │
│  ┌──────────────┐         ┌─────────────────┐  │
│  │ React UI     │ ◄─────► │ Strands Agent   │  │
│  │ json-render  │         │ + Bedrock       │  │
│  └──────────────┘         └─────────────────┘  │
│  Port 3005                                      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Sample 4: MCP Apps (Server Only)               │
│  ┌──────────────┐                               │
│  │ MCP Server   │ ◄───── Your Client            │
│  │ + Bedrock    │        (VS Code/Claude)       │
│  └──────────────┘                               │
│  Port 3003                                      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Sample 5: Open Generative UI (CopilotKit v2)   │
│  ┌──────────────┐         ┌─────────────────┐  │
│  │ Next.js UI   │ ◄─────► │ Strands Agent   │  │
│  │ CopilotKit v2│         │ + Bedrock       │  │
│  └──────────────┘         └─────────────────┘  │
│  Port 3004                                      │
└─────────────────────────────────────────────────┘
```

## 🔧 Development

### Modify AG-UI Sample

```bash
cd ag-ui-sample
npm install
npm run dev
```

### Modify A2UI Sample

```bash
cd a2ui-sample/frontend
npm install
npm run dev
```

### Modify MCP Apps Sample

```bash
cd mcp-apps-sample
pip install -r requirements.txt
python server.py
```

## 🐛 Troubleshooting

### Bedrock Access Denied

**Error**: `AccessDeniedException` when calling Bedrock

**Solution**: 
1. Verify Bedrock model access in AWS Console
2. Check IAM permissions include `bedrock:InvokeModel`
3. Confirm model ID is correct for your region

### Docker Build Fails

**Error**: Build context issues

**Solution**:
```bash
# Clean and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Port Already in Use

**Error**: Port 3001/3002/3003 already bound

**Solution**:
```bash
# Change ports in docker-compose.yml
# Or kill existing process
lsof -ti:3001 | xargs kill -9
```

### MCP Client Connection Issues

**Error**: Cannot connect to MCP server

**Solution**:
1. Verify server is running: `curl http://localhost:3003/mcp`
2. Check firewall/network settings
3. Use SSE transport (not stdio)

## 📖 Further Reading

- [AG-UI Protocol](https://docs.ag-ui.com)
- [A2UI Specification](https://a2ui.org)
- [json-render](https://json-render.org)
- [MCP Apps Documentation](https://modelcontextprotocol.io/extensions/apps/overview)
- [Open Generative UI](https://docs.copilotkit.ai/generative-ui)
- [CopilotKit Docs](https://docs.copilotkit.ai)
- [Google ADK](https://google.github.io/adk-docs/)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)

## 🤝 Contributing

Contributions welcome! Each sample is self-contained:
- Add new tools/components
- Improve UI/UX
- Add more Bedrock models
- Enhance error handling

## 📄 License

MIT License - see LICENSE file for details

---

**Live Presentation**: https://eponalab.github.io/agent-ui-protocols/deck-v3.html

**Repository**: https://github.com/EponaLab/agent-ui-protocols
