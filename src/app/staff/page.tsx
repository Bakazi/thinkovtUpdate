'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Blueprint {
  id: string;
  title: string;
  idea: string;
  status: string;
  content: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

export default function StaffDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [bpFilter, setBpFilter] = useState<string>('ALL');
  const [selectedBp, setSelectedBp] = useState<Blueprint | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadBlueprints = useCallback(async () => {
    try {
      const res = await fetch('/api/blueprints');
      if (res.ok) {
        const data = await res.json();
        setBlueprints(data.blueprints || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated' && session?.user) {
      const role = (session.user as { role: string }).role;
      if (role !== 'STAFF' && role !== 'ADMIN') {
        router.push('/login');
        return;
      }
      loadBlueprints();
    }
  }, [status, session, router, loadBlueprints]);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/blueprints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      if (res.ok) {
        const data = await res.json();
        setBlueprints((prev) => prev.map((bp) => (bp.id === id ? { ...bp, ...data.blueprint } : bp)));
        if (selectedBp?.id === id) setSelectedBp({ ...selectedBp, ...data.blueprint });
      }
    } catch { /* ignore */ }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) { alert('Please provide a rejection reason'); return; }
    try {
      const res = await fetch(`/api/blueprints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionReason: rejectReason }),
      });
      if (res.ok) {
        const data = await res.json();
        setBlueprints((prev) => prev.map((bp) => (bp.id === id ? { ...bp, ...data.blueprint } : bp)));
        setSelectedBp(null);
        setRejectReason('');
      }
    } catch { /* ignore */ }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'PENDING': return '#C9A84C';
      case 'GENERATING': return '#E8C97A';
      case 'APPROVED': return '#2ecc71';
      case 'REJECTED': return '#C0392B';
      default: return '#BDB49A';
    }
  };

  const filteredBlueprints = bpFilter === 'ALL' ? blueprints : blueprints.filter((bp) => bp.status === bpFilter);
  const pendingCount = blueprints.filter((bp) => bp.status === 'PENDING').length;
  const approvedCount = blueprints.filter((bp) => bp.status === 'APPROVED').length;
  const rejectedCount = blueprints.filter((bp) => bp.status === 'REJECTED').length;

  if (status === 'loading' || !session) {
    return (
      <div className="bespoke-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-dim)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="bespoke-root">
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside style={{ width: 240, background: '#04040A', borderRight: '1px solid rgba(201,168,76,0.18)', padding: '32px 0', position: 'fixed', left: 0, top: 0, bottom: 0 }}>
          <div style={{ padding: '0 24px', marginBottom: 40 }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.2em', color: '#C9A84C', textTransform: 'uppercase' }}>Thinkovr Verum Engine</h2>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.45rem', letterSpacing: '0.2em', color: '#7A6228', textTransform: 'uppercase', marginTop: 4 }}>Staff Panel</p>
            </Link>
          </div>
          <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, padding: '0 24px', borderTop: '1px solid rgba(201,168,76,0.12)', paddingTop: 16 }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: '#7A6228', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{(session.user as { name: string }).name || 'Staff'}</p>
            <button onClick={() => signOut({ callbackUrl: window.location.origin + '/' })} style={{ marginTop: 12, padding: '8px 12px', background: 'transparent', border: '1px solid rgba(192,57,43,0.3)', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.15em', color: '#C0392B', textTransform: 'uppercase', cursor: 'pointer', width: '100%' }}>Logout</button>
          </div>
        </aside>

        {/* Main */}
        <main style={{ marginLeft: 240, flex: 1, padding: '40px 48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', letterSpacing: '0.05em', color: '#F0EAD6', textTransform: 'uppercase' }}>Staff Dashboard</h1>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#7A6228', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>Blueprint Review Queue</p>
            </div>
            <button onClick={() => signOut({ callbackUrl: window.location.origin + '/' })} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(201,168,76,0.18)', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', color: '#BDB49A', textTransform: 'uppercase', cursor: 'pointer' }}>Logout</button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
            {[
              { label: 'Pending Review', value: pendingCount, color: '#C9A84C' },
              { label: 'Approved', value: approvedCount, color: '#2ecc71' },
              { label: 'Rejected', value: rejectedCount, color: '#C0392B' },
            ].map((stat) => (
              <div key={stat.label} style={{ border: '1px solid rgba(201,168,76,0.12)', padding: '20px 24px', background: 'rgba(28,28,46,0.3)' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: '#7A6228', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>{stat.label}</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Blueprint Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em', color: '#F0EAD6', textTransform: 'uppercase' }}>Blueprints</h2>
            <div style={{ display: 'flex', gap: 4 }}>
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
                <button key={f} onClick={() => setBpFilter(f)} style={{ padding: '6px 12px', background: bpFilter === f ? 'rgba(201,168,76,0.15)' : 'transparent', border: bpFilter === f ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(201,168,76,0.08)', fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.1em', color: bpFilter === f ? '#C9A84C' : '#7A6228', textTransform: 'uppercase', cursor: 'pointer' }}>{f}</button>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid rgba(201,168,76,0.12)', overflow: 'auto', maxHeight: 'calc(100vh - 380px)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(28,28,46,0.6)' }}>
                  {['User', 'Title', 'Idea', 'Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.15em', color: '#7A6228', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid rgba(201,168,76,0.12)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBlueprints.map((bp) => (
                  <tr key={bp.id} style={{ borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#BDB49A' }}>{bp.user?.name || bp.user?.email}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-display)', fontSize: '0.65rem', color: '#F0EAD6', letterSpacing: '0.05em', cursor: 'pointer' }} onClick={() => setSelectedBp(bp)}>{bp.title}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#BDB49A', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>{bp.idea.slice(0, 80)}...</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.15em', color: statusColor(bp.status), border: `1px solid ${statusColor(bp.status)}33`, padding: '3px 8px', textTransform: 'uppercase' }}>{bp.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#7A6228' }}>{new Date(bp.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {(bp.status === 'PENDING' || bp.status === 'GENERATING') && (
                        <>
                          <button onClick={() => handleApprove(bp.id)} style={{ padding: '6px 12px', background: '#2ecc71', color: '#080810', border: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.45rem', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', marginRight: 4 }}>Approve</button>
                          <button onClick={() => { setSelectedBp(bp); setRejectReason(''); }} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(192,57,43,0.3)', fontFamily: 'var(--font-mono)', fontSize: '0.45rem', letterSpacing: '0.1em', color: '#C0392B', textTransform: 'uppercase', cursor: 'pointer', marginRight: 4 }}>Reject</button>
                        </>
                      )}
                      {bp.status === 'GENERATED' && (
                        <>
                          <button onClick={() => handleApprove(bp.id)} style={{ padding: '6px 12px', background: '#2ecc71', color: '#080810', border: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.45rem', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', marginRight: 4 }}>Release</button>
                          <button onClick={() => { setSelectedBp(bp); setRejectReason(''); }} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(192,57,43,0.3)', fontFamily: 'var(--font-mono)', fontSize: '0.45rem', letterSpacing: '0.1em', color: '#C0392B', textTransform: 'uppercase', cursor: 'pointer', marginRight: 4 }}>Reject</button>
                        </>
                      )}
                      <button onClick={() => setSelectedBp(bp)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(201,168,76,0.18)', fontFamily: 'var(--font-mono)', fontSize: '0.45rem', letterSpacing: '0.1em', color: '#BDB49A', textTransform: 'uppercase', cursor: 'pointer' }}>View</button>
                    </td>
                  </tr>
                ))}
                {filteredBlueprints.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#7A6228' }}>No blueprints found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* Blueprint Detail Modal */}
      {selectedBp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,4,10,0.9)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }} onClick={() => { setSelectedBp(null); setRejectReason(''); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#0C0C18', border: '1px solid rgba(201,168,76,0.18)', maxWidth: 720, width: '100%', maxHeight: '80vh', overflow: 'auto', padding: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: '#F0EAD6', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>{selectedBp.title}</h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: '#7A6228', letterSpacing: '0.1em' }}>By: {selectedBp.user?.name || selectedBp.user?.email}</p>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.15em', color: statusColor(selectedBp.status), border: `1px solid ${statusColor(selectedBp.status)}33`, padding: '4px 10px', textTransform: 'uppercase' }}>{selectedBp.status}</span>
            </div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Original Idea</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#BDB49A', fontStyle: 'italic', lineHeight: 1.7 }}>{selectedBp.idea}</p>
            </div>
            {selectedBp.content && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Generated Blueprint</p>
                <div style={{ background: 'rgba(201,168,76,0.03)', border: '1px solid rgba(201,168,76,0.08)', padding: 24 }}>
                  <pre style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#F0EAD6', whiteSpace: 'pre-wrap', lineHeight: 1.8, margin: 0 }}>{selectedBp.content}</pre>
                </div>
              </div>
            )}
            {selectedBp.rejectionReason && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: '#C0392B', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Rejection Reason</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#BDB49A', fontStyle: 'italic' }}>{selectedBp.rejectionReason}</p>
              </div>
            )}
            {(selectedBp.status === 'PENDING' || selectedBp.status === 'GENERATING' || selectedBp.status === 'GENERATED') && (
              <div style={{ borderTop: '1px solid rgba(201,168,76,0.12)', paddingTop: 20 }}>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason..." rows={3} style={{ width: '100%', background: 'rgba(240,234,214,0.04)', border: '1px solid rgba(201,168,76,0.18)', color: '#F0EAD6', padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: '0.85rem', outline: 'none', resize: 'vertical', marginBottom: 12 }} />
                <button onClick={() => handleReject(selectedBp.id)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #C0392B', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.1em', color: '#C0392B', textTransform: 'uppercase', cursor: 'pointer' }}>Confirm Rejection</button>
              </div>
            )}
            <button onClick={() => { setSelectedBp(null); setRejectReason(''); }} style={{ marginTop: 20, padding: '10px 20px', background: 'transparent', border: '1px solid rgba(201,168,76,0.18)', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.1em', color: '#BDB49A', textTransform: 'uppercase', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
