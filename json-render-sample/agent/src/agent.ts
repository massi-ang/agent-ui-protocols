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
    ForecastDay: {
      props: z.object({
        day: z.string().describe("Weekday name e.g. Tuesday"),
        conditions: z.string().describe("Weather conditions e.g. Sunny, Cloudy, Rain"),
        high: z.number(),
        low: z.number(),
      }),
      description: "Single day weather forecast card with icon, day name, and high/low temps",
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

// --- Tools ---
let lastSpec = "{}";

const getWeather = tool({
  name: "get_weather",
  description: "Get current weather for a city. Returns temperature, conditions, humidity, and forecast.",
  inputSchema: z.object({
    city: z.string().describe("City name"),
  }),
  callback: (input) => {
    const data: Record<string, any> = {
      london: { temp: 14, conditions: "Partly Cloudy", humidity: 72, wind: "12 km/h SW", forecast: [{ day: "Tuesday", high: 16, low: 11, conditions: "Cloudy" }, { day: "Wednesday", high: 18, low: 12, conditions: "Partly Cloudy" }, { day: "Thursday", high: 15, low: 10, conditions: "Rain" }] },
      tokyo: { temp: 26, conditions: "Sunny", humidity: 55, wind: "8 km/h E", forecast: [{ day: "Tuesday", high: 28, low: 22, conditions: "Sunny" }, { day: "Wednesday", high: 27, low: 21, conditions: "Partly Cloudy" }, { day: "Thursday", high: 29, low: 23, conditions: "Sunny" }] },
      "new york": { temp: 22, conditions: "Clear", humidity: 45, wind: "15 km/h NW", forecast: [{ day: "Tuesday", high: 24, low: 18, conditions: "Clear" }, { day: "Wednesday", high: 21, low: 16, conditions: "Cloudy" }, { day: "Thursday", high: 23, low: 17, conditions: "Sunny" }] },
    };
    const city = input.city.toLowerCase();
    const weather = data[city] || { temp: 20, conditions: "Fair", humidity: 60, wind: "10 km/h", forecast: [{ day: "Tuesday", high: 22, low: 15, conditions: "Fair" }, { day: "Wednesday", high: 21, low: 14, conditions: "Cloudy" }, { day: "Thursday", high: 23, low: 16, conditions: "Sunny" }] };
    return JSON.stringify({ city: input.city, ...weather });
  },
});

const getBankAccount = tool({
  name: "get_bank_account",
  description: "Get bank account summary including balances, recent transactions, and spending breakdown.",
  inputSchema: z.object({}),
  callback: () => JSON.stringify({
    accounts: [
      { name: "Checking", balance: 4285.50, number: "****4821" },
      { name: "Savings", balance: 12740.00, number: "****3390", apy: "4.25%" },
      { name: "Investment", balance: 38920.75, number: "****7714" },
    ],
    recent_transactions: [
      { date: "2024-06-05", description: "Grocery Store", amount: -82.40, category: "Food" },
      { date: "2024-06-04", description: "Salary Deposit", amount: 3500.00, category: "Income" },
      { date: "2024-06-03", description: "Electric Bill", amount: -145.00, category: "Utilities" },
      { date: "2024-06-02", description: "Restaurant", amount: -56.80, category: "Dining" },
      { date: "2024-06-01", description: "Subscription", amount: -14.99, category: "Entertainment" },
    ],
    monthly_spending: { Housing: 1200, Food: 380, Transport: 145, Entertainment: 210, Health: 90 },
  }),
});

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
  tools: [getWeather, getBankAccount, generateUI],
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
