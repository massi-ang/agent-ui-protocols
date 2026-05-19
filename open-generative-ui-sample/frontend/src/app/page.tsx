"use client";

import { CopilotChat } from "@copilotkit/react-core/v2";
import { useGenerativeUI } from "@/hooks/use-generative-ui";

export default function HomePage() {
  useGenerativeUI();

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <div className="p-6 pb-2 text-center">
        <h1 className="text-3xl font-bold mb-1">🎨 Open Generative UI</h1>
        <p className="text-gray-500 text-sm">
          CopilotKit v2 + Strands + Amazon Bedrock
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <CopilotChat />
      </div>
    </div>
  );
}
