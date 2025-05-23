import { MainLayout } from './components/layout/MainLayout'
import WorkflowEditor from './components/WorkflowEditor'
import ChatInterface from './components/ChatInterface'

export default function Home() {
  return (
    <MainLayout>
      <div className="grid h-[calc(100vh-5rem)] grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-full rounded-lg border bg-card">
          <WorkflowEditor />
        </div>
        <div className="h-full rounded-lg border bg-card">
          <ChatInterface />
        </div>
      </div>
    </MainLayout>
  )
}
