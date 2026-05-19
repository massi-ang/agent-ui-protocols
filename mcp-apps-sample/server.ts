import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// --- Helper: read built UI file ---
const uiDir = path.resolve(import.meta.dirname!, "..", "dist", "ui", "src");

async function readUi(filename: string): Promise<string> {
  return fs.readFile(path.join(uiDir, filename), "utf-8");
}

// --- Weather data ---
const WEATHER_DATA: Record<string, any> = {
  london: { temp: 14, conditions: "Partly Cloudy", humidity: 72, wind: "12 km/h SW", forecast: [{ day: "Tue", high: 16, low: 11, conditions: "Cloudy" }, { day: "Wed", high: 18, low: 12, conditions: "Partly Cloudy" }, { day: "Thu", high: 15, low: 10, conditions: "Rain" }] },
  tokyo: { temp: 26, conditions: "Sunny", humidity: 55, wind: "8 km/h E", forecast: [{ day: "Tue", high: 28, low: 22, conditions: "Sunny" }, { day: "Wed", high: 27, low: 21, conditions: "Partly Cloudy" }, { day: "Thu", high: 29, low: 23, conditions: "Sunny" }] },
  "new york": { temp: 22, conditions: "Clear", humidity: 45, wind: "15 km/h NW", forecast: [{ day: "Tue", high: 24, low: 18, conditions: "Clear" }, { day: "Wed", high: 21, low: 16, conditions: "Cloudy" }, { day: "Thu", high: 23, low: 17, conditions: "Sunny" }] },
};

// --- Bank data ---
const BANK_DATA = {
  accounts: [
    { name: "Checking", balance: 4285.5, number: "****4821" },
    { name: "Savings", balance: 12740.0, number: "****3390", apy: "4.25%" },
    { name: "Investment", balance: 38920.75, number: "****7714" },
  ],
  transactions: [
    { date: "2024-06-05", description: "Grocery Store", amount: -82.4, category: "Food" },
    { date: "2024-06-04", description: "Salary Deposit", amount: 3500.0, category: "Income" },
    { date: "2024-06-03", description: "Electric Bill", amount: -145.0, category: "Utilities" },
    { date: "2024-06-02", description: "Restaurant", amount: -56.8, category: "Dining" },
    { date: "2024-06-01", description: "Subscription", amount: -14.99, category: "Entertainment" },
  ],
  spending: { Housing: 1200, Food: 380, Transport: 145, Entertainment: 210, Health: 90 },
};

// --- Resource URIs ---
const WEATHER_URI = "ui://weather/app.html";
const BANK_URI = "ui://bank/app.html";
const RECIPE_URI = "ui://recipe/app.html";

// --- Recipe generation via Bedrock ---
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
const MODEL_ID = "global.anthropic.claude-sonnet-4-6";

async function generateRecipe(prefs: { cuisine: string; dietary: string[]; ingredient: string[]; servings: number; maxTime: number }) {
  const prompt = `Generate a recipe with these preferences:
- Cuisine: ${prefs.cuisine || "any"}
- Dietary restrictions: ${prefs.dietary.length ? prefs.dietary.join(", ") : "none"}
- Main ingredients: ${prefs.ingredient.length ? prefs.ingredient.join(", ") : "chef's choice"}
- Servings: ${prefs.servings}
- Max cooking time: ${prefs.maxTime} minutes

Respond ONLY with valid JSON (no markdown) in this exact format:
{"name":"...","cuisine":"...","servings":N,"prepTime":"X min","dietary":"...","ingredients":["..."],"steps":["..."]}`;

  const resp = await bedrock.send(new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  }));

  const body = JSON.parse(new TextDecoder().decode(resp.body));
  const text = body.content?.[0]?.text || "{}";
  return JSON.parse(text);
}

// --- Factory: creates a fully configured McpServer instance ---
function createServer(): McpServer {
  const server = new McpServer({ name: "agent-ui-mcp-sample", version: "1.0.0" });

  // Resources
  registerAppResource(server, "Weather App", WEATHER_URI, { mimeType: RESOURCE_MIME_TYPE }, async () => {
    const html = await readUi("weather-app.html");
    return { contents: [{ uri: WEATHER_URI, mimeType: RESOURCE_MIME_TYPE, text: html }] };
  });

  registerAppResource(server, "Bank Account App", BANK_URI, { mimeType: RESOURCE_MIME_TYPE }, async () => {
    const html = await readUi("bank-app.html");
    return { contents: [{ uri: BANK_URI, mimeType: RESOURCE_MIME_TYPE, text: html }] };
  });

  registerAppResource(server, "Recipe App", RECIPE_URI, { mimeType: RESOURCE_MIME_TYPE }, async () => {
    const html = await readUi("recipe-app.html");
    return { contents: [{ uri: RECIPE_URI, mimeType: RESOURCE_MIME_TYPE, text: html }] };
  });

  // App Tools
  registerAppTool(server, "show_weather", {
    description: "Show an interactive weather dashboard for a city with current conditions and 3-day forecast",
    inputSchema: { city: z.string().describe("City name (e.g. London, Tokyo, New York)") },
    _meta: { ui: { resourceUri: WEATHER_URI } },
  }, async (args) => {
    const city = (args.city as string).toLowerCase();
    const weather = WEATHER_DATA[city] || { temp: 20, conditions: "Fair", humidity: 60, wind: "10 km/h", forecast: [{ day: "Tue", high: 22, low: 15, conditions: "Fair" }, { day: "Wed", high: 21, low: 14, conditions: "Cloudy" }, { day: "Thu", high: 23, low: 16, conditions: "Sunny" }] };
    return {
      content: [{ type: "text" as const, text: `Weather for ${args.city}: ${weather.temp}°C, ${weather.conditions}` }],
      structuredContent: { data: { city: args.city, ...weather } },
    };
  });

  registerAppTool(server, "show_bank_account", {
    description: "Show an interactive bank account dashboard with balances, recent transactions, and spending breakdown",
    inputSchema: {},
    _meta: { ui: { resourceUri: BANK_URI } },
  }, async () => {
    const total = BANK_DATA.accounts.reduce((s, a) => s + a.balance, 0);
    return {
      content: [{ type: "text" as const, text: `Bank summary: Total balance $${total.toFixed(2)} across ${BANK_DATA.accounts.length} accounts` }],
      structuredContent: { data: BANK_DATA },
    };
  });

  registerAppTool(server, "collect_recipe_preferences", {
    description: "Show an interactive form where the user selects cuisine, dietary restrictions, ingredients, and serving size.",
    inputSchema: { prompt: z.string().optional().describe("Optional message to display to the user") },
    _meta: { ui: { resourceUri: RECIPE_URI } },
  }, async (args) => {
    return {
      content: [{ type: "text" as const, text: "Showing recipe preferences form to user." }],
      structuredContent: { prompt: args.prompt || "" },
    };
  });

  // App-only tool: UI calls this to generate a recipe from preferences
  registerAppTool(server, "generate_recipe", {
    description: "Generate a recipe based on user preferences",
    inputSchema: {
      cuisine: z.string(),
      dietary: z.array(z.string()),
      ingredient: z.array(z.string()),
      servings: z.number(),
      maxTime: z.number(),
    },
    _meta: { ui: { resourceUri: RECIPE_URI, visibility: ["app"] } },
  }, async (args) => {
    const recipe = await generateRecipe(args as any);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(recipe) }],
    };
  });

  return server;
}

// --- HTTP Server (Fastify) ---
const PORT = parseInt(process.env.PORT || "3003");

const app = Fastify();
await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "mcp-session-id"],
  exposedHeaders: ["mcp-session-id"],
});

const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

// Don't parse body for /mcp — let StreamableHTTPServerTransport read the raw stream
app.removeAllContentTypeParsers();
app.addContentTypeParser("*", (_req: any, _payload: any, done: any) => done(null));

// Log all requests
app.addHook("onRequest", (request, _reply, done) => {
  console.log(`📥 ${request.method} ${request.url} | session: ${request.headers["mcp-session-id"] || "new"}`);
  done();
});

app.all("/mcp", async (request, reply) => {
  const sessionId = request.headers["mcp-session-id"] as string | undefined;

  if (request.method === "POST") {
    if (sessionId && sessions.has(sessionId)) {
      const { transport } = sessions.get(sessionId)!;
      reply.hijack();
      await transport.handleRequest(request.raw, reply.raw);
    } else {
      // New session — fresh server + transport
      const mcpServer = createServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };
      await mcpServer.connect(transport);
      reply.hijack();
      await transport.handleRequest(request.raw, reply.raw);
      // Store after handling so sessionId is assigned
      if (transport.sessionId) sessions.set(transport.sessionId, { server: mcpServer, transport });
    }
    return;
  }

  if (request.method === "GET" && sessionId && sessions.has(sessionId)) {
    reply.hijack();
    await sessions.get(sessionId)!.transport.handleRequest(request.raw, reply.raw);
    return;
  }

  if (request.method === "DELETE" && sessionId && sessions.has(sessionId)) {
    reply.hijack();
    await sessions.get(sessionId)!.transport.handleRequest(request.raw, reply.raw);
    sessions.delete(sessionId);
    return;
  }

  reply.status(400).send({ error: "Bad request" });
});

await app.listen({ port: PORT, host: "0.0.0.0" });
console.log(`🚀 MCP Apps Server (TypeScript) on port ${PORT}`);
console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
