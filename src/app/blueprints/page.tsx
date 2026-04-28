'use client'

import { useEffect, useState } from 'react'
import BlueprintView from '@/components/prints/BlueprintView'

interface Blueprint {
  id: string
  title: string
  idea: string
  content: string | null
  status: string
  createdAt: string
}

export default function BlueprintsPage() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/blueprints')
      .then(r => r.json())
      .then(data => {
        setBlueprints(data.blueprints || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6 text-blue-400">Your Blueprints</h1>
      {blueprints.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-gray-400 mb-4">No blueprints yet.</p>
          <a href="/dashboard" className="text-blue-400 underline">Go to Dashboard to create one</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blueprints.map(blueprint => (
            <BlueprintView key={blueprint.id} blueprint={blueprint} />
          ))}
        </div>
      )}
    </div>
  )
}
