"use client";
import React from "react";
import { defineRegistry } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";
import { catalog } from "./catalog";

// --- Custom component implementations ---

function Metric({ props }: { props: { label: string; value: string; trend: string | null; format?: string } }) {
  const trendColor = props.trend === "up" ? "text-green-600" : props.trend === "down" ? "text-red-600" : "text-slate-500";
  const trendIcon = props.trend === "up" ? "↑" : props.trend === "down" ? "↓" : "";
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
      <p className="text-xs font-medium text-slate-500 mb-1">{props.label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-slate-900">{props.value}</span>
        {trendIcon && <span className={`text-sm font-medium ${trendColor}`}>{trendIcon}</span>}
      </div>
    </div>
  );
}

const conditionIcons: Record<string, string> = {
  sunny: "☀️", clear: "☀️", "partly cloudy": "⛅", cloudy: "☁️",
  rain: "🌧️", snow: "❄️", storm: "⛈️", fog: "🌫️", fair: "🌤️",
};

function ForecastDay({ props }: { props: { day: string; conditions: string; high: number; low: number } }) {
  const icon = conditionIcons[props.conditions.toLowerCase()] || "🌤️";
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
      <span className="text-xs font-medium text-slate-500">{props.day}</span>
      <span className="text-2xl">{icon}</span>
      <div className="flex gap-2 text-sm">
        <span className="font-semibold text-slate-900">{props.high}°</span>
        <span className="text-slate-400">{props.low}°</span>
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
    ForecastDay: ForecastDay as any,
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
