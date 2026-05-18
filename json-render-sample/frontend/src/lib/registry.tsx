"use client";
import React from "react";
import { defineRegistry } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";
import { catalog } from "./catalog";

// --- Custom component implementations ---

function Metric({ props }: { props: { label: string; value: string; trend: string | null; format?: string } }) {
  const trendColor = props.trend === "up" ? "text-green-600" : props.trend === "down" ? "text-red-600" : "text-slate-500";
  const trendIcon = props.trend === "up" ? "↑" : props.trend === "down" ? "↓" : "→";
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50">
      <span className="text-sm text-slate-600">{props.label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xl font-bold ${trendColor}`}>{props.value}</span>
        <span className={`text-sm ${trendColor}`}>{trendIcon}</span>
      </div>
    </div>
  );
}

function BarChart({ props }: { props: { title: string; data: Array<{ label: string; value: number }> } }) {
  const data = props.data || [];
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 mb-3">{props.title}</h4>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-20 truncate">{d.label}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
            <span className="text-xs font-medium text-slate-700 w-12 text-right">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Registry: predefined shadcn + custom ---

export const { registry } = defineRegistry(catalog, {
  components: {
    // Predefined shadcn/ui renderers
    Card: shadcnComponents.Card,
    Stack: shadcnComponents.Stack,
    Grid: shadcnComponents.Grid,
    Heading: shadcnComponents.Heading,
    Text: shadcnComponents.Text,
    Button: shadcnComponents.Button,
    Input: shadcnComponents.Input,
    Select: shadcnComponents.Select,
    Badge: shadcnComponents.Badge,
    Alert: shadcnComponents.Alert,
    Separator: shadcnComponents.Separator,
    Table: shadcnComponents.Table,
    Progress: shadcnComponents.Progress,
    Tabs: shadcnComponents.Tabs,
    Avatar: shadcnComponents.Avatar,
    Skeleton: shadcnComponents.Skeleton,

    // Custom implementations
    Metric: Metric as any,
    BarChart: BarChart as any,
  },
  actions: {
    navigate: async (params) => {
      console.log("Navigate to:", params?.path);
    },
    refresh: async () => {
      console.log("Refresh triggered");
    },
  },
});
