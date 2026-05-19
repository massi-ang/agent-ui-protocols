import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "A2UI Sample — React + Bedrock" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
