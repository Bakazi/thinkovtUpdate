'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface Blackprint {
  id: string;
  title: string;
  content: string;
  quality: 'GREAT' | 'GOOD' | 'POOR';
  auctionId: string;
  createdAt: string;
}

interface BlackprintViewProps {
  blackprint: Blackprint;
}

export default function BlackprintView({ blackprint }: BlackprintViewProps) {
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const preview = blackprint.content.slice(0, 500) + (blackprint.content.length > 500 ? '...' : '');

  const qualityConfig = {
    GREAT: { color: '#10b981', label: 'EXCEPTIONAL', glow: 'rgba(16, 185, 129, 0.5)' },
    GOOD: { color: '#3b82f6', label: 'VERIFIED', glow: 'rgba(59, 130, 246, 0.5)' },
    POOR: { color: '#ef4444', label: 'FRAGMENT', glow: 'rgba(239, 68, 68, 0.5)' },
  };

  const quality = qualityConfig[blackprint.quality];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-xl"
      style={{
        background: revealed 
          ? 'linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)'
          : 'linear-gradient(145deg, #050505 0%, #0f0f0f 50%, #050505 100%)',
        border: `2px solid ${revealed ? quality.color : 'rgba(75, 85, 99, 0.5)'}`,
        boxShadow: revealed ? `0 8px 40px ${quality.glow}` : '0 8px 32px rgba(0, 0, 0, 0.8)',
      }}
    >
      {/* Blackprint Header */}
      <div className="relative px-6 py-5 border-b border-gray-700/50">
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ 
              background: revealed ? `${quality.color}20` : 'rgba(75, 85, 99, 0.2)',
              boxShadow: revealed ? `0 0 20px ${quality.glow}` : 'none',
            }}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: revealed ? quality.color : '#6b7280' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold tracking-wider" style={{ color: revealed ? quality.color : '#9ca3af' }}>
              BLACKPRINT
            </h2>
            <p className="text-sm text-gray-500">Classified Intelligence • Auction Exclusive</p>
          </div>
          {revealed && (
            <div 
              className="px-4 py-1.5 rounded-full text-xs font-bold tracking-widest"
              style={{ 
                background: `${quality.color}20`,
                border: `1px solid ${quality.color}40`,
                color: quality.color,
              }}
            >
              {quality.label}
            </div>
          )}
        </div>
      </div>

      {/* Blackprint Content */}
      <div className="p-6">
        {!revealed ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors"
              onClick={() => setRevealed(true)}
            >
              <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Encrypted Content</h3>
            <p className="text-sm text-gray-600 mb-4">You won this auction. Click to reveal the blackprint.</p>
            <button
              onClick={() => setRevealed(true)}
              className="px-6 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              Reveal Blackprint
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-4" style={{ color: quality.color }}>
              {blackprint.title}
            </h3>
            
            <div className="prose prose-invert max-w-none">
              <div className="leading-relaxed whitespace-pre-wrap text-gray-300">
                {expanded ? blackprint.content : preview}
              </div>
            </div>

            {blackprint.content.length > 500 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-4 text-sm flex items-center gap-2 transition-colors hover:opacity-80"
                style={{ color: quality.color }}
              >
                {expanded ? 'Show Less' : 'Read Full Blackprint'}
                <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* Blackprint Footer */}
      <div className="px-6 py-4 border-t border-gray-700/50 bg-gray-900/30">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span className="tracking-wider">CLASSIFICATION: EXCLUSIVE</span>
          <span>ID: {blackprint.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }}
      />
    </motion.div>
  );
}
