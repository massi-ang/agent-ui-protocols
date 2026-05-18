"use client";
import { useState, useRef, useEffect } from "react";
import {
  Renderer,
  StateProvider,
  ActionProvider,
  ValidationProvider,
  VisibilityProvider,
} from "@json-render/react";
import { registry } from "@/lib/registry";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8081";

interface Spec {
  root: string;
  elements: Record<string, { type: string; props: Record<string, unknown>; children?: string[] }>;
}

export default function Home() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [spec, setSpec] = useState<Spec | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const prompt = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: prompt }]);
    setLoading(true);

    try {
      const res = await fetch(`${AGENT_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, previousSpec: spec }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
        }
      }

      const jsonMatch = buffer.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setSpec(JSON.parse(jsonMatch[0]) as Spec);
        setMessages((m) => [...m, { role: "assistant", content: "UI updated" }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: "Could not parse response" }]);
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${(err as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-[#fafafa]">
      {/* Sidebar */}
      <div className="w-[380px] flex flex-col border-r border-zinc-200 bg-white">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-zinc-900 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900">json-render</h1>
              <p className="text-xs text-zinc-500">Bedrock + shadcn/ui catalog</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-4 pt-4">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Try a prompt</p>
              {[
                "Create a sales dashboard with revenue metrics",
                "Show a form with name, email and submit",
                "Build a tabbed view with Overview and Settings",
                "Create a table of top 5 customers",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
                  className="block w-full text-left px-3 py-2.5 text-sm text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-100 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm ${
                m.role === "user"
                  ? "bg-zinc-900 text-white rounded-br-md"
                  : "bg-zinc-100 text-zinc-700 rounded-bl-md"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-3.5 py-2 rounded-2xl rounded-bl-md bg-zinc-100">
                <div className="flex gap-1">
                  <span className="size-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="size-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="size-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-zinc-100">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the UI you want..."
              className="flex-1 px-3.5 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 placeholder:text-zinc-400 transition-shadow"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3.5 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </form>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto">
        {spec ? (
          <div className="max-w-3xl mx-auto p-10">
            <StateProvider initialState={{}}>
              <VisibilityProvider>
                <ActionProvider>
                  <ValidationProvider>
                    <Renderer spec={spec as any} registry={registry} />
                  </ValidationProvider>
                </ActionProvider>
              </VisibilityProvider>
            </StateProvider>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="size-12 mx-auto rounded-2xl bg-zinc-100 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              </div>
              <p className="text-sm font-medium text-zinc-500">Generated UI appears here</p>
              <p className="text-xs text-zinc-400">Constrained to your component catalog</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
