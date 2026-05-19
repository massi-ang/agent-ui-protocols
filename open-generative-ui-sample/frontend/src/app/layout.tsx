"use client";

import "./globals.css";
import "@copilotkit/react-core/v2/styles.css";
import { CopilotKit } from "@copilotkit/react-core";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit" agent="open_generative_ui_agent">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
