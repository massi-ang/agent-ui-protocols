import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostStyleVariables,
  applyHostFonts,
} from "@modelcontextprotocol/ext-apps";

const root = document.getElementById("root")!;

const CONDITION_ICONS: Record<string, string> = {
  Sunny: "☀️", Clear: "☀️", "Partly Cloudy": "⛅", Cloudy: "☁️", Rain: "🌧️", Fair: "🌤️",
};

function render(data: any) {
  const icon = CONDITION_ICONS[data.conditions] || "🌡️";
  const forecastHtml = (data.forecast || [])
    .map((d: any) => `
      <div class="forecast-day">
        <div class="day">${d.day}</div>
        <div class="icon">${CONDITION_ICONS[d.conditions] || "🌡️"}</div>
        <div class="temps"><span class="high">${d.high}°</span> <span class="low">${d.low}°</span></div>
      </div>`)
    .join("");

  root.innerHTML = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--font-sans, -apple-system, sans-serif); padding: 20px; background: var(--color-background-primary, #f8fafc); color: var(--color-text-primary, #1e293b); }
      .card { background: var(--color-background-secondary, white); border-radius: var(--border-radius-lg, 16px); padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
      .city { font-size: 1.4em; font-weight: 700; margin-bottom: 4px; }
      .conditions { color: var(--color-text-secondary, #64748b); font-size: 0.9em; }
      .current { display: flex; align-items: center; gap: 16px; margin: 16px 0; }
      .temp { font-size: 3em; font-weight: 800; }
      .icon-big { font-size: 3em; }
      .details { display: flex; gap: 20px; margin: 12px 0; font-size: 0.85em; color: var(--color-text-secondary, #64748b); }
      .forecast { display: flex; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--color-border-primary, #e2e8f0); }
      .forecast-day { flex: 1; text-align: center; padding: 10px 6px; border-radius: var(--border-radius-md, 8px); background: var(--color-background-primary, #f8fafc); }
      .forecast-day .day { font-size: 0.8em; font-weight: 600; margin-bottom: 4px; }
      .forecast-day .icon { font-size: 1.4em; margin: 4px 0; }
      .forecast-day .high { font-weight: 700; }
      .forecast-day .low { color: var(--color-text-secondary, #94a3b8); }
    </style>
    <div class="card">
      <div class="city">${data.city}</div>
      <div class="conditions">${data.conditions}</div>
      <div class="current">
        <span class="icon-big">${icon}</span>
        <span class="temp">${data.temp}°C</span>
      </div>
      <div class="details">
        <span>💧 ${data.humidity}%</span>
        <span>💨 ${data.wind}</span>
      </div>
      <div class="forecast">${forecastHtml}</div>
    </div>
  `;
}

// --- MCP App lifecycle ---
const app = new App({ name: "Weather App", version: "1.0.0" });

app.ontoolinput = (params) => {
  const data = params.structuredContent?.data;
  if (data) render(data);
};

app.ontoolresult = (result) => {
  const data = (result as any).structuredContent?.data;
  if (data) render(data);
};

app.onhostcontextchanged = (ctx) => {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.safeAreaInsets) {
    const { top, right, bottom, left } = ctx.safeAreaInsets;
    document.body.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
  }
};

app.onteardown = async () => ({});

await app.connect(new PostMessageTransport());
