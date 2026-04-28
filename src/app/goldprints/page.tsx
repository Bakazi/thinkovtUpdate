'use client'

import { useEffect, useState } from 'react'
import GoldprintView from '@/components/prints/GoldprintView'

interface Goldprint {
  id: string
  title: string
  content: string
  source: 'APPROVED' | 'AUCTION'
  isReady: boolean
  readyAt?: string
  viewedAt?: string
  createdAt: string
}

export default function GoldprintsPage() {
  const [goldprints, setGoldprints] = useState<Goldprint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/goldprints')
      .then(r => r.json())
      .then(data => {
        setGoldprints(data.goldprints || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6 text-amber-400">Your Goldprints</h1>
      {goldprints.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-gray-400 mb-4">No goldprints yet.</p>
          <p className="text-sm text-gray-500">
            Goldprints are unlocked when you purchase blueprints and submit ideas for AI approval.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goldprints.map(goldprint => (
            <GoldprintView key={goldprint.id} goldprint={goldprint} />
          ))}
        </div>
      )}
    </div>
  )
}
