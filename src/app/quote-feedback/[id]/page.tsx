/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function QuoteFeedbackPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [reason, setReason] = useState('');
  const [priceTooHigh, setPriceTooHigh] = useState(false);
  const [timing, setTiming] = useState('');
  const [missingFeature, setMissingFeature] = useState('');
  const [other, setOther] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setError('');
  }, []);

  const submit = async () => {
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/quotes/${id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, priceTooHigh, timing, missingFeature, other }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to submit');
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 900);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080810', color: '#F0EAD6', padding: '60px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', border: '1px solid rgba(201,168,76,0.18)', padding: 28, background: 'rgba(28,28,46,0.3)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 18, color: '#C9A84C', marginBottom: 10 }}>
          Quick feedback
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#BDB49A', letterSpacing: '0.06em', marginBottom: 22 }}>
          Help us understand why you declined the quote. This takes 30 seconds.
        </p>

        {error && (
          <div style={{ padding: '10px 12px', border: '1px solid rgba(192,57,43,0.25)', background: 'rgba(192,57,43,0.08)', color: '#C0392B', fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 14 }}>
            {error}
          </div>
        )}
        {done && (
          <div style={{ padding: '10px 12px', border: '1px solid rgba(46,204,113,0.2)', background: 'rgba(46,204,113,0.06)', color: '#2ecc71', fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 14 }}>
            Thanks. Redirecting…
          </div>
        )}

        <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#C9A84C', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
          Main reason
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="What's the #1 reason you declined?"
          style={{ width: '100%', background: 'rgba(240,234,214,0.04)', border: '1px solid rgba(201,168,76,0.18)', color: '#F0EAD6', padding: '12px 14px', fontFamily: 'var(--font-body)', outline: 'none', resize: 'vertical', marginBottom: 16 }}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#BDB49A', marginBottom: 16 }}>
          <input type="checkbox" checked={priceTooHigh} onChange={(e) => setPriceTooHigh(e.target.checked)} />
          Price was too high
        </label>

        <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#C9A84C', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
          Timing
        </label>
        <input
          value={timing}
          onChange={(e) => setTiming(e.target.value)}
          placeholder="e.g. next month, Q3, not sure"
          style={{ width: '100%', background: 'rgba(240,234,214,0.04)', border: '1px solid rgba(201,168,76,0.18)', color: '#F0EAD6', padding: '10px 12px', fontFamily: 'var(--font-mono)', outline: 'none', marginBottom: 16 }}
        />

        <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#C9A84C', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
          Missing feature / concern
        </label>
        <input
          value={missingFeature}
          onChange={(e) => setMissingFeature(e.target.value)}
          placeholder="What would need to change?"
          style={{ width: '100%', background: 'rgba(240,234,214,0.04)', border: '1px solid rgba(201,168,76,0.18)', color: '#F0EAD6', padding: '10px 12px', fontFamily: 'var(--font-mono)', outline: 'none', marginBottom: 16 }}
        />

        <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#C9A84C', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
          Anything else
        </label>
        <input
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="Optional"
          style={{ width: '100%', background: 'rgba(240,234,214,0.04)', border: '1px solid rgba(201,168,76,0.18)', color: '#F0EAD6', padding: '10px 12px', fontFamily: 'var(--font-mono)', outline: 'none', marginBottom: 18 }}
        />

        <button
          onClick={submit}
          disabled={saving || done}
          style={{ width: '100%', padding: '14px 16px', background: saving ? '#7A6228' : '#C9A84C', color: '#080810', border: 'none', fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: 10, cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Submitting…' : 'Submit feedback'}
        </button>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/dashboard" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#BDB49A', textDecoration: 'none' }}>
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

