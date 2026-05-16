# AG-UI Sample: CopilotKit + Bedrock

Controlled Generative UI demo using CopilotKit with Amazon Bedrock, showcasing both server-side data tools and client-side UI state manipulation.

## Features

### 📊 Server-Side Data Tools
- 🌤️ **Weather Tool**: Pre-built weather card component
- 👤 **Profile Tool**: User profile display
- 📊 **Chart Tool**: Data visualization component
- ⚡ **Real-time Updates**: Loading states and streaming

### 🎮 Client-Side UI Tools (NEW!)
- 🎛️ **Sidebar Control**: Toggle, open, close navigation sidebar
- 🎨 **Theme Switcher**: Change between light/dark modes
- 🔢 **Counter Control**: Increment, decrement, set values
- 🔔 **Notifications**: Add and clear notification messages
- 📱 **Panel Navigation**: Switch between main, settings, help views
- 🔄 **UI Reset**: Reset all state to defaults
- 📖 **State Reading**: Agent can read and react to current UI state

## Architecture

```
┌──────────────────────────────────────────┐
│   Next.js App + CopilotKit UI            │
│   ┌────────────────────────────────────┐ │
│   │  Client-Side State Management      │ │
│   │  - sidebar, theme, counter, etc.   │ │
│   │  - useCopilotReadable (state→AI)  │ │
│   │  - useCopilotAction (AI→state)    │ │
│   └────────────────────────────────────┘ │
│   Port 3001                              │
└────────────┬─────────────────────────────┘
             │
             ↓
┌────────────────────────────────────────────┐
│  CopilotKit Runtime + Bedrock Integration  │
│  - Tool orchestration                      │
│  - LLM inference (Bedrock Claude)          │
└────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: Next.js 14 + React + TypeScript
- **UI Framework**: CopilotKit
- **Agent**: Amazon Bedrock Claude
- **Styling**: Tailwind CSS
- **State**: React Hooks + useCopilotReadable

## Setup

### Local Development

```bash
npm install
npm run dev
```

### Docker

```bash
docker build -t ag-ui-sample .
docker run -p 3001:3001 \
  -e AWS_ACCESS_KEY_ID=xxx \
  -e AWS_SECRET_ACCESS_KEY=xxx \
  -e AWS_REGION=us-east-1 \
  ag-ui-sample
```

## Environment Variables

```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
BEDROCK_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0
```

## Usage Examples

### Server-Side Data Tools

Visit http://localhost:3001 and try:

- "Show me the weather in San Francisco"
- "Display profile for john@example.com"
- "Create a bar chart with values 10, 20, 30"

### Client-Side UI Tools

**Sidebar Control:**
- "Close the sidebar"
- "Open the sidebar"
- "Toggle sidebar"

**Theme Management:**
- "Change theme to dark"
- "Switch to light mode"

**Counter Operations:**
- "Increment the counter"
- "Set counter to 100"
- "Decrease the counter"

**Notifications:**
- "Add notification: Meeting at 3pm"
- "Show notification saying hello"
- "Clear all notifications"

**Navigation:**
- "Switch to settings panel"
- "Go to help section"
- "Show main panel"

**Combined Actions:**
- "Close sidebar, change to dark theme, and increment counter"
- "Reset the UI to default state"

**Context-Aware Actions:**
- "What's the current counter value?" (agent reads state)
- "If counter is above 5, reset it" (conditional actions)

## How It Works

### 1. Server-Side Tools (Data Fetching)

Tools that fetch external data and render pre-built components:

```typescript
useCopilotAction({
  name: "get_weather",
  description: "Get weather for a location",
  parameters: [{ name: "location", type: "string" }],
  handler: async ({ location }) => {
    // Fetch weather data
    const weather = await fetchWeather(location);
    // Update state → triggers React re-render
    setWeatherData(weather);
    return JSON.stringify(weather);
  }
});
```

Result: Pre-built `<WeatherCard>` component renders with data.

### 2. Client-Side Tools (UI Manipulation)

Tools that directly manipulate local React state:

```typescript
useCopilotAction({
  name: "toggle_sidebar",
  description: "Toggle sidebar open/closed",
  parameters: [{ name: "open", type: "boolean", required: false }],
  handler: async ({ open }) => {
    setUiState(prev => ({ 
      ...prev, 
      sidebarOpen: open ?? !prev.sidebarOpen 
    }));
    return `Sidebar ${open ? 'opened' : 'closed'}`;
  }
});
```

Result: Instant UI update, no server round-trip needed!

### 3. State Reading (Bidirectional)

Agent can read current UI state to make informed decisions:

```typescript
useCopilotReadable({
  description: 'Current UI state',
  value: {
    sidebarOpen: true,
    theme: 'dark',
    counter: 42,
    activePanel: 'settings'
  }
});
```

Agent now knows: "The counter is at 42 and we're in dark mode"

### Agent Flow

1. **User**: "Close sidebar and switch to dark theme"
2. **Agent**: Reads current state → decides to call multiple tools
3. **Tool 1**: `toggle_sidebar({ open: false })` → sidebar closes
4. **Tool 2**: `change_theme({ theme: "dark" })` → theme switches
5. **Result**: Both actions execute instantly on client

## Key Files

- `src/app/page.tsx` - Main app with usage examples
- `src/app/api/copilotkit/route.ts` - Backend runtime with Bedrock
- `src/components/Tools.tsx` - **All tool definitions (data + UI)**
- `src/components/WeatherCard.tsx` - Pre-built weather component
- `src/components/ProfileCard.tsx` - Pre-built profile component
- `src/components/ChartCard.tsx` - Pre-built chart component

## UI State Structure

```typescript
{
  sidebarOpen: boolean,     // Navigation sidebar visibility
  theme: 'light' | 'dark',  // UI theme
  counter: number,           // Counter value
  notifications: string[],   // Notification messages
  activePanel: 'main' | 'settings' | 'help'  // Active view
}
```

All state is:
- ✅ Readable by agent via `useCopilotReadable`
- ✅ Modifiable by agent via `useCopilotAction`
- ✅ Type-safe with TypeScript
- ✅ Instantly reflected in UI

## Customization

### Add New Client-Side Tool

```typescript
useCopilotAction({
  name: 'my_ui_action',
  description: 'What this action does',
  parameters: [
    { name: 'param1', type: 'string', required: true }
  ],
  handler: async ({ param1 }) => {
    // Manipulate state
    setUiState(prev => ({ 
      ...prev, 
      myField: param1 
    }));
    return 'Action completed';
  }
});
```

### Add State Field

1. Update `uiState` initial value
2. Add to `useCopilotReadable` value
3. Create tools to manipulate it
4. Update UI to reflect it

### Change Model

Update `BEDROCK_MODEL` env var to any Bedrock model:
- `anthropic.claude-3-5-sonnet-20241022-v2:0` (default)
- `anthropic.claude-3-haiku-20240307-v1:0`
- `anthropic.claude-3-opus-20240229-v1:0`

## Why This Matters

### AG-UI Key Advantages

**1. Instant Updates**
- Client-side tools execute immediately
- No server latency for UI changes
- Feels like native app interaction

**2. Full Control**
- You define every UI element
- Agent can't create arbitrary UI
- Perfect for enterprise/regulated environments

**3. Type Safety**
- All parameters typed
- Compile-time validation
- Fewer runtime errors

**4. Bidirectional Communication**
- Agent reads current state
- Makes context-aware decisions
- "If sidebar is closed, open it before showing help"

**5. Predictable Behavior**
- Pre-defined components
- Consistent UX across sessions
- Easier to test and debug

## AG-UI vs Other Protocols

| Feature | AG-UI (this demo) | A2UI | MCP Apps |
|---------|-------------------|------|----------|
| **UI Definition** | Pre-built React components | JSON structure | Full HTML/JS |
| **Agent Control** | Calls predefined tools | Generates UI spec | Generates complete apps |
| **Type Safety** | ✅ Full | ⚠️ Partial | ❌ None |
| **Client State** | ✅ Direct manipulation | ❌ Limited | ⚠️ Via postMessage |
| **Instant Updates** | ✅ Yes | ⚠️ Streaming | ❌ Iframe reload |
| **Developer Control** | 🟢 Maximum | 🟡 Medium | 🔴 Minimum |
| **Agent Freedom** | 🔴 Limited to tools | 🟡 Within components | 🟢 Full freedom |
| **Best For** | Enterprise, controlled UX | Cross-platform | Rich visualizations |

## Troubleshooting

### State Not Updating

Check that:
1. `setUiState` is called with updater function: `prev => ({ ...prev, field: value })`
2. Tool handler is `async`
3. Tool returns a string (not void)

### Agent Not Reading State

Ensure:
1. `useCopilotReadable` is called at component top-level
2. `value` prop contains current state
3. `description` clearly explains what state represents

### Bedrock Access Denied

**Error**: `AccessDeniedException` when calling Bedrock

**Solution**: 
1. Verify Bedrock model access in AWS Console
2. Check IAM permissions include `bedrock:InvokeModel`
3. Confirm model ID is correct for your region

## Learn More

- [CopilotKit Documentation](https://docs.copilotkit.ai)
- [useCopilotAction API](https://docs.copilotkit.ai/reference/hooks/useCopilotAction)
- [useCopilotReadable API](https://docs.copilotkit.ai/reference/hooks/useCopilotReadable)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [AG-UI Protocol](https://github.com/ag-ui-protocol/ag-ui)
