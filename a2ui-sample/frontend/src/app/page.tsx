"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { A2uiSurface, basicCatalog, MarkdownContext } from "@a2ui/react/v0_9";
import { MessageProcessor, SurfaceModel, Catalog } from "@a2ui/web_core/v0_9";
import type { ReactComponentImplementation } from "@a2ui/react/v0_9";
import { renderMarkdown } from "@a2ui/markdown-it";
import { WeatherCard, BankAccountCard } from "@/catalog/components";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "";

// Create catalog with the ID the agent references
const allComponents = [
  ...Array.from(basicCatalog.components.values()),
  WeatherCard,
  BankAccountCard,
];
const catalog = new Catalog<ReactComponentImplementation>(
  "https://a2ui.org/specification/v0_9/basic_catalog.json",
  allComponents,
  Array.from(basicCatalog.functions.values()),
);

// Also register with the custom catalog ID in case agent uses it
const customCatalogInstance = new Catalog<ReactComponentImplementation>(
  "urn:a2ui:catalog:custom",
  allComponents,
  Array.from(basicCatalog.functions.values()),
);

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [surfaces, setSurfaces] = useState<SurfaceModel<ReactComponentImplementation>[]>([]);
  const [protocolLog, setProtocolLog] = useState<Array<{ time: string; data: any }>>([]);
  const [showConsole, setShowConsole] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const processor = useMemo(() => {
    return new MessageProcessor([catalog, customCatalogInstance], (action) => {
      console.log("A2UI Action:", action);
    });
  }, []);

  useEffect(() => {
    const sub1 = processor.onSurfaceCreated((surface) => {
      setSurfaces((prev) => [...prev, surface]);
    });
    const sub2 = processor.onSurfaceDeleted((id) => {
      setSurfaces((prev) => prev.filter((s) => s.id !== id));
    });
    return () => { sub1.unsubscribe(); sub2.unsubscribe(); };
  }, [processor]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const prompt = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: prompt }]);
    setLoading(true);
    setProtocolLog([]);

    // Clear existing surfaces
    Array.from(processor.model.surfacesMap.keys()).forEach((id) => {
      processor.model.deleteSurface(id);
    });
    setSurfaces([]);

    try {
      const res = await fetch(`${AGENT_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const chunks = buffer.split(/\r?\n\r?\n/);
          buffer = chunks.pop() || "";

          for (const chunk of chunks) {
            const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
            if (dataLine) {
              try {
                const data = JSON.parse(dataLine.slice(5).trim());
                setProtocolLog((log) => [...log, { time: new Date().toISOString().slice(11, 23), data }]);

                if (data.a2ui) {
                  processor.processMessages(data.a2ui);
                } else if (data.text) {
                  setMessages((m) => {
                    const last = m[m.length - 1];
                    if (last?.role === "assistant") {
                      return [...m.slice(0, -1), { role: "assistant", content: last.content + data.text }];
                    }
                    return [...m, { role: "assistant", content: data.text }];
                  });
                }
              } catch {}
            }
          }
        }
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${(err as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, processor]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Chat sidebar */}
      <div style={{ width: 380, display: "flex", flexDirection: "column", borderRight: "1px solid #e2e8f0", background: "#fff" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🎨 A2UI Sample</h1>
          <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>Official @a2ui/react v0.9 + ADK + Bedrock</p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {messages.length === 0 && (
            <div style={{ color: "#94a3b8", fontSize: 13 }}>
              <p style={{ marginBottom: 12 }}>Try:</p>
              {["Create a contact form with name and email", "What is the weather in London?", "Show my bank account"].map((s) => (
                <button key={s} onClick={() => setInput(s)} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", marginBottom: 8, fontSize: 13, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", color: "#475569" }}>{s}</button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div style={{ maxWidth: "85%", padding: "8px 14px", borderRadius: 16, fontSize: 13, ...(m.role === "user" ? { background: "#1e293b", color: "#fff", borderBottomRightRadius: 4 } : { background: "#f1f5f9", color: "#334155", borderBottomLeftRadius: 4 }) }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && <div style={{ fontSize: 13, color: "#6366f1" }}>Processing...</div>}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 16, borderTop: "1px solid #f1f5f9", display: "flex", gap: 8 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe the UI..." disabled={loading} style={{ flex: 1, padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none" }} />
          <button type="submit" disabled={loading || !input.trim()} style={{ padding: "10px 14px", background: "#1e293b", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer", opacity: loading ? 0.5 : 1 }}>→</button>
        </form>
      </div>

      {/* Rendered UI */}
      <div style={{ flex: 1, overflowY: "auto", padding: 40 }}>
        {surfaces.length > 0 ? (
          <div>
          <MarkdownContext.Provider value={renderMarkdown}>
            {surfaces.map((surface) => (
              <A2uiSurface key={surface.id} surface={surface} />
            ))}
          </MarkdownContext.Provider>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎨</div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>A2UI-rendered interface appears here</p>
              <p style={{ fontSize: 12 }}>Using official @a2ui/react v0.9 renderer</p>
            </div>
          </div>
        )}
      </div>

      {/* Dev console */}
      {protocolLog.length > 0 && (
        <>
          <button onClick={() => setShowConsole(!showConsole)} style={{ position: "fixed", bottom: 16, right: 16, zIndex: 50, width: 40, height: 40, background: "#1e293b", color: "#fff", border: "1px solid #334155", borderRadius: "50%", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
            {protocolLog.length}
          </button>
          {showConsole && (
            <div style={{ position: "fixed", bottom: 64, right: 16, zIndex: 50, width: 420, maxHeight: "70vh", background: "#0f172a", border: "1px solid #334155", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #1e293b" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>📡 A2UI Protocol ({protocolLog.length})</span>
                <button onClick={() => setShowConsole(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18 }}>×</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
                {protocolLog.map((entry, i) => (
                  <div key={i} style={{ border: "1px solid #1e293b", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace", marginBottom: 4 }}>{entry.time}</div>
                    <pre style={{ fontSize: 10, color: "#94a3b8", margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace", maxHeight: 120, overflow: "auto" }}>{JSON.stringify(entry.data, null, 2)}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
