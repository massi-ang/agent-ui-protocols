import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostStyleVariables,
  applyHostFonts,
} from "@modelcontextprotocol/ext-apps";

const root = document.getElementById("root")!;

function render(data: any) {
  const total = data.accounts.reduce((s: number, a: any) => s + a.balance, 0);

  const accountsHtml = data.accounts
    .map((a: any) => `
      <div class="account">
        <div class="acc-name">${a.name} <span class="acc-num">${a.number}</span></div>
        <div class="acc-balance">$${a.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
        ${a.apy ? `<div class="acc-apy">${a.apy} APY</div>` : ""}
      </div>`)
    .join("");

  const txHtml = data.transactions
    .map((t: any) => `
      <tr>
        <td>${t.date}</td>
        <td>${t.description}</td>
        <td class="${t.amount >= 0 ? "positive" : "negative"}">
          ${t.amount >= 0 ? "+" : ""}$${Math.abs(t.amount).toFixed(2)}
        </td>
        <td><span class="badge">${t.category}</span></td>
      </tr>`)
    .join("");

  const maxSpend = Math.max(...Object.values(data.spending) as number[]);
  const spendingHtml = Object.entries(data.spending)
    .map(([cat, amt]) => `
      <div class="spend-row">
        <span class="spend-label">${cat}</span>
        <div class="spend-bar"><div class="spend-fill" style="width:${((amt as number) / maxSpend) * 100}%"></div></div>
        <span class="spend-amt">$${amt}</span>
      </div>`)
    .join("");

  root.innerHTML = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--font-sans, -apple-system, sans-serif); padding: 20px; background: var(--color-background-primary, #f8fafc); color: var(--color-text-primary, #1e293b); }
      .header { margin-bottom: 20px; }
      .header h1 { font-size: 1.3em; font-weight: 700; }
      .total { font-size: 2em; font-weight: 800; margin-top: 4px; }
      .section { background: var(--color-background-secondary, white); border-radius: var(--border-radius-lg, 12px); padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
      .section h2 { font-size: 0.9em; font-weight: 600; color: var(--color-text-secondary, #64748b); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
      .account { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--color-border-primary, #f1f5f9); }
      .account:last-child { border-bottom: none; }
      .acc-name { font-weight: 600; }
      .acc-num { color: var(--color-text-secondary, #94a3b8); font-size: 0.8em; font-weight: 400; }
      .acc-balance { font-weight: 700; font-size: 1.1em; }
      .acc-apy { font-size: 0.75em; color: #16a34a; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; font-size: 0.85em; }
      th, td { padding: 8px 6px; text-align: left; }
      th { color: var(--color-text-secondary, #94a3b8); font-weight: 500; border-bottom: 1px solid var(--color-border-primary, #f1f5f9); }
      .positive { color: #16a34a; font-weight: 600; }
      .negative { color: #dc2626; font-weight: 600; }
      .badge { background: var(--color-background-primary, #f1f5f9); padding: 2px 8px; border-radius: 10px; font-size: 0.8em; }
      .spend-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
      .spend-label { width: 100px; font-size: 0.85em; font-weight: 500; }
      .spend-bar { flex: 1; height: 8px; background: var(--color-background-primary, #f1f5f9); border-radius: 4px; overflow: hidden; }
      .spend-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 4px; }
      .spend-amt { font-size: 0.85em; font-weight: 600; width: 60px; text-align: right; }
    </style>
    <div class="header">
      <h1>🏦 Bank Account</h1>
      <div class="total">$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="section">
      <h2>Accounts</h2>
      ${accountsHtml}
    </div>
    <div class="section">
      <h2>Recent Transactions</h2>
      <table><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Category</th></tr></thead><tbody>${txHtml}</tbody></table>
    </div>
    <div class="section">
      <h2>Monthly Spending</h2>
      ${spendingHtml}
    </div>
  `;
}

// --- MCP App lifecycle ---
const app = new App({ name: "Bank Account App", version: "1.0.0" });

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
