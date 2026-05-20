'use client'

import { useState } from 'react'

interface Address {
  id: string
  line1: string
  line2: string
  city: string
  postcode: string
}

interface AddressSelectorProps {
  addresses: Address[]
  postcode: string
  onSelect: (address: Address) => void
}

export function AddressSelector({ addresses, postcode, onSelect }: AddressSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const selectedAddress = addresses.find((a) => a.id === selected)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md">
      <h3 className="font-semibold text-gray-900 mb-1">📍 Select your address</h3>
      <p className="text-sm text-gray-500 mb-3">
        {addresses.length} address{addresses.length !== 1 && 'es'} found for <strong>{postcode}</strong>
      </p>

      <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
        {addresses.map((addr) => (
          <label
            key={addr.id}
            className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
              selected === addr.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="address"
              value={addr.id}
              checked={selected === addr.id}
              onChange={() => setSelected(addr.id)}
              className="mt-1"
            />
            <div className="text-sm">
              <div className="font-medium text-gray-900">{addr.line1}</div>
              {addr.line2 && <div className="text-gray-600">{addr.line2}</div>}
              <div className="text-gray-600">{addr.city}, {addr.postcode}</div>
            </div>
          </label>
        ))}
      </div>

      <button
        disabled={!selectedAddress}
        onClick={() => selectedAddress && onSelect(selectedAddress)}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
      >
        Confirm address
      </button>
    </div>
  )
}
