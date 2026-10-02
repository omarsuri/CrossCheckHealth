import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const figtree = localFont({
  src: './fonts/Figtree-Latin.woff2',
  variable: '--font-sans',
  weight: '300 700',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CrossCheckHealth — Coming Soon',
  description:
    'Redefining health verification with AI-powered cross-checking. Accurate, fast, and trusted.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${figtree.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
