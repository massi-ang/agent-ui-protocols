'use client'

import { CopilotKit } from '@copilotkit/react-core'
import { CopilotChat } from '@copilotkit/react-ui'
import { useFrontendTool } from '@copilotkit/react-core/v2'
import '@copilotkit/react-ui/styles.css'
import { z } from 'zod'
import { AddressSelector } from '@/components/AddressSelector'
import { useRef } from 'react'

function AddressTool() {
  const resolveRef = useRef<((value: string) => void) | null>(null)

  useFrontendTool({
    name: 'select_address_for_postcode',
    description:
      'Show the user a list of addresses matching their postcode so they can select one. ' +
      'Call this with the postcode. The backend will enrich it with matching addresses.',
    parameters: z.object({
      postcode: z.string().describe('The postcode to look up'),
      addresses: z.array(z.object({
        id: z.string(),
        line1: z.string(),
        line2: z.string(),
        city: z.string(),
        postcode: z.string(),
      })).describe('List of addresses matching the postcode'),
    }),
    handler: async () => {
      return new Promise<string>((resolve) => {
        resolveRef.current = resolve
      })
    },
    render: ({ args, status, result }) => {
      console.log('RENDER args:', JSON.stringify(args), 'status:', status)
      const addresses = args.addresses || []
      const postcode = args.postcode || ''

      if (status === 'inProgress') {
        return <p className="text-sm text-gray-500">Looking up addresses for {postcode}...</p>
      }

      if (status === 'complete') {
        const selected = result ? JSON.parse(result as string) : null
        return selected ? (
          <p className="text-sm text-green-600">✓ Selected: {selected.line1}, {selected.city}</p>
        ) : null
      }

      if (!addresses.length) {
        return <p className="text-sm text-gray-500">No addresses found for {postcode}</p>
      }

      return (
        <AddressSelector
          addresses={addresses}
          postcode={postcode}
          onSelect={(address) => {
            resolveRef.current?.(JSON.stringify(address))
            resolveRef.current = null
          }}
        />
      )
    },
  })

  return null
}

export default function Home() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="address_agent">
      <AddressTool />
      <div className="h-screen flex">
        <div className="w-80 bg-gray-50 p-6 overflow-y-auto border-r">
          <h1 className="text-xl font-bold mb-2">🏠 AG-UI Address Sample</h1>
          <p className="text-sm text-gray-600 mb-4">
            args_streamer enriches tool call with server-side data → client renders selector
          </p>

          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h2 className="font-semibold mb-2 text-sm">How it works</h2>
            <ol className="list-decimal list-inside space-y-1 text-xs text-gray-700">
              <li>Agent asks for your postcode</li>
              <li>Agent validates with <code className="bg-gray-100 px-1 rounded">validate_postcode</code></li>
              <li><code className="bg-gray-100 px-1 rounded">args_streamer</code> enriches with addresses from API</li>
              <li>Client-side tool renders address selector</li>
              <li>You pick an address and confirm</li>
            </ol>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded text-xs">
            <strong>Try:</strong> Use postcodes{' '}
            <code className="bg-blue-100 px-1 rounded">SW1A 1AA</code>,{' '}
            <code className="bg-blue-100 px-1 rounded">EC2R 8AH</code>, or{' '}
            <code className="bg-blue-100 px-1 rounded">M1 1AA</code>.
          </div>
        </div>
        <CopilotChat
          className="flex-1"
          labels={{
            title: 'Address Assistant',
            initial: "Hi! I need to collect your address. What's your postcode?",
          }}
        />
      </div>
    </CopilotKit>
  )
}
