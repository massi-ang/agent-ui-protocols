import { Agent, tool } from "@strands-agents/sdk";
import { BedrockModel } from "@strands-agents/sdk";
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { z } from "zod";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { eventNames } from "process";
import { Console } from "console";

// --- Define the json-render catalog ---
const catalog = defineCatalog(schema, {
  components: {
    Card: shadcnComponentDefinitions.Card,
    Stack: shadcnComponentDefinitions.Stack,
    Grid: shadcnComponentDefinitions.Grid,
    Heading: shadcnComponentDefinitions.Heading,
    Text: shadcnComponentDefinitions.Text,
    Button: shadcnComponentDefinitions.Button,
    Input: shadcnComponentDefinitions.Input,
    Select: shadcnComponentDefinitions.Select,
    Badge: shadcnComponentDefinitions.Badge,
    Alert: shadcnComponentDefinitions.Alert,
    Separator: shadcnComponentDefinitions.Separator,
    Table: shadcnComponentDefinitions.Table,
    Progress: shadcnComponentDefinitions.Progress,
    Tabs: shadcnComponentDefinitions.Tabs,
    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        trend: z.enum(["up", "down", "flat"]).nullable(),
      }),
      description: "KPI metric display with trend indicator",
    },
    BarChart: {
      props: z.object({
        title: z.string(),
        data: z.array(z.object({ label: z.string(), value: z.number() })),
      }),
      description: "Bar chart visualization",
    },
  },
  actions: {},
});

// --- System prompt ---
const systemPrompt =
  `You are a helpful assistant. When your response would benefit 
from rich visual presentation (dashboards, charts, forms, tables, status cards), 
use the generate_ui tool to render interactive UI components. 
For simple text answers, just respond normally without using the tool.

Examples of when to use UI:
- Weather → Card with temperature, conditions, forecast
- Financial data → Metrics with trends, tables of transactions
- Status/progress → Progress bars, badges, alerts
- Data comparisons → Tables, bar charts
- Forms needed → Input fields, selects, buttons

IMPORTANT RULES:
- When using Tabs, each child panel MUST have a "visible" condition: {"$state": "/activeTab", "eq": "<tab-value>"}
- Set "defaultValue" on Tabs and use {"$bindState": "/activeTab"} for the value prop
- Keep specs simple — avoid deeply nested structures

When you use generate_ui, the spec format is: 
{ "root": "<id>", "elements": { "<id>": { "type": "<Component>", "props": {...}, "children": [...] } } }

` + catalog.prompt();

// --- Tool ---
let lastSpec = "{}";

const generateUI = tool({
  name: "generate_ui",
  description:
    "Render a rich interactive UI when the response benefits from visual presentation. Use for dashboards, charts, forms, status cards, tables — not for simple text answers.",
  inputSchema: z.object({
    spec: z.object({
      root: z.string(),
      elements: z.record(
        z.string(),
        z.object({
          type: z.string(),
          props: z.record(z.string(), z.any()).optional(),
          children: z.array(z.string()).optional(),
        }),
      ),
    }),
  }),
  callback: (input) => {
    lastSpec = JSON.stringify(input.spec);
    return lastSpec;
  },
});

// --- Model ---
const model = new BedrockModel({
  modelId: process.env.BEDROCK_MODEL || "global.anthropic.claude-sonnet-4-6",
  region: process.env.AWS_REGION || "us-east-1",
});

// --- HTTP Server ---
const app = Fastify();
await app.register(cors, { origin: true, methods: ["GET", "POST", "OPTIONS"] });

app.options("/invocations", async (request, reply) => {
  reply.header("Access-Control-Allow-Origin", "*");
  reply.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type");
  reply.status(204).send();
});

const agent = new Agent({
  model,
  tools: [generateUI],
  systemPrompt,
  printer: true,
});
app.post("/invocations", async (request, reply) => {
  const { prompt } = request.body as { prompt: string };

  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  const send = (event: string, data: any) => {
    reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send("status", { message: "Thinking..." });

  for await (const event of agent.stream(prompt)) {
    console.log(event.type);
    if (event.type === "contentBlockEvent") {
      send("text", event.contentBlock);
    }
    if (
      event.type === "modelStreamUpdateEvent" &&
      event.event.type === "modelContentBlockDeltaEvent"
    ) {
      if (event.event.delta.type === "textDelta")
        send("delta", { text: event.event.delta.text });
    }
    if (
      event.type === "modelStreamUpdateEvent" &&
      event.event.type === "modelContentBlockStartEvent"
    ) {
      if (event.event.start?.toolUseId)
        send("status", { message: `Calling  ${event.event.start?.name}` });
    }
    if (event.type === "messageAddedEvent") {
      console.log(event.message.content[0]);
    }
    // if (event.type === "beforeToolCallEvent") {
    //   send("status", { message: `Calling  ${event.tool?.name}` });
    // }
    if (
      event.type === "afterToolCallEvent" &&
      event.tool?.name === "generate_ui"
    ) {
      console.log(event.toolUse);
      if (event.result.content[0].type === "textBlock")
        send("spec", { spec: event.result.content[0].text });
    }
  }

  send("done", { text: "Done" });
  reply.raw.end();
});

app.get("/ping", async () => ({ status: "Healthy" }));

const port = parseInt(process.env.PORT || "8081");
await app.listen({ port, host: "0.0.0.0" });
console.log(`json-render agent running on port ${port}`);
console.log(`System prompt length: ${systemPrompt.length} chars`);
