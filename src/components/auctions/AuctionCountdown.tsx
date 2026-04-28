'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface AuctionCountdownProps {
  endTime: string;
  startTime?: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'NO_SHOW';
  alertMinutes?: number;
}

export default function AuctionCountdown({ 
  endTime, 
  startTime,
  status, 
  alertMinutes = 10 
}: AuctionCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isAlert, setIsAlert] = useState(false);

  useEffect(() => {
    if (status === 'ENDED' || status === 'NO_SHOW') {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const start = startTime ? new Date(startTime).getTime() : now;
      
      // If scheduled but not started yet
      if (status === 'SCHEDULED' && now < start) {
        const diff = start - now;
        return {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        };
      }
      
      const diff = end - now;
      const remaining = {
        days: Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))),
        hours: Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))),
        minutes: Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))),
        seconds: Math.max(0, Math.floor((diff % (1000 * 60)) / 1000)),
      };

      // Check if in alert period (last X minutes)
      const totalMinutesLeft = remaining.days * 24 * 60 + remaining.hours * 60 + remaining.minutes;
      setIsAlert(totalMinutesLeft <= alertMinutes && diff > 0);

      return remaining;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, startTime, status, alertMinutes]);

  const getStatusLabel = () => {
    if (status === 'ENDED') return 'AUCTION ENDED';
    if (status === 'NO_SHOW') return 'NO BIDS';
    if (status === 'SCHEDULED') {
      const now = new Date().getTime();
      const start = startTime ? new Date(startTime).getTime() : now;
      if (now < start) return 'STARTS IN';
    }
    return isAlert ? 'ENDING SOON' : 'LIVE';
  };

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="flex flex-col items-center">
      {/* Status Label */}
      <div 
        className="text-xs font-bold tracking-wider mb-2"
        style={{
          color: isAlert ? '#ef4444' : status === 'ENDED' ? '#6b7280' : '#22c55e',
        }}
      >
        {getStatusLabel()}
      </div>

      {/* Countdown Timer */}
      <div className="flex items-center gap-2">
        {timeLeft.days > 0 && (
          <>
            <motion.div
              animate={isAlert ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex flex-col items-center"
            >
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold"
                style={{
                  background: isAlert 
                    ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)' 
                    : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  border: `2px solid ${isAlert ? '#ef4444' : '#334155'}`,
                  color: isAlert ? '#fca5a5' : '#94a3b8',
                  boxShadow: isAlert ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none',
                }}
              >
                {formatNumber(timeLeft.days)}
              </div>
              <span className="text-[10px] text-slate-500 mt-1">DAYS</span>
            </motion.div>
            <span className="text-xl font-bold text-slate-600">:</span>
          </>
        )}
        
        <motion.div
          animate={isAlert ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
          className="flex flex-col items-center"
        >
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold"
            style={{
              background: isAlert 
                ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)' 
                : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: `2px solid ${isAlert ? '#ef4444' : '#334155'}`,
              color: isAlert ? '#fca5a5' : '#94a3b8',
              boxShadow: isAlert ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none',
            }}
          >
            {formatNumber(timeLeft.hours)}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">HRS</span>
        </motion.div>

        <span className="text-xl font-bold text-slate-600">:</span>

        <motion.div
          animate={isAlert ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity, delay: 0.1 }}
          className="flex flex-col items-center"
        >
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold"
            style={{
              background: isAlert 
                ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)' 
                : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: `2px solid ${isAlert ? '#ef4444' : '#334155'}`,
              color: isAlert ? '#fca5a5' : '#94a3b8',
              boxShadow: isAlert ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none',
            }}
          >
            {formatNumber(timeLeft.minutes)}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">MIN</span>
        </motion.div>

        <span className="text-xl font-bold text-slate-600">:</span>

        <motion.div
          animate={isAlert ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          className="flex flex-col items-center"
        >
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold"
            style={{
              background: isAlert 
                ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)' 
                : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: `2px solid ${isAlert ? '#ef4444' : '#334155'}`,
              color: isAlert ? '#fca5a5' : '#94a3b8',
              boxShadow: isAlert ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none',
            }}
          >
            {formatNumber(timeLeft.seconds)}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">SEC</span>
        </motion.div>
      </div>

      {/* Alert Message */}
      {isAlert && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          Less than {alertMinutes} minutes remaining!
        </motion.div>
      )}
    </div>
  );
}
