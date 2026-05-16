<script lang="ts">
  let message = '';
  let uiData: any = null;
  let loading = false;

  async function sendMessage() {
    if (!message.trim()) return;
    
    loading = true;
    uiData = null;

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
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.beginRendering) {
              uiData = data;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen p-8">
  <div class="max-w-4xl mx-auto">
    <div class="bg-white rounded-2xl shadow-2xl p-8 mb-6">
      <h1 class="text-4xl font-bold mb-2 text-gray-800">🎨 A2UI Sample</h1>
      <p class="text-gray-600 mb-6">Declarative Generative UI with ADK + Amazon Bedrock</p>
      
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
        <h3 class="font-semibold text-blue-900 mb-2">💡 How A2UI Works</h3>
        <p class="text-blue-800 text-sm">
          The agent generates <strong>JSON structure (JSONL)</strong> describing UI components.
          The Svelte renderer interprets this and displays the UI. Agent has freedom within ~22 A2UI primitives.
        </p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Try these commands:</label>
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

    {#if uiData}
      <div class="bg-white rounded-2xl shadow-2xl p-8">
        <div class="text-sm text-gray-500 mb-4">🎯 A2UI-generated interface:</div>
        <div class="space-y-4">
          <pre class="bg-gray-100 p-4 rounded text-xs overflow-auto">{JSON.stringify(uiData, null, 2)}</pre>
          <p class="text-sm text-gray-600">
            This is a simplified demo. Full A2UI renderer would interpret the JSONL and render actual components.
          </p>
        </div>
      </div>
    {/if}
  </div>
</div>
