'use client'

import { CopilotKit } from '@copilotkit/react-core'
import { CopilotSidebar } from '@copilotkit/react-ui'
import '@copilotkit/react-ui/styles.css'
import { Tools } from '@/components/Tools'

export default function Home() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="sample_agent">
      <Tools />
      <div className="min-h-screen p-8 ml-64 transition-all">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 text-center">
            🎯 AG-UI Sample
          </h1>
          <p className="text-xl text-center text-gray-600 mb-8">
            Controlled Generative UI with CopilotKit + Amazon Bedrock
          </p>
          
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">📊 Data Tools (Server-side):</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                "Show me the weather in San Francisco"
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                "Display user profile for john@example.com"
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                "Create a bar chart with values 10, 20, 30, 40, 50"
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4 text-purple-900">🎮 Local UI Tools (Client-side):</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-purple-800 mb-1">Sidebar Control:</h3>
                <ul className="space-y-1 text-gray-700 text-sm ml-4">
                  <li>• "Close the sidebar"</li>
                  <li>• "Open the sidebar"</li>
                  <li>• "Toggle sidebar"</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-purple-800 mb-1">Theme Control:</h3>
                <ul className="space-y-1 text-gray-700 text-sm ml-4">
                  <li>• "Change theme to dark"</li>
                  <li>• "Switch to light mode"</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-purple-800 mb-1">Counter Control:</h3>
                <ul className="space-y-1 text-gray-700 text-sm ml-4">
                  <li>• "Increment the counter"</li>
                  <li>• "Set counter to 100"</li>
                  <li>• "Decrease counter by one"</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-purple-800 mb-1">Notifications:</h3>
                <ul className="space-y-1 text-gray-700 text-sm ml-4">
                  <li>• "Add notification: Meeting at 3pm"</li>
                  <li>• "Show notification saying hello"</li>
                  <li>• "Clear all notifications"</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-purple-800 mb-1">Navigation:</h3>
                <ul className="space-y-1 text-gray-700 text-sm ml-4">
                  <li>• "Switch to settings panel"</li>
                  <li>• "Go to help section"</li>
                  <li>• "Show main panel"</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-purple-800 mb-1">Combined Actions:</h3>
                <ul className="space-y-1 text-gray-700 text-sm ml-4">
                  <li>• "Close sidebar, change to dark theme, and increment counter"</li>
                  <li>• "Reset everything to default"</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Key AG-UI Features</h3>
            <ul className="text-blue-800 text-sm space-y-2">
              <li>
                <strong>Pre-built Components:</strong> All UI elements (cards, sidebar, notifications) 
                are React components you control
              </li>
              <li>
                <strong>Client-side State:</strong> Local tools manipulate UI state directly without 
                server round-trips (instant updates!)
              </li>
              <li>
                <strong>Type Safety:</strong> Parameters and state are fully typed with TypeScript
              </li>
              <li>
                <strong>Bidirectional:</strong> Agent can read current UI state via useCopilotReadable 
                and make decisions based on it
              </li>
              <li>
                <strong>Full Control:</strong> You define exactly how each tool affects the UI - 
                agent just triggers them
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mt-6">
            <h3 className="font-semibold text-yellow-900 mb-2">🎯 AG-UI vs Other Protocols</h3>
            <div className="text-yellow-800 text-sm space-y-2">
              <div>
                <strong>AG-UI (this demo):</strong> Agent calls pre-built tools → instant UI updates
              </div>
              <div>
                <strong>A2UI:</strong> Agent generates JSON structure → renderer interprets it
              </div>
              <div>
                <strong>MCP Apps:</strong> Agent returns full HTML/JS → sandboxed iframe renders it
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <CopilotSidebar
        defaultOpen={true}
        labels={{
          title: 'AG-UI Assistant',
          initial: 'Hi! I can control both data (weather, profiles) and UI state (sidebar, theme, counter, etc.). What would you like me to do?',
        }}
      />
    </CopilotKit>
  )
}
