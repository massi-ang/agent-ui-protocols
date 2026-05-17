import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AG-UI Sample - CopilotKit + Bedrock',
  description: 'Controlled Generative UI with Amazon Bedrock',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
