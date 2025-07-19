import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cysic Fusion 2048',
  description: 'Cysic Fusion 2048. Developer LeBwA',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
