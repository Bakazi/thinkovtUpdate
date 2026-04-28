'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface Goldprint {
  id: string;
  title: string;
  content: string;
  source: 'APPROVED' | 'AUCTION';
  isReady: boolean;
  readyAt?: string;
  viewedAt?: string;
  createdAt: string;
}

interface GoldprintViewProps {
  goldprint: Goldprint;
}

export default function GoldprintView({ goldprint }: GoldprintViewProps) {
  const [expanded, setExpanded] = useState(false);
  const [isViewed, setIsViewed] = useState(!!goldprint.viewedAt);

  const preview = goldprint.content.slice(0, 500) + (goldprint.content.length > 500 ? '...' : '');

  const handleView = () => {
    if (!isViewed) {
      setIsViewed(true);
      // TODO: Mark as viewed in database
    }
  };

  if (!goldprint.isReady) {
    return (
      <div className="relative overflow-hidden rounded-xl p-8 text-center"
        style={{
          background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
          border: '2px dashed rgba(234, 179, 8, 0.3)',
        }}
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-amber-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-amber-300/70">Goldprint Pending</h3>
        <p className="text-sm text-slate-500 mt-2">
          {goldprint.source === 'APPROVED' 
            ? 'Your goldprint is being prepared. Check back soon.'
            : 'This goldprint will be available after auction completion.'}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={handleView}
      className="relative overflow-hidden rounded-xl"
      style={{
        background: 'linear-gradient(145deg, #1a1500 0%, #3d3415 50%, #1a1500 100%)',
        border: '2px solid rgba(234, 179, 8, 0.5)',
        boxShadow: '0 8px 32px rgba(234, 179, 8, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      {/* Goldprint Header */}
      <div className="relative px-6 py-5 border-b border-amber-500/40">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center"
            style={{ boxShadow: '0 0 20px rgba(234, 179, 8, 0.3)' }}
          >
            <svg className="w-8 h-8 text-amber-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-amber-100 tracking-wider">GOLPRINT</h2>
            <p className="text-sm text-amber-300/70">Premium Intelligence Document</p>
          </div>
          <div className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-widest">
            {goldprint.source === 'APPROVED' ? 'APPROVED' : 'AUCTION'}
          </div>
        </div>
        
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent -skew-x-12 pointer-events-none" />
      </div>

      {/* Goldprint Content */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-amber-200 mb-4">{goldprint.title}</h3>
        
        <div className="prose prose-invert prose-amber max-w-none">
          <div className="text-amber-100/90 leading-relaxed whitespace-pre-wrap font-medium">
            {expanded ? goldprint.content : preview}
          </div>
        </div>

        {goldprint.content.length > 500 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 text-sm text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-2"
          >
            {expanded ? 'Show Less' : 'Read Full Goldprint'}
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {goldprint.readyAt && (
          <p className="mt-4 text-xs text-amber-400/60">
            Ready since: {new Date(goldprint.readyAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Goldprint Footer */}
      <div className="px-6 py-4 border-t border-amber-500/40 bg-amber-900/20">
        <div className="flex items-center justify-between text-xs text-amber-400/70">
          <span className="tracking-wider">CLASSIFICATION: PREMIUM</span>
          <span>ID: {goldprint.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>
    </motion.div>
  );
}
