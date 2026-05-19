/**
 * json-render Catalog — uses @json-render/shadcn predefined components
 * plus custom components for domain-specific UI.
 */
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    // --- Predefined shadcn/ui components (from Vercel) ---
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
    Avatar: shadcnComponentDefinitions.Avatar,
    Skeleton: shadcnComponentDefinitions.Skeleton,

    // --- Custom domain components ---
    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        trend: z.enum(["up", "down", "flat"]).nullable(),
        format: z.enum(["currency", "percent", "number"]).optional(),
      }),
      description: "KPI metric display with trend indicator",
    },
    ForecastDay: {
      props: z.object({
        day: z.string(),
        conditions: z.string(),
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
      description: "Simple bar chart visualization",
    },
  },
  actions: {
    navigate: {
      params: z.object({ path: z.string() }),
      description: "Navigate to a page",
    },
    refresh: {
      description: "Refresh data",
    },
  },
});

export type AppCatalog = typeof catalog;
