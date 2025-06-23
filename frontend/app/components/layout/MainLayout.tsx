import type { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-200">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-xl font-bold text-gray-900">Workflow Composer</h1>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4">
        {children}
      </main>

      <footer className="border-t border-gray-200">
        <div className="container mx-auto p-4 text-center text-sm text-gray-500">
          <a href="/privacy" className="hover:underline">Privacy Notice</a>
        </div>
      </footer>
    </div>
  )
} 