'use client';

import { motion } from 'framer-motion';
import AuctionCountdown from './AuctionCountdown';

interface Auction {
  id: string;
  title: string;
  description: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'NO_SHOW';
  startTime: string;
  endTime: string;
  startingBid: number;
  bidIncrement: number;
  alertTimingMinutes: number;
  customAlertMessage?: string;
  winnerId?: string;
  winningBid?: number;
  _count?: {
    bids: number;
  };
  bids?: Array<{
    amount: number;
    user: {
      name: string;
    };
  }>;
}

interface AuctionCardProps {
  auction: Auction;
  onBid?: () => void;
  userBid?: number;
}

export default function AuctionCard({ auction, onBid, userBid }: AuctionCardProps) {
  const isWinner = auction.winnerId && userBid && auction.winningBid === userBid;
  const currentHighBid = auction.bids?.[0]?.amount || auction.startingBid;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        border: '1px solid rgba(234, 179, 8, 0.3)',
        boxShadow: '0 0 30px rgba(234, 179, 8, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      {/* Auction Header */}
      <div className="relative px-6 py-4 border-b border-amber-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Auction Icon */}
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9l3 3m0 0l3-3m-3 3V4.5m9 12.75l-1.732 1a3 3 0 01-3.464 0L12 17.25l-5.554 3.072a3 3 0 01-3.464 0L1.5 19.5V5.25m9 12.75l3 3m0 0l3-3m-3 3V4.5" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-100" style={{ fontFamily: 'var(--font-cinzel)' }}>
                {auction.title}
              </h3>
              <p className="text-sm text-amber-300/60">
                {auction._count?.bids || 0} bids • Starting at R{auction.startingBid}
              </p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div 
            className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wider"
            style={{
              background: auction.status === 'LIVE' 
                ? 'rgba(34, 197, 94, 0.2)' 
                : auction.status === 'ENDED'
                ? 'rgba(107, 114, 128, 0.2)'
                : auction.status === 'SCHEDULED'
                ? 'rgba(234, 179, 8, 0.2)'
                : 'rgba(100, 116, 139, 0.2)',
              color: auction.status === 'LIVE'
                ? '#22c55e'
                : auction.status === 'ENDED'
                ? '#9ca3af'
                : auction.status === 'SCHEDULED'
                ? '#eab308'
                : '#64748b',
              border: `1px solid ${auction.status === 'LIVE' 
                ? 'rgba(34, 197, 94, 0.3)' 
                : auction.status === 'ENDED'
                ? 'rgba(107, 114, 128, 0.3)'
                : auction.status === 'SCHEDULED'
                ? 'rgba(234, 179, 8, 0.3)'
                : 'rgba(100, 116, 139, 0.3)'}`,
            }}
          >
            {auction.status === 'LIVE' && '● LIVE'}
            {auction.status === 'ENDED' && 'ENDED'}
            {auction.status === 'SCHEDULED' && 'UPCOMING'}
            {auction.status === 'NO_SHOW' && 'NO BIDS'}
          </div>
        </div>
      </div>

      {/* Countdown Timer */}
      <div className="px-6 py-4 border-b border-amber-500/10">
        <AuctionCountdown 
          endTime={auction.endTime}
          startTime={auction.startTime}
          status={auction.status}
          alertMinutes={auction.alertTimingMinutes}
        />
        {auction.customAlertMessage && (
          <p className="text-center text-sm text-amber-300/80 mt-2">
            {auction.customAlertMessage}
          </p>
        )}
      </div>

      {/* Auction Details */}
      <div className="p-6">
        <p className="text-slate-300 mb-4">{auction.description}</p>

        {/* Current Bid Info */}
        <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <span className="text-slate-400">Current High Bid</span>
          <span className="text-2xl font-bold text-amber-400">
            R{Number(currentHighBid).toLocaleString()}
          </span>
        </div>

        {auction.winningBid && (
          <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
            <span className="text-slate-400">Winning Bid</span>
            <span className="text-xl font-bold text-green-400">
              R{Number(auction.winningBid).toLocaleString()}
            </span>
          </div>
        )}

        {/* Bid Button */}
        {auction.status === 'LIVE' && onBid && (
          <button
            onClick={onBid}
            className="w-full py-3 px-4 rounded-lg font-semibold text-slate-900 transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
              boxShadow: '0 4px 20px rgba(251, 191, 36, 0.3)',
            }}
          >
            Place Bid (Min: R{Number(currentHighBid) + Number(auction.bidIncrement)})
          </button>
        )}

        {isWinner && (
          <div className="text-center py-3 px-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300">
            You won this auction! Check your Blackprints.
          </div>
        )}
      </div>

      {/* Auction Footer */}
      <div className="px-6 py-3 border-t border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center justify-between text-xs text-amber-400/60">
          <span>AUCTION #{auction.id.slice(0, 8).toUpperCase()}</span>
          <span>Bid Increment: R{auction.bidIncrement}</span>
        </div>
      </div>
    </motion.div>
  );
}
