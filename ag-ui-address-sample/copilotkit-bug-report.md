# 🐛 Bug: useFrontendTool render `args` uses LLM-generated tool call args instead of AG-UI TOOL_CALL_ARGS event data

## ♻️ Reproduction Steps

1. Set up an AG-UI backend agent (using `ag-ui-strands`) with an `args_streamer` configured for a frontend tool. The `args_streamer` enriches the tool call args with server-side data (e.g., address lookup results).

2. Define a `useFrontendTool` on the frontend with a parameter (e.g., `addresses`) that the `args_streamer` populates server-side.

3. When the LLM calls the tool, it generates its own (hallucinated) values for the `addresses` parameter since it's required in the schema.

4. The `args_streamer` correctly overrides these with real data — confirmed by:
   - The `TOOL_CALL_ARGS` event in the CopilotKit dev console showing correct data
   - The `TOOL_CALL_END` event's `toolCallArgs` containing the correct server-enriched values

5. However, the `render` function's `args` parameter contains the **LLM-generated (hallucinated) values**, not the streamed values from `TOOL_CALL_ARGS`.

**Backend (ag-ui-strands with args_streamer):**

```python
async def address_args_streamer(ctx: ToolCallContext):
    args = json.loads(ctx.args_str)
    postcode = args.get("postcode", "")
    addresses = get_addresses_for_postcode(postcode)  # real server-side lookup
    yield json.dumps({"postcode": postcode, "addresses": addresses})
```

**Frontend (useFrontendTool):**

```tsx
useFrontendTool({
  name: 'select_address_for_postcode',
  parameters: z.object({
    postcode: z.string(),
    addresses: z.array(z.object({
      id: z.string(),
      line1: z.string(),
      line2: z.string(),
      city: z.string(),
      postcode: z.string(),
    })),
  }),
  handler: async () => { /* ... */ },
  render: ({ args, status }) => {
    // args.addresses contains LLM hallucinated data, NOT the args_streamer data
    console.log(args)
  },
})
```

## ✅ Expected Behavior

The `render` function's `args` should reflect the data from the `TOOL_CALL_ARGS` and `TOOL_CALL_END` AG-UI protocol events — i.e., the server-enriched args from the `args_streamer`.

The AG-UI protocol's `TOOL_CALL_ARGS` event is the authoritative source for tool call arguments. When an `args_streamer` overrides the LLM-generated args, the render function should use the streamed values.

## ❌ Actual Behavior

The `render` function's `args` contains the LLM-generated tool call arguments from the `MESSAGES_SNAPSHOT`, ignoring the `TOOL_CALL_ARGS` event data entirely.

Evidence from the AG-UI event stream:

**TOOL_CALL_ARGS event (correct, from args_streamer):**

```json
{
  "type": "TOOL_CALL_ARGS",
  "toolCallId": "e2404443-...",
  "delta": "{\"postcode\": \"M1 1AA\", \"addresses\": [{\"id\": \"6\", \"line1\": \"1 Piccadilly\", \"line2\": \"City Centre\", \"city\": \"Manchester\", \"postcode\": \"M1 1AA\"}, {\"id\": \"7\", \"line1\": \"15 Portland Street\", \"line2\": \"City Centre\", \"city\": \"Manchester\", \"postcode\": \"M1 1AA\"}, {\"id\": \"8\", \"line1\": \"42 Deansgate\", \"line2\": \"City Centre\", \"city\": \"Manchester\", \"postcode\": \"M1 1AA\"}, {\"id\": \"9\", \"line1\": \"8 Albert Square\", \"line2\": \"City Centre\", \"city\": \"Manchester\", \"postcode\": \"M1 1AA\"}]}"
}
```

**TOOL_CALL_END (correct):**

```json
{
  "toolCallArgs": {
    "postcode": "M1 1AA",
    "addresses": [
      {"id": "6", "line1": "1 Piccadilly", "line2": "City Centre", "city": "Manchester", "postcode": "M1 1AA"},
      {"id": "7", "line1": "15 Portland Street", "line2": "City Centre", "city": "Manchester", "postcode": "M1 1AA"},
      {"id": "8", "line1": "42 Deansgate", "line2": "City Centre", "city": "Manchester", "postcode": "M1 1AA"},
      {"id": "9", "line1": "8 Albert Square", "line2": "City Centre", "city": "Manchester", "postcode": "M1 1AA"}
    ]
  }
}
```

**But render receives (LLM hallucinated):**

```json
{"postcode": "M1 1AA", "addresses": [{"id": "1", "line1": "1 Piccadilly Gardens", "line2": "", "city": "Manchester", "postcode": "M1 1AA"}, {"id": "2", "line1": "2 Piccadilly Gardens", "line2": "", "city": "Manchester", "postcode": "M1 1AA"}, {"id": "3", "line1": "3 Piccadilly Gardens", "line2": "Apartment 5", "city": "Manchester", "postcode": "M1 1AA"}]}
```

The render `args` is sourced from the tool call within the `MESSAGES_SNAPSHOT` (raw LLM output before args_streamer override), rather than from the `TOOL_CALL_ARGS`/`TOOL_CALL_END` events.

Console log confirms args never includes streamed addresses:

```
RENDER args: {"postcode":"SW1A 1AA"} status: inProgress
RENDER args: {"postcode":"SW1A 1AA"} status: executing
```

## 𝌚 CopilotKit Version

```
@copilotkit/react-core@1.57.1
@copilotkit/react-ui@1.57.1
@copilotkit/runtime@1.57.1

Using: useFrontendTool from '@copilotkit/react-core/v2'
AG-UI backend: ag-ui-strands 0.1.9, ag-ui-protocol 0.1.18
```

## 📄 Logs

Console log from render function:

```
RENDER args: {"postcode":"SW1A 1AA"} status: inProgress
RENDER args: {"postcode":"SW1A 1AA"} status: executing
```

The `addresses` field is never populated in `args` despite being present in the TOOL_CALL_ARGS event visible in the CopilotKit dev console.

No errors in browser console or backend terminal.
