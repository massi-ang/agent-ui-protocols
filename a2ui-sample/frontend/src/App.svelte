<script lang="ts">
  let message = '';
  let uiData: any[] = [];
  let textResponse = '';
  let loading = false;
  let error = '';
  let protocolLog: {time: string, data: any}[] = [];
  let showTooltips = true;
  let dataModel: Record<string, any> = {};
  $: dataModelVersion = JSON.stringify(dataModel);

  // Get a value from the data model by path (e.g. "/form/name")
  function getPath(path: string): any {
    const keys = path.replace(/^\//, '').split('/');
    let val: any = dataModel;
    for (const k of keys) {
      if (val == null) return '';
      val = val[k];
    }
    return val ?? '';
  }

  // Set a value in the data model by path
  function setPath(path: string, value: any) {
    const keys = path.replace(/^\//, '').split('/');
    let obj: any = dataModel;
    for (let i = 0; i < keys.length - 1; i++) {
      if (obj[keys[i]] == null) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    dataModel = { ...dataModel }; // trigger reactivity
  }

  async function sendMessage() {
    if (!message.trim()) return;
    
    loading = true;
    uiData = [];
    textResponse = '';
    error = '';
    protocolLog = [];
    dataModel = {};

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split(/\r?\n\r?\n/);
        buffer = chunks.pop() || '';

        for (const chunk of chunks) {
          const dataLine = chunk.split('\n').find(l => l.startsWith('data:'));
          if (dataLine) {
            try {
              const data = JSON.parse(dataLine.slice(5).trim());
              protocolLog = [...protocolLog, {time: new Date().toISOString().slice(11,23), data}];
              if (data.a2ui) {
                for (const msg of data.a2ui) {
                  if (msg.updateDataModel) {
                    const { path, value } = msg.updateDataModel;
                    if (path === '/') {
                      dataModel = value;
                    } else {
                      setPath(path, value);
                    }
                  }
                }
                uiData = [...uiData, ...data.a2ui];
              } else if (data.text) {
                textResponse += data.text;
              } else if (data.error) {
                error = data.error;
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Request failed';
    } finally {
      loading = false;
    }
  }

  function handleAction(action: any) {
    if (!action?.event) return;
    const { name, context } = action.event;
    const resolved: Record<string, any> = {};
    if (context) {
      for (const [k, v] of Object.entries(context)) {
        resolved[k] = (v as any).path ? getPath((v as any).path) : v;
      }
    }
    alert(`Event: ${name}\n\nData:\n${JSON.stringify(resolved, null, 2)}`);
  }

  function handleClear() {
    // Reset all string values to empty, arrays to []
    function resetObj(obj: any): any {
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) {
        if (Array.isArray(v)) out[k] = [];
        else if (typeof v === 'object' && v !== null) out[k] = resetObj(v);
        else if (typeof v === 'boolean') out[k] = false;
        else out[k] = '';
      }
      return out;
    }
    dataModel = resetObj(dataModel);
  }
</script>

<div class="min-h-screen p-8">
  <div class="max-w-4xl mx-auto">
    <div class="bg-white rounded-2xl shadow-2xl p-8 mb-6">
      <h1 class="text-4xl font-bold mb-2 text-gray-800">🎨 A2UI Sample</h1>
      <p class="text-gray-600 mb-6">Declarative Generative UI with ADK + Amazon Bedrock</p>
      
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
        <h3 class="font-semibold text-blue-900 mb-2">💡 How A2UI Works</h3>
        <p class="text-blue-800 text-sm mb-3">
          The agent generates <strong>JSON (JSONL)</strong> describing UI components using ~22 A2UI primitives.
          A client-side <strong>renderer</strong> interprets the messages and displays native UI.
        </p>
        <p class="text-blue-800 text-sm mb-3">
          This sample implements a <strong>custom Svelte renderer</strong> supporting:
          <span class="inline-flex flex-wrap gap-1 mt-1">
            <span class="bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-xs font-medium">Text</span>
            <span class="bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-xs font-medium">TextField</span>
            <span class="bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-xs font-medium">Button</span>
            <span class="bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-xs font-medium">CheckBox</span>
            <span class="bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-xs font-medium">ChoicePicker</span>
            <span class="bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-xs font-medium">Slider</span>
            <span class="bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-xs font-medium">Divider</span>
            <span class="bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-xs font-medium">Column</span>
            <span class="bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-xs font-medium">Row</span>
            <span class="bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-xs font-medium">Card</span>
          </span>
        </p>
        <p class="text-blue-700 text-xs">
          Official renderers exist for <strong>React</strong> (<code>@a2ui/react</code>), <strong>Lit</strong> (Web Components), <strong>Angular</strong>, and community renderers for <strong>Vue</strong>, <strong>Swift</strong>, <strong>Android</strong>, and <strong>React Native</strong>. This Svelte renderer is built on <code>@a2ui/web_core</code> concepts for the demo.
        </p>
      </div>

      <div class="space-y-4">
        <div>
          <span class="block text-sm font-medium text-gray-700 mb-2">Try these commands:</span>
          <ul class="space-y-1 text-sm text-gray-600 mb-4">
            <li>• "Create a contact form with name, email, and phone"</li>
            <li>• "Build a user profile card for Alice"</li>
            <li>• "Generate a feedback survey with 3 questions"</li>
          </ul>
        </div>

        <input
          type="text"
          bind:value={message}
          on:keypress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="What UI would you like to generate?"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <button
          on:click={sendMessage}
          disabled={loading || !message.trim()}
          class="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Generating UI...' : 'Generate UI'}
        </button>
      </div>
    </div>

    {#if error}
      <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
        <p class="text-red-800 text-sm">{error}</p>
      </div>
    {/if}

    {#if textResponse}
      <div class="bg-white rounded-2xl shadow-2xl p-8 mb-6">
        <div class="text-sm text-gray-500 mb-3">💬 Agent response:</div>
        <div class="text-gray-800 leading-relaxed prose prose-sm max-w-none">
          {@html textResponse
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
            .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
            .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc space-y-1 my-2">$&</ul>')
            .replace(/\n/g, '<br>')
          }
        </div>
      </div>
    {/if}

    {#if uiData.length > 0}
      <div class="bg-white rounded-2xl shadow-2xl p-8">
        <div class="text-sm text-gray-500 mb-4">🎯 A2UI-generated interface: <span class="text-xs text-gray-400">(hover elements to see A2UI JSON)</span></div>
        <div class="space-y-4 border border-gray-200 rounded-lg p-6">
          {#each uiData as msg}
            {#if msg.updateComponents}
              {#each msg.updateComponents.components as comp}
                {@const allComps = msg.updateComponents.components}
                <div class="a2ui-element group relative">
                  {#if comp.component === 'Text' && !allComps.some(c => c.child === comp.id)}
                    {#if comp.variant === 'h2'}
                      <h2 class="text-2xl font-bold text-gray-800">{comp.text}</h2>
                    {:else}
                      <p class="text-gray-700">{comp.text}</p>
                    {/if}
                  {:else if comp.component === 'TextField'}
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">{comp.label || ''}</label>
                      {#if comp.variant === 'longText'}
                        <textarea
                          placeholder={comp.placeholder || ''}
                          value={comp.value?.path ? getPath(comp.value.path) : ''}
                          on:input={(e) => comp.value?.path && setPath(comp.value.path, e.currentTarget.value)}
                          class="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                        ></textarea>
                      {:else}
                        <input
                          type="text"
                          placeholder={comp.placeholder || ''}
                          value={comp.value?.path ? getPath(comp.value.path) : ''}
                          on:input={(e) => comp.value?.path && setPath(comp.value.path, e.currentTarget.value)}
                          class="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      {/if}
                    </div>
                  {:else if comp.component === 'Button'}
                    {@const childComp = allComps.find(c => c.id === comp.child)}
                    <button
                      class="{comp.variant === 'primary' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'} px-4 py-2 rounded-md hover:opacity-80"
                      on:click={() => {
                        if (comp.action?.event?.name?.includes('clear') || comp.action?.event?.name?.includes('reset')) {
                          handleClear();
                        } else {
                          handleAction(comp.action);
                        }
                      }}
                    >{childComp?.text || comp.child || 'Button'}</button>
                  {:else if comp.component === 'CheckBox'}
                    <label class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        class="rounded"
                        checked={comp.value?.path ? !!getPath(comp.value.path) : false}
                        on:change={(e) => comp.value?.path && setPath(comp.value.path, e.currentTarget.checked)}
                      />
                      <span class="text-sm text-gray-700">{comp.label || ''}</span>
                    </label>
                  {:else if comp.component === 'ChoicePicker' && comp.options}
                    <div>
                      <span class="block text-sm font-medium text-gray-700 mb-2">{comp.label || ''}</span>
                      <div class="flex flex-wrap gap-2">
                        {#each comp.options as opt (opt.value + dataModelVersion)}
                          {@const selected = comp.value?.path ? (getPath(comp.value.path) || []).includes(opt.value) : false}
                          <button
                            class="px-3 py-1 border rounded-full text-sm transition-colors {selected ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 hover:bg-indigo-50 hover:border-indigo-300'}"
                            on:click={() => {
                              if (!comp.value?.path) return;
                              const current = getPath(comp.value.path) || [];
                              if (comp.variant === 'mutuallyExclusive') {
                                setPath(comp.value.path, [opt.value]);
                              } else {
                                const next = current.includes(opt.value)
                                  ? current.filter(v => v !== opt.value)
                                  : [...current, opt.value];
                                setPath(comp.value.path, next);
                              }
                            }}
                          >{opt.label}</button>
                        {/each}
                      </div>
                    </div>
                  {:else if comp.component === 'Divider'}
                    <hr class="border-gray-200" />
                  {:else if comp.component === 'Slider'}
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">{comp.label || ''}</label>
                      <div class="flex items-center gap-3">
                        <span class="text-xs text-gray-500">{comp.min ?? 0}</span>
                        <input
                          type="range"
                          min={comp.min ?? 0}
                          max={comp.max ?? 10}
                          value={comp.value?.path ? getPath(comp.value.path) || 0 : 0}
                          on:input={(e) => comp.value?.path && setPath(comp.value.path, Number(e.currentTarget.value))}
                          class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <span class="text-xs text-gray-500">{comp.max ?? 10}</span>
                        <span class="text-sm font-semibold text-indigo-600 min-w-[2ch] text-center">{dataModelVersion && comp.value?.path ? getPath(comp.value.path) || 0 : 0}</span>
                      </div>
                    </div>
                  {/if}
                  {#if showTooltips}
                    <div class="hidden group-hover:block absolute left-0 top-full z-50 mt-1 w-96 max-h-48 overflow-auto bg-gray-900 text-gray-200 text-xs font-mono p-3 rounded-lg shadow-xl border border-gray-700 whitespace-pre-wrap">{JSON.stringify(comp, null, 2)}</div>
                  {/if}
                </div>
              {/each}
            {/if}
          {/each}
        </div>

        <!-- Data Model Inspector -->
        {#if Object.keys(dataModel).length > 0}
          <div class="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <span class="text-xs font-semibold text-emerald-700">📦 Data Model (live)</span>
            <pre class="text-xs text-emerald-800 mt-1 font-mono">{JSON.stringify(dataModel, null, 2)}</pre>
          </div>
        {/if}

        <div class="mt-4 flex items-center gap-4">
          <label class="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
            <input type="checkbox" bind:checked={showTooltips} class="rounded" />
            Show tooltips on hover
          </label>
          <details>
            <summary class="text-sm text-gray-500 cursor-pointer">View raw A2UI JSON</summary>
            <pre class="bg-gray-100 p-4 rounded text-xs overflow-auto mt-2">{JSON.stringify(uiData, null, 2)}</pre>
          </details>
        </div>
      </div>
    {/if}

    {#if protocolLog.length > 0}
      <div class="bg-gray-900 rounded-2xl shadow-2xl p-6 mt-6">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-semibold text-gray-300">📡 A2UI Protocol Messages ({protocolLog.length})</span>
        </div>
        <div class="space-y-2 max-h-96 overflow-y-auto">
          {#each protocolLog as entry, i}
            <div class="border border-gray-700 rounded-lg p-3">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-mono text-gray-500">{entry.time}</span>
                {#if entry.data.a2ui}
                  {@const msg = entry.data.a2ui[0]}
                  {#if msg.createSurface}
                    <span class="text-xs px-2 py-0.5 bg-green-900 text-green-300 rounded-full">createSurface</span>
                  {:else if msg.updateComponents}
                    <span class="text-xs px-2 py-0.5 bg-blue-900 text-blue-300 rounded-full">updateComponents ({msg.updateComponents.components.length} components)</span>
                  {:else if msg.updateDataModel}
                    <span class="text-xs px-2 py-0.5 bg-purple-900 text-purple-300 rounded-full">updateDataModel</span>
                  {:else}
                    <span class="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full">a2ui</span>
                  {/if}
                {:else if entry.data.text}
                  <span class="text-xs px-2 py-0.5 bg-yellow-900 text-yellow-300 rounded-full">text</span>
                {/if}
              </div>
              <pre class="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap font-mono">{JSON.stringify(entry.data, null, 2)}</pre>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
