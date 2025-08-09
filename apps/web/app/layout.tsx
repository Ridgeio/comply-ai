import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Comply AI',
  description: 'Compliance AI Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <header className="border-b">
            <div className="container mx-auto px-4">
              <nav className="flex h-16 items-center justify-between">
                <div className="flex items-center space-x-8">
                  <h1 className="text-xl font-bold">Comply AI</h1>
                  <div className="hidden md:flex space-x-6">
                    <a href="/" className="text-sm font-medium hover:text-primary">
                      Dashboard
                    </a>
                    <a href="#" className="text-sm font-medium hover:text-primary">
                      Rules
                    </a>
                    <a href="#" className="text-sm font-medium hover:text-primary">
                      Reports
                    </a>
                    <a href="#" className="text-sm font-medium hover:text-primary">
                      Settings
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-muted-foreground">v1.0.0</span>
                </div>
              </nav>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}