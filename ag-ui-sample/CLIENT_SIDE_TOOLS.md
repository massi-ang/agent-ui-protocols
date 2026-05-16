# AG-UI Client-Side State Control

This document explains the powerful client-side state features added to the AG-UI sample.

## Overview

The enhanced AG-UI sample demonstrates **two types of tools**:

1. **Server-side Data Tools** - Fetch external data (weather, profiles)
2. **Client-side UI Tools** - Directly manipulate local React state (NEW!)

## Why Client-Side Tools Matter

### Traditional Approach (Server-side only)
```
User: "Close the sidebar"
  ↓ 
Agent → Server API call → Database update → Response
  ↓
Client receives response → Re-render
```
**Latency**: ~500ms-2s

### AG-UI Approach (Client-side)
```
User: "Close the sidebar"
  ↓
Agent → Local tool call → React setState
  ↓
Instant UI update
```
**Latency**: ~10-50ms ⚡

## Implementation

### 1. Define UI State

```typescript
const [uiState, setUiState] = useState({
  sidebarOpen: true,
  theme: 'light' as 'light' | 'dark',
  counter: 0,
  notifications: [] as string[],
  activePanel: 'main' as 'main' | 'settings' | 'help',
});
```

### 2. Make State Readable by Agent

```typescript
useCopilotReadable({
  description: 'Current UI state including sidebar, theme, counter, and active panel',
  value: uiState,
});
```

Now the agent can see:
- Is the sidebar open?
- What theme is active?
- What's the counter value?
- Which panel is displayed?

### 3. Create Client-Side Tools

```typescript
// Toggle sidebar
useCopilotAction({
  name: 'toggle_sidebar',
  description: 'Toggle the sidebar open or closed',
  parameters: [{
    name: 'open',
    type: 'boolean',
    description: 'True to open, false to close',
    required: false,
  }],
  handler: async ({ open }) => {
    const newState = open !== undefined ? open : !uiState.sidebarOpen;
    setUiState(prev => ({ ...prev, sidebarOpen: newState }));
    return `Sidebar ${newState ? 'opened' : 'closed'}`;
  },
});
```

### 4. Render Based on State

```typescript
{uiState.sidebarOpen && (
  <div className={`sidebar ${uiState.theme === 'dark' ? 'dark' : 'light'}`}>
    {/* Sidebar content */}
  </div>
)}
```

## Available Client-Side Tools

### 1. Sidebar Control
```typescript
toggle_sidebar({ open?: boolean })
```
- Open/close navigation sidebar
- If `open` not provided, toggles current state

**Examples:**
- "Close the sidebar"
- "Open sidebar"
- "Toggle sidebar"

### 2. Theme Switcher
```typescript
change_theme({ theme: 'light' | 'dark' })
```
- Switch between light and dark modes
- Updates entire UI color scheme

**Examples:**
- "Change theme to dark"
- "Switch to light mode"
- "Enable dark theme"

### 3. Counter Control
```typescript
update_counter({ action: 'increment' | 'decrement' | 'set', value?: number })
```
- Increment: Add 1
- Decrement: Subtract 1
- Set: Set specific value

**Examples:**
- "Increment counter"
- "Decrease counter"
- "Set counter to 100"

### 4. Notification System
```typescript
add_notification({ message: string })
clear_notifications()
```
- Add notification to UI
- Clear all notifications

**Examples:**
- "Add notification: Meeting at 3pm"
- "Show notification saying hello"
- "Clear all notifications"

### 5. Panel Navigation
```typescript
switch_panel({ panel: 'main' | 'settings' | 'help' })
```
- Switch active view
- Updates navigation highlighting

**Examples:**
- "Switch to settings"
- "Go to help panel"
- "Show main view"

### 6. UI Reset
```typescript
reset_ui()
```
- Reset all state to defaults
- Clear all cards and notifications

**Examples:**
- "Reset UI"
- "Restore defaults"
- "Clear everything"

## Context-Aware Actions

Because the agent can **read** state via `useCopilotReadable`, it can make intelligent decisions:

### Example 1: Conditional Actions
```
User: "If the counter is above 10, reset it"

Agent thinks:
1. Read current state → counter = 15
2. Check condition → 15 > 10 ✓
3. Call reset_ui()
```

### Example 2: State-Based Responses
```
User: "What's the current theme?"

Agent thinks:
1. Read current state → theme = 'dark'
2. Respond: "You're currently using dark mode"
```

### Example 3: Smart Combinations
```
User: "Close sidebar and switch to dark theme"

Agent thinks:
1. Read current state → sidebarOpen = true
2. Call toggle_sidebar({ open: false })
3. Call change_theme({ theme: 'dark' })
```

## Benefits Over Server-Side Only

| Feature | Client-Side Tools | Server-Side Only |
|---------|-------------------|------------------|
| **Latency** | ~10-50ms | ~500ms-2s |
| **Network Required** | No | Yes |
| **Offline Support** | ✅ Works offline | ❌ Needs connection |
| **Scalability** | ✅ No server load | ⚠️ Server bandwidth |
| **Consistency** | ✅ Immediate | ⚠️ Can be delayed |
| **Cost** | ✅ Free (client CPU) | ⚠️ API calls |

## When to Use Each

### Use Client-Side Tools For:
- ✅ UI state (sidebar, theme, modals)
- ✅ Local counters, toggles, flags
- ✅ Navigation between views
- ✅ UI animations and transitions
- ✅ Temporary state (search filters)

### Use Server-Side Tools For:
- ✅ External data fetching (APIs)
- ✅ Database operations
- ✅ Authentication/authorization
- ✅ Complex computations
- ✅ Persistent state across sessions

## Implementation Patterns

### Pattern 1: Simple Toggle
```typescript
useCopilotAction({
  name: 'toggle_feature',
  handler: async () => {
    setFeatureEnabled(prev => !prev);
    return `Feature ${featureEnabled ? 'enabled' : 'disabled'}`;
  },
});
```

### Pattern 2: With Parameters
```typescript
useCopilotAction({
  name: 'set_value',
  parameters: [{ name: 'value', type: 'number', required: true }],
  handler: async ({ value }) => {
    setValue(value);
    return `Value set to ${value}`;
  },
});
```

### Pattern 3: Conditional Logic
```typescript
useCopilotAction({
  name: 'smart_action',
  handler: async () => {
    if (currentState.someCondition) {
      setStateA('valueA');
    } else {
      setStateB('valueB');
    }
    return 'Action completed based on current state';
  },
});
```

### Pattern 4: Multiple State Updates
```typescript
useCopilotAction({
  name: 'complex_action',
  handler: async () => {
    setUiState(prev => ({
      ...prev,
      field1: 'newValue1',
      field2: 'newValue2',
      field3: prev.field3 + 1,
    }));
    return 'Multiple fields updated';
  },
});
```

## Best Practices

### 1. Always Use Updater Functions
```typescript
// ✅ Good - Uses updater function
setUiState(prev => ({ ...prev, field: newValue }));

// ❌ Bad - Direct mutation
setUiState({ ...uiState, field: newValue });
```

### 2. Return Descriptive Messages
```typescript
// ✅ Good - Clear feedback
return `Sidebar ${newState ? 'opened' : 'closed'}`;

// ❌ Bad - No context
return 'Done';
```

### 3. Keep Tools Focused
```typescript
// ✅ Good - Single responsibility
useCopilotAction({ name: 'toggle_sidebar', ... });
useCopilotAction({ name: 'change_theme', ... });

// ❌ Bad - Does too much
useCopilotAction({ name: 'update_everything', ... });
```

### 4. Make State Readable
```typescript
// ✅ Good - Agent can see current state
useCopilotReadable({
  description: 'Current UI state',
  value: uiState,
});

// ❌ Bad - Agent is blind to state
// (no useCopilotReadable)
```

### 5. Type Everything
```typescript
// ✅ Good - Full type safety
const [uiState, setUiState] = useState<UiState>({...});

interface UiState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  counter: number;
}
```

## Testing Client-Side Tools

### Test Interaction
1. Start the app: `npm run dev`
2. Open CopilotKit sidebar
3. Try commands:
   - "Close sidebar" → Sidebar should close immediately
   - "Change to dark theme" → Theme switches instantly
   - "Increment counter 5 times" → Counter goes up
   - "What's the counter at?" → Agent reads state

### Verify Instant Updates
- No network delay should be visible
- UI updates should feel native
- Multiple tools should chain smoothly

### Check State Persistence
- Refresh page → State resets (expected, no persistence yet)
- To add persistence: Use localStorage in state hooks

## Extending the System

### Add New State Field

1. **Update State Type:**
```typescript
const [uiState, setUiState] = useState({
  // ... existing fields
  myNewField: 'initial value',
});
```

2. **Make It Readable:**
```typescript
useCopilotReadable({
  description: 'Includes myNewField',
  value: uiState,
});
```

3. **Create Tool:**
```typescript
useCopilotAction({
  name: 'update_my_field',
  parameters: [{ name: 'value', type: 'string', required: true }],
  handler: async ({ value }) => {
    setUiState(prev => ({ ...prev, myNewField: value }));
    return `Field updated to: ${value}`;
  },
});
```

4. **Render It:**
```typescript
<div>My Field: {uiState.myNewField}</div>
```

## Conclusion

Client-side tools in AG-UI enable:

✅ **Instant responsiveness** - No server latency  
✅ **Offline capability** - Works without network  
✅ **Better UX** - Native app feel  
✅ **Lower costs** - No API calls for UI state  
✅ **Bidirectional communication** - Agent reads & writes state  

This is a **key differentiator** of AG-UI over other protocols like A2UI and MCP Apps, which require server round-trips or full page reloads for UI updates.

---

**Live Demo**: http://localhost:3001 (after `npm run dev`)  
**Repository**: https://github.com/EponaLab/agent-ui-protocols  
**Presentation**: https://eponalab.github.io/agent-ui-protocols/
