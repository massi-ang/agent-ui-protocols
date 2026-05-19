import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostStyleVariables,
  applyHostFonts,
} from "@modelcontextprotocol/ext-apps";

const root = document.getElementById("root")!;

function render(prompt: string) {
  root.innerHTML = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--font-sans, -apple-system, sans-serif); padding: 20px; background: var(--color-background-primary, #fefefe); color: var(--color-text-primary, #333); }
      h2 { font-size: 1.3em; font-weight: 700; margin-bottom: 4px; }
      .subtitle { color: var(--color-text-secondary, #666); margin-bottom: 20px; font-size: 0.9em; }
      .field { margin-bottom: 16px; }
      label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.85em; color: var(--color-text-secondary, #444); }
      select, input[type="number"] { width: 100%; padding: 8px 12px; border: 1px solid var(--color-border-primary, #ddd); border-radius: 6px; font-size: 0.9em; background: var(--color-background-secondary, white); color: var(--color-text-primary, #333); }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .chip { padding: 6px 14px; border: 1px solid var(--color-border-primary, #ddd); border-radius: 20px; font-size: 0.85em; cursor: pointer; transition: all 0.2s; user-select: none; }
      .chip:hover { border-color: #7c3aed; }
      .chip.selected { background: #7c3aed; color: white; border-color: #7c3aed; }
      .btn { margin-top: 20px; width: 100%; padding: 12px; background: #7c3aed; color: white; border: none; border-radius: 8px; font-size: 1em; font-weight: 600; cursor: pointer; }
      .btn:hover { background: #6d28d9; }
      .result { margin-top: 16px; padding: 12px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; font-size: 0.85em; display: none; }
    </style>
    <h2>🍳 Recipe Maker</h2>
    <p class="subtitle">${prompt || "Tell me your preferences and I'll suggest a recipe!"}</p>
    <div class="field">
      <label>Cuisine</label>
      <select id="cuisine">
        <option value="">Select cuisine...</option>
        <option>Italian</option><option>Mexican</option><option>Japanese</option>
        <option>Indian</option><option>Thai</option><option>French</option>
        <option>Mediterranean</option><option>Chinese</option><option>American</option>
      </select>
    </div>
    <div class="field">
      <label>Dietary Restrictions</label>
      <div class="chips" id="diet-chips">
        <span class="chip" data-val="vegetarian">🥬 Vegetarian</span>
        <span class="chip" data-val="vegan">🌱 Vegan</span>
        <span class="chip" data-val="gluten-free">🚫 Gluten-Free</span>
        <span class="chip" data-val="dairy-free">🥛 Dairy-Free</span>
        <span class="chip" data-val="keto">🥑 Keto</span>
        <span class="chip" data-val="none">✅ None</span>
      </div>
    </div>
    <div class="field">
      <label>Main Ingredient</label>
      <div class="chips" id="ingredient-chips">
        <span class="chip" data-val="chicken">🍗 Chicken</span>
        <span class="chip" data-val="beef">🥩 Beef</span>
        <span class="chip" data-val="fish">🐟 Fish</span>
        <span class="chip" data-val="tofu">🧈 Tofu</span>
        <span class="chip" data-val="pasta">🍝 Pasta</span>
        <span class="chip" data-val="rice">🍚 Rice</span>
        <span class="chip" data-val="vegetables">🥦 Vegetables</span>
      </div>
    </div>
    <div class="field">
      <label>Servings</label>
      <input type="number" id="servings" value="2" min="1" max="12" />
    </div>
    <div class="field">
      <label>Max Cooking Time</label>
      <select id="time">
        <option value="15">15 min (quick)</option>
        <option value="30" selected>30 min</option>
        <option value="45">45 min</option>
        <option value="60">1 hour</option>
        <option value="120">2 hours (slow cook)</option>
      </select>
    </div>
    <button class="btn" id="submit-btn">🚀 Generate Recipe</button>
    <div class="result" id="result"></div>
  `;

  // Wire up chip toggles
  root.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => chip.classList.toggle("selected"));
  });

  // Submit
  root.querySelector("#submit-btn")!.addEventListener("click", async () => {
    const data = {
      cuisine: (root.querySelector("#cuisine") as HTMLSelectElement).value,
      dietary: [...root.querySelectorAll("#diet-chips .selected")].map((c) => (c as HTMLElement).dataset.val!),
      ingredient: [...root.querySelectorAll("#ingredient-chips .selected")].map((c) => (c as HTMLElement).dataset.val!),
      servings: parseInt((root.querySelector("#servings") as HTMLInputElement).value),
      maxTime: parseInt((root.querySelector("#time") as HTMLSelectElement).value),
    };

    const el = root.querySelector("#result") as HTMLElement;
    el.style.display = "block";
    el.innerHTML = `⏳ Generating recipe...`;

    try {
      const result = await app.callServerTool({ name: "generate_recipe", arguments: data });
      const text = (result as any).content?.[0]?.text;
      const recipe = text ? JSON.parse(text) : null;
      if (recipe) {
        el.innerHTML = `
          <h3 style="margin:0 0 8px;font-size:1.1em;">🍽️ ${recipe.name}</h3>
          <div style="font-size:0.8em;color:var(--color-text-secondary,#666);margin-bottom:10px;">
            ${recipe.cuisine} • ${recipe.servings} servings • ${recipe.prepTime} • ${recipe.dietary}
          </div>
          <div style="margin-bottom:8px;"><strong>Ingredients:</strong> ${recipe.ingredients.join(", ")}</div>
          <ol style="margin:0;padding-left:18px;font-size:0.9em;">${recipe.steps.map((s: string) => `<li style="margin-bottom:4px;">${s}</li>`).join("")}</ol>
        `;
      }
    } catch (e: any) {
      el.innerHTML = `❌ Error: ${e.message}`;
    }
  });
}

// --- MCP App lifecycle ---
const app = new App({ name: "Recipe App", version: "1.0.0" });

app.ontoolinput = (params) => {
  render(params.arguments?.prompt as string || "");
};

app.ontoolresult = () => {};

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
