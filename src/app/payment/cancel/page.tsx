'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentCancelPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080810',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-cormorant), Georgia, serif',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: 480,
        padding: '0 24px',
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(192,57,43,0.1)',
          border: '2px solid rgba(192,57,43,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 32px',
          fontSize: '2rem',
        }}>
          ✕
        </div>
        <h1 style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontSize: '1.6rem',
          letterSpacing: '0.1em',
          color: '#F0EAD6',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          Payment Cancelled
        </h1>
        <p style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontSize: '1.1rem',
          color: '#BDB49A',
          lineHeight: 1.7,
          marginBottom: 32,
        }}>
          Your payment was not completed. No charges have been made.
          You can retry anytime from your dashboard. Redirecting in {countdown} seconds.
        </p>
        <div style={{
          borderTop: '1px solid rgba(201,168,76,0.12)',
          paddingTop: 24,
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
        }}>
          <Link href="/dashboard" style={{
            padding: '12px 24px',
            background: '#C9A84C',
            color: '#080810',
            border: 'none',
            fontFamily: 'var(--font-courier), monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            cursor: 'pointer',
          }}>
            Back to Dashboard
          </Link>
          <Link href="/" style={{
            padding: '12px 24px',
            background: 'transparent',
            color: '#BDB49A',
            border: '1px solid rgba(201,168,76,0.18)',
            fontFamily: 'var(--font-courier), monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            cursor: 'pointer',
          }}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
