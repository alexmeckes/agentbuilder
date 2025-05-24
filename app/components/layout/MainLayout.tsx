import type { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-xl font-bold text-gray-900">Workflow Composer</h1>
        </div>
      </header>
      <main className="container mx-auto p-4">
        {children}
      </main>
    </div>
  )
} 