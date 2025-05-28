'use client'

import { useState } from 'react'
import { extractWorkflowContext } from './lib/workflowExtractor'

export default function TestWorkflowExtraction() {
  const [testContent, setTestContent] = useState('')
  const [result, setResult] = useState<any>(null)

  const sampleResponses = [
    'I can help you create a data analysis workflow. You could "Analyze customer feedback from the last month" to gain insights.',
    'Let\'s build an automation workflow. Try: "Automate email responses to customer inquiries" for better efficiency.',
    'For content generation, you might want to "Generate blog posts about AI trends" to engage your audience.',
    'Consider setting up monitoring. You could "Monitor website performance and uptime" to ensure reliability.',
    'Step 1: Create a data ingestion node to collect information from your sources.',
    'You should build a notification system that alerts users when events occur.',
  ]

  const testExtraction = () => {
    const extracted = extractWorkflowContext(testContent)
    setResult(extracted)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Workflow Context Extraction Test</h1>
      
      <div className="space-y-4 mb-6">
        <h2 className="text-lg font-semibold">Sample AI Responses:</h2>
        {sampleResponses.map((sample, index) => (
          <button
            key={index}
            onClick={() => setTestContent(sample)}
            className="block w-full text-left p-3 bg-gray-100 hover:bg-gray-200 rounded border text-sm"
          >
            {sample}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Test Content:</label>
          <textarea
            value={testContent}
            onChange={(e) => setTestContent(e.target.value)}
            className="w-full h-32 p-3 border rounded"
            placeholder="Enter AI assistant response to test extraction..."
          />
        </div>

        <button
          onClick={testExtraction}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Extract Workflow Context
        </button>

        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <h3 className="font-semibold mb-2">Extracted Context:</h3>
            <div className="space-y-2 text-sm">
              <div><strong>Suggestion:</strong> "{result.suggestion}"</div>
              <div><strong>Context:</strong> {result.context}</div>
              <div><strong>Workflow Type:</strong> {result.workflowType}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 