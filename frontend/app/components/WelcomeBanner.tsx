'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * A one-time dismissible banner shown on first visit.
 */
export default function WelcomeBanner() {
  const STORAGE_KEY = 'aa_welcome_banner_dismissed'
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show if not dismissed before
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (!dismissed) {
        setVisible(true)
      }
    }
  }, [])

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="bg-blue-50 border-b border-blue-200 text-blue-900 text-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div>
        <p className="font-medium mb-1">Welcome</p>
        <p>
          This prototype demonstrates the capabilities of the <span className="font-semibold">any-agent</span> library by Mozilla.ai.
          It's still a work in progress but you should be able to compose, test, and evaluate agents.
        </p>
        <p className="mt-1">
          Please note that by continuing, you agree to our{' '}
          <Link href="/privacy" className="underline hover:text-blue-700">privacy policy</Link> and{' '}
          <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-700">Vercel's</a> where this prototype is hosted.
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 self-start sm:self-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md mt-2 sm:mt-0"
      >
        I understand
      </button>
    </div>
  )
} 