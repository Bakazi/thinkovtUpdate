'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuctionCard from '@/components/auctions/AuctionCard'

interface Auction {
  id: string
  title: string
  description: string
  status: string
  startTime: string
  endTime: string
  startingBid: number
  _count?: { bids: number }
}

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auctions')
      .then(r => r.json())
      .then(data => {
        setAuctions(data.auctions || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Live Auctions</h1>
      {auctions.length === 0 ? (
        <p className="text-gray-500">No active auctions at this time.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map(auction => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </div>
  )
}
