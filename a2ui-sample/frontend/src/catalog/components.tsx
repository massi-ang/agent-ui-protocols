"use client";
import { z } from "zod";
import { createComponentImplementation } from "@a2ui/react/v0_9";

const conditionIcons: Record<string, string> = {
  sunny: "☀️", clear: "☀️", "partly cloudy": "⛅", cloudy: "☁️",
  rain: "🌧️", snow: "❄️", storm: "⛈️", fog: "🌫️", fair: "🌤️",
};

const WeatherCardApi = {
  name: "WeatherCard",
  schema: z.object({
    city: z.string().optional(),
    temperature: z.coerce.number().optional(),
    conditions: z.string().optional(),
    humidity: z.coerce.number().optional(),
    wind: z.string().optional(),
    forecast: z.any().optional(),
  }),
} as const;

export const WeatherCard = createComponentImplementation(WeatherCardApi, ({ props }) => {
  const icon = conditionIcons[(String(props.conditions || "")).toLowerCase()] || "🌤️";
  const forecast: any[] = Array.isArray(props.forecast) ? props.forecast : [];

  return (
    <div style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderRadius: 16, padding: 24, color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{String(props.city || "")}</h3>
          <p style={{ margin: "4px 0 0", opacity: 0.8, fontSize: 14 }}>{String(props.conditions || "")}</p>
        </div>
        <span style={{ fontSize: 40 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 48, fontWeight: 700, marginBottom: 16 }}>{props.temperature}°C</div>
      <div style={{ display: "flex", gap: 16, marginBottom: 20, fontSize: 13, opacity: 0.9 }}>
        <span>💧 {props.humidity}%</span>
        <span>💨 {String(props.wind || "")}</span>
      </div>
      {forecast.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            {forecast.map((day: any, i: number) => (
              <div key={i} style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 8px" }}>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{day.day}</div>
                <div style={{ fontSize: 18, margin: "4px 0" }}>{conditionIcons[(day.conditions || "").toLowerCase()] || "🌤️"}</div>
                <div style={{ fontSize: 12 }}><b>{day.high}°</b> <span style={{ opacity: 0.7 }}>{day.low}°</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

const BankAccountCardApi = {
  name: "BankAccountCard",
  schema: z.object({
    accounts: z.any().optional(),
    transactions: z.any().optional(),
  }),
} as const;

export const BankAccountCard = createComponentImplementation(BankAccountCardApi, ({ props }) => {
  const accounts: any[] = Array.isArray(props.accounts) ? props.accounts : [];
  const transactions: any[] = Array.isArray(props.transactions) ? props.transactions : [];
  const total = accounts.reduce((sum: number, a: any) => sum + (a.balance || 0), 0);

  return (
    <div style={{ background: "linear-gradient(135deg, #059669, #065f46)", borderRadius: 16, padding: 24, color: "#fff" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Bank Account</h3>
      <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>Total Balance</p>
      <div style={{ fontSize: 36, fontWeight: 700, margin: "12px 0 20px" }}>
        ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {accounts.map((acc: any, i: number) => (
          <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>{acc.name}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>${(acc.balance || 0).toLocaleString()}</div>
            {acc.number && <div style={{ fontSize: 10, opacity: 0.6 }}>{acc.number}</div>}
          </div>
        ))}
      </div>
      {transactions.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>Recent Transactions</div>
          {transactions.slice(0, 4).map((tx: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
              <span style={{ opacity: 0.9 }}>{tx.description}</span>
              <span style={{ fontWeight: 600, color: tx.amount > 0 ? "#86efac" : "#fca5a5" }}>
                {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
