"use client";

import { useRef, useEffect, useState } from "react";

interface WidgetRendererProps {
  title: string;
  description: string;
  html: string;
}

export function WidgetRenderer({ title, description, html }: WidgetRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = `<!DOCTYPE html>
<html><head><style>
:root { --text: #1e293b; --bg: #ffffff; }
@media (prefers-color-scheme: dark) { :root { --text: #f1f5f9; --bg: #0f172a; } }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--text); background: var(--bg); padding: 16px; }
</style></head><body>${html}
<script>
const ro = new ResizeObserver(() => {
  window.parent.postMessage({ type: 'resize', height: document.body.scrollHeight + 32 }, '*');
});
ro.observe(document.body);
</script></body></html>`;

    iframe.srcdoc = doc;

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "resize" && typeof e.data.height === "number") {
        setHeight(Math.min(e.data.height, 800));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [html]);

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        style={{ width: "100%", height, border: "none", display: "block" }}
        title={title}
      />
    </div>
  );
}
