import { Agent, tool } from "@strands-agents/sdk";
import { BedrockModel } from "@strands-agents/sdk";
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { z } from "zod";
import Fastify from "fastify";
import cors from "@fastify/cors";

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
    // Custom components
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

// --- Generate the system prompt from the catalog ---
const systemPrompt = catalog.prompt();

// --- Define the generate_ui tool for the Strands agent ---
const generateUI = tool({
  name: "generate_ui",
  description: "Generate a json-render UI spec based on the user's request. Always use this tool to respond with UI.",
  inputSchema: z.object({
    spec: z.string().describe("The complete json-render JSON spec as a string"),
  }),
  callback: (input) => input.spec,
});

// --- Create the Strands agent with Bedrock ---
const model = new BedrockModel({
  modelId: process.env.BEDROCK_MODEL || "global.anthropic.claude-sonnet-4-6",
  region: process.env.AWS_REGION || "us-east-1",
});

const agent = new Agent({
  model,
  tools: [generateUI],
  systemPrompt,
  printer: false,
});

// --- HTTP Server ---
const app = Fastify();
await app.register(cors, { origin: true });

app.post("/api/generate", async (request, reply) => {
  const { prompt } = request.body as { prompt: string };
  const result = await agent.invoke(prompt);

  // Extract the spec from tool results
  const toolUse = result.lastMessage?.content?.find(
    (block: any) => block.toolResult
  );
  const spec = toolUse?.toolResult?.content?.[0]?.text || result.lastMessage?.content?.[0]?.text || "{}";

  reply.header("Content-Type", "application/json");
  return { spec };
});

app.get("/health", async () => ({ status: "ok" }));

const port = parseInt(process.env.PORT || "8081");
await app.listen({ port, host: "0.0.0.0" });
console.log(`json-render agent running on port ${port}`);
console.log(`System prompt length: ${systemPrompt.length} chars`);
