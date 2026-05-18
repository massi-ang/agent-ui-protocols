"use client";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NextAppProvider, PageRenderer } from "@json-render/next";
import { registry } from "@/lib/registry";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8081";

interface Spec {
  root: string;
  elements: Record<
    string,
    { type: string; props: Record<string, unknown>; children?: string[] }
  >;
}

interface Message {
  role: "user" | "assistant" | "status";
  content: string;
}

function deriveInitialState(spec: Spec): Record<string, unknown> {
  const state: Record<string, unknown> = (spec as any).state || {};
  for (const el of Object.values(spec.elements)) {
    if (el.type === "Tabs" && el.props) {
      const bindState = (el.props.value as any)?.$bindState;
      const defaultValue = el.props.defaultValue as string;
      if (bindState && defaultValue) {
        const key = (bindState as string).replace(/^\//, "");
        state[key] = defaultValue;
      }
    }
  }
  return state;
}

function injectTabVisibility(spec: Spec): Spec {
  const elements = { ...spec.elements };
  for (const [id, el] of Object.entries(elements)) {
    if (el.type === "Tabs" && el.props && el.children) {
      const bindState = (el.props.value as any)?.$bindState as string | undefined;
      const tabs = el.props.tabs as Array<{ label: string; value: string }> | undefined;
      if (bindState && tabs && el.children.length === tabs.length) {
        el.children.forEach((childId, i) => {
          if (elements[childId] && !(elements[childId] as any).visible) {
            elements[childId] = {
              ...elements[childId],
              visible: { $state: bindState, eq: tabs[i].value },
            } as any;
          }
        });
      }
    }
  }
  return { ...spec, elements };
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [spec, setSpec] = useState<Spec | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [showSpec, setShowSpec] = useState(false);
  const lastSpecRef = useRef("");
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const resizing = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      setSidebarWidth(Math.max(280, Math.min(600, e.clientX)));
    };
    const onMouseUp = () => { resizing.current = false; document.body.style.cursor = ""; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const prompt = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: prompt }]);
    setLoading(true);
    setStatus("Connecting...");
    setStreamingText("");

    try {
      const res = await fetch(`${AGENT_URL}/invocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let textContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          console.log("RAW CHUNK:", buffer);

          // Parse SSE: split on double newline (event boundary)
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const lines = part.split("\n");
            let eventType = "";
            let eventData = "";
            for (const line of lines) {
              if (line.startsWith("event: ")) eventType = line.slice(7);
              else if (line.startsWith("data: ")) eventData = line.slice(6);
            }
            if (!eventType || !eventData) continue;
            try {
              const data = JSON.parse(eventData);
              console.log("SSE:", eventType, data);
              if (eventType === "status") {
                setStatus(data.message);
              } else if (eventType === "delta") {
                textContent += data.text;
                setStreamingText((prev) => prev + data.text);
              } else if (eventType === "text") {
                setStreamingText(data.text);
              } else if (eventType === "spec") {
                const parsed = JSON.parse(data.spec) as Spec;
                lastSpecRef.current = data.spec;
                setSpec(parsed);
              } else if (eventType === "done") {
                if (textContent) {
                  setMessages((m) => [
                    ...m,
                    { role: "assistant", content: textContent },
                  ]);
                } else if (!spec) {
                  setMessages((m) => [
                    ...m,
                    { role: "assistant", content: "Done" },
                  ]);
                }
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${(err as Error).message}` },
      ]);
    } finally {
      setLoading(false);
      setStatus("");
      setStreamingText("");
    }
  }

  return (
    <div className="flex h-screen bg-[#fafafa]">
      {/* Sidebar */}
      <div style={{ width: sidebarWidth }} className="flex flex-col border-r border-zinc-200 bg-white relative">
        <div className="px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-zinc-900 flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900">
                json-render
              </h1>
              <p className="text-xs text-zinc-500">
                Strands Agent + Bedrock + shadcn/ui
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-4 pt-4">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Try a prompt
              </p>
              {[
                "What's the weather like in London?",
                "Show me my bank account status",
                "What are the top 5 programming languages in 2026?",
                "Help me plan a trip to Tokyo",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="block w-full text-left px-3 py-2.5 text-sm text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-100 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm ${
                  m.role === "user"
                    ? "bg-zinc-900 text-white rounded-br-md"
                    : "bg-zinc-100 text-zinc-700 rounded-bl-md"
                }`}
              >
                <div className={`prose prose-sm max-w-none [&>p]:m-0 [&>ul]:m-0 ${m.role === "user" ? "prose-invert" : "prose-zinc"}`}><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
              </div>
            </div>
          ))}
          {streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-bl-md bg-zinc-100 text-zinc-700 text-sm">
                <div className="prose prose-sm prose-zinc max-w-none [&>p]:m-0"><ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown></div>
                <span className="animate-pulse">▍</span>
              </div>
            </div>
          )}
          {status && !streamingText && (
            <div className="flex justify-start">
              <div className="px-3.5 py-2 rounded-2xl rounded-bl-md bg-zinc-50 border border-zinc-200 text-sm text-zinc-500 flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-indigo-500"></span>
                </span>
                {status}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

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
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={() => { resizing.current = true; document.body.style.cursor = "col-resize"; }}
        className="w-1 hover:w-1.5 bg-transparent hover:bg-indigo-400/40 cursor-col-resize transition-all shrink-0"
      />

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {spec ? (
          <>
            <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 bg-white sticky top-0 z-10">
              <div className="flex gap-1 bg-zinc-100 rounded-lg p-0.5">
                <button onClick={() => setShowSpec(false)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${!showSpec ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"}`}>UI</button>
                <button onClick={() => setShowSpec(true)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${showSpec ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"}`}>Spec</button>
              </div>
              {showSpec && (
                <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(JSON.parse(lastSpecRef.current), null, 2)); }} className="px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-md transition">Copy</button>
              )}
            </div>
            {showSpec ? (
              <pre className="flex-1 p-6 text-xs font-mono text-zinc-700 bg-zinc-50 overflow-auto whitespace-pre-wrap">{JSON.stringify(spec, null, 2)}</pre>
            ) : (
              <div className="max-w-3xl mx-auto p-10 w-full">
                <NextAppProvider registry={registry}>
                  <PageRenderer spec={injectTabVisibility(spec) as any} initialState={deriveInitialState(spec)} />
                </NextAppProvider>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="size-12 mx-auto rounded-2xl bg-zinc-100 flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#a1a1aa"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-500">
                Generated UI appears here
              </p>
              <p className="text-xs text-zinc-400">
                Constrained to your component catalog
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
