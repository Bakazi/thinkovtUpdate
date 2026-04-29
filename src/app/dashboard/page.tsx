'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Blueprint {
  id: string;
  title: string;
  idea: string;
  status: string;
  content: string | null;
  rejectionReason: string | null;
  paymentRequired: boolean;
  paymentId: string | null;
  createdAt: string;
}

interface TierInfo {
  id: string;
  name: string;
  slug: string;
  price: number;
  maxBlueprints: number;
  features: string[];
}

interface SubscriptionData {
  tier: TierInfo | null;
  status: string;
  blueprintCountThisMonth: number;
  paymentMode?: string;
  blueprintPrice?: number;
  allTiers?: TierInfo[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#080810',
  cardBg: 'rgba(28,28,46,0.3)',
  gold: '#C9A84C',
  cream: '#F0EAD6',
  muted: '#BDB49A',
  dim: '#7A6228',
  danger: '#C0392B',
  success: '#2ecc71',
  orange: '#E67E22',
  lightGold: '#E8C97A',
};

const DEFAULT_TIERS: TierInfo[] = [
  {
    id: '',
    name: 'Free',
    slug: 'free',
    price: 0,
    maxBlueprints: 1,
    features: ['1 blueprint per month', 'Basic Engine analysis', 'Community access'],
  },
  {
    id: '',
    name: 'Standard',
    slug: 'standard',
    price: 97,
    maxBlueprints: 10,
    features: ['10 blueprints per month', 'Full Thinkovr analysis', 'Priority generation', 'Email support'],
  },
  {
    id: '',
    name: 'Premium',
    slug: 'premium',
    price: 297,
    maxBlueprints: 999,
    features: ['Unlimited blueprints', 'Full Thinkovr analysis', 'Instant generation', 'Priority admin review', 'Detailed risk assessment', 'Direct Thinkovr support'],
  },
];

// ─── Helper: Status badge ────────────────────────────────────────────────────

function statusBadgeColor(s: string): { color: string; bg: string } {
  switch (s) {
    case 'PENDING':
      return { color: COLORS.gold, bg: 'rgba(201,168,76,0.1)' };
    case 'GENERATING':
      return { color: COLORS.lightGold, bg: 'rgba(232,201,122,0.1)' };
    case 'GENERATED':
      return { color: COLORS.gold, bg: 'rgba(201,168,76,0.1)' };
    case 'APPROVED':
      return { color: COLORS.success, bg: 'rgba(46,204,113,0.1)' };
    case 'REJECTED':
      return { color: COLORS.danger, bg: 'rgba(192,57,43,0.1)' };
    case 'PAYMENT_PENDING':
      return { color: COLORS.orange, bg: 'rgba(230,126,34,0.1)' };
    default:
      return { color: COLORS.muted, bg: 'rgba(189,180,154,0.08)' };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Data
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form
  const [title, setTitle] = useState('');
  const [idea, setIdea] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Modal
  const [viewBp, setViewBp] = useState<Blueprint | null>(null);

  // Sections

  // ─── Derived ──────────────────────────────────────────────────────────────

  const userName = (session?.user as { name?: string })?.name || 'Operator';
  const userEmail = (session?.user as { email?: string })?.email || '';
  const userRole = (session?.user as { role?: string })?.role || '';

  const currentTier = subscription?.tier || null;
  const tiers = subscription?.allTiers || DEFAULT_TIERS;
  // Count only "delivered" blueprints (match backend enforcement in /api/blueprints/[id]/generate).
  const bpCountThisMonth = subscription?.blueprintCountThisMonth || blueprints.filter((bp) => {
    if (!['GENERATED', 'APPROVED'].includes(bp.status)) return false;
    const d = new Date(bp.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const maxBp = currentTier?.maxBlueprints ?? 1;
  const isPremium = currentTier?.slug === 'premium';
  const hasReachedLimit = !isPremium && bpCountThisMonth >= maxBp;
  const paymentMode = subscription?.paymentMode || 'SUBSCRIPTION';
  const blueprintPrice = subscription?.blueprintPrice || 97;

  // ─── Data loading ─────────────────────────────────────────────────────────

  const fetchSubscriptionData = async () => {
    try {
      const res = await fetch('/api/payments/subscription');
      if (res.ok) {
        const data = await res.json();
        const allTiers: TierInfo[] = (data.allTiers || DEFAULT_TIERS).map((t: any) => ({
          ...t,
          features: typeof t.features === 'string' ? JSON.parse(t.features) : t.features,
        }));
        const tier = data.tier ? {
          ...data.tier,
          features: typeof data.tier.features === 'string' ? JSON.parse(data.tier.features) : data.tier.features,
        } : null;
        setSubscription({
          tier,
          status: data.status || 'NONE',
          blueprintCountThisMonth: data.blueprintCountThisMonth || 0,
          paymentMode: data.paymentMode || 'SUBSCRIPTION',
          blueprintPrice: data.blueprintPrice || 97,
          allTiers,
        });
      }
    } catch {
      // Subscription endpoint not available yet - continue with defaults
    }
  };

  const fetchBlueprintData = async () => {
    try {
      const res = await fetch('/api/blueprints');
      if (res.ok) {
        const data = await res.json();
        setBlueprints(data.blueprints || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      void router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      let cancelled = false;

      const load = async () => {
        try {
          const [bpRes, subRes] = await Promise.all([
            fetch('/api/blueprints'),
            fetch('/api/payments/subscription').catch(() => null),
          ]);

          if (cancelled) return;

          if (bpRes.ok) {
            const bpData = await bpRes.json();
            setBlueprints(bpData.blueprints || []);
          }

          if (subRes && subRes.ok) {
            const data = await subRes.json();
            const allTiers: TierInfo[] = (data.allTiers || DEFAULT_TIERS).map((t: any) => ({
              ...t,
              features: typeof t.features === 'string' ? JSON.parse(t.features) : t.features,
            }));
            const tier = data.tier ? {
              ...data.tier,
              features: typeof data.tier.features === 'string' ? JSON.parse(data.tier.features) : data.tier.features,
            } : null;
            setSubscription({
              tier,
              status: data.status || 'NONE',
              blueprintCountThisMonth: data.blueprintCountThisMonth || 0,
              paymentMode: data.paymentMode || 'SUBSCRIPTION',
              blueprintPrice: data.blueprintPrice || 97,
              allTiers,
            });
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      };

      void load();
      return () => { cancelled = true; };
    }
  }, [status, router]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !idea.trim()) return;

    if (hasReachedLimit) {
      setSubmitError("You've reached your monthly limit. Upgrade your plan to submit more.");
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');
    try {
      const res = await fetch('/api/blueprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), idea: idea.trim() }),
      });
      if (res.ok) {
        setTitle('');
        setIdea('');
        setSubmitSuccess('Directive submitted to The Engine. Awaiting processing.');
        fetchBlueprintData();
        fetchSubscriptionData();
      } else {
        const data = await res.json();
        setSubmitError(data.error || 'Failed to submit idea.');
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    }
    setSubmitting(false);
  };

  const handleChoosePlan = async (tierId: string) => {
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.redirectUrl) {
          void router.push(data.redirectUrl);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to initiate checkout.');
      }
    } catch {
      alert('Network error. Please try again.');
    }
  };

  const handleCompletePayment = async (bp: Blueprint) => {
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blueprintId: bp.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.redirectUrl) {
          void router.push(data.redirectUrl);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to initiate payment.');
      }
    } catch {
      alert('Network error. Please try again.');
    }
  };


  const scrollToSubscription = () => {
    document.getElementById('subscription-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // ─── Loading guard ────────────────────────────────────────────────────────

  if (status === 'loading' || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: COLORS.bg }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-mono)', color: COLORS.dim, letterSpacing: '0.25em', textTransform: 'uppercase', fontSize: 13 }}>
            Loading...
          </p>
          <div style={{ width: 120, height: 1, background: 'rgba(201,168,76,0.15)', margin: '16px auto 0', borderRadius: 1, overflow: 'hidden' }}>
            <div style={{
              width: '40%', height: '100%', background: COLORS.gold,
              animation: 'loadingBar 1.2s ease-in-out infinite',
            }} />
          </div>
        </div>
        <style>{`
          @keyframes loadingBar {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(350%); }
          }
        `}</style>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.bg, color: COLORS.cream }}>
      {/* ═══ SIDEBAR ═══ */}
      <aside style={{
        width: 240, background: '#04040A', borderRight: '1px solid rgba(201,168,76,0.15)',
        padding: '32px 0', position: 'fixed', left: 0, top: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 24px', marginBottom: 40 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.22em',
              color: COLORS.gold, textTransform: 'uppercase', margin: 0,
            }}>
              Thinkovr
            </h2>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
              color: COLORS.dim, textTransform: 'uppercase', marginTop: 4,
            }}>
              My Dashboard
            </p>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ padding: '0 12px', flex: 1 }}>
          {[
            { href: '#submit', label: 'Submit Idea', onClick: undefined },
            { href: '#blueprints', label: 'My Blueprints', onClick: undefined },
            { href: '#subscription', label: 'Subscription', onClick: scrollToSubscription },
            { href: '/auctions', label: 'Live Auctions', onClick: undefined, external: true },
            { href: '/goldprints', label: 'My Goldprints', onClick: undefined, external: true },
          ].map((link) => {
            const navStyle = {
              display: 'block', padding: '13px 16px', fontFamily: 'var(--font-mono)',
              fontSize: 10, letterSpacing: '0.16em', color: COLORS.muted,
              textTransform: 'uppercase', textDecoration: 'none',
              borderLeft: '2px solid transparent', transition: 'all 0.2s',
            };
            const hoverProps = {
              onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
                e.currentTarget.style.color = COLORS.gold;
                (e.currentTarget as HTMLElement).style.borderLeftColor = COLORS.gold;
                (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.04)';
              },
              onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
                e.currentTarget.style.color = COLORS.muted;
                (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              },
            };
            if (link.external) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={navStyle}
                  {...hoverProps}
                >
                  {link.label}
                </Link>
              );
            }
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  if (link.onClick) {
                    e.preventDefault();
                    link.onClick();
                  }
                }}
                style={navStyle}
                {...hoverProps}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div style={{
          padding: '20px 24px 0', borderTop: '1px solid rgba(201,168,76,0.1)',
        }}>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: COLORS.muted,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2,
          }}>
            {userName}
          </p>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, color: COLORS.dim, marginBottom: 14,
          }}>
            {userEmail}
          </p>
          <button
            onClick={() => signOut({ callbackUrl: window.location.origin + '/' })}
            style={{
              width: '100%', padding: '9px 12px', background: 'transparent',
              border: `1px solid rgba(192,57,43,0.35)`,
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em',
              color: COLORS.danger, textTransform: 'uppercase', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(192,57,43,0.08)';
              e.currentTarget.style.borderColor = COLORS.danger;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(192,57,43,0.35)';
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{
        marginLeft: 240, flex: 1, padding: '48px 56px 80px', maxWidth: 960,
      }}>
        {/* ─── Section 1: Header ─── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: 48, paddingBottom: 32, borderBottom: '1px solid rgba(201,168,76,0.08)',
        }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '0.06em',
              color: COLORS.gold, textTransform: 'uppercase', margin: '0 0 10px 0',
            }}>
              My Dashboard
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 16, color: COLORS.muted,
              fontStyle: 'italic', margin: 0,
            }}>
              Welcome, {userName}. Submit your parameters. The Engine will deliver.
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: window.location.origin + '/' })}
            style={{
              padding: '10px 22px', background: 'transparent',
              border: '1px solid rgba(201,168,76,0.15)',
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em',
              color: COLORS.muted, textTransform: 'uppercase', cursor: 'pointer',
              transition: 'all 0.2s', flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = COLORS.gold;
              e.currentTarget.style.color = COLORS.gold;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)';
              e.currentTarget.style.color = COLORS.muted;
            }}
          >
            Logout
          </button>
        </div>

        {/* ─── Section 2: Submit New Idea ─── */}
        <section id="submit" style={{ marginBottom: 56 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.12em',
            color: COLORS.cream, textTransform: 'uppercase', margin: '0 0 8px 0',
          }}>
            Submit New Idea
          </h2>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: COLORS.dim,
            letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 24px 0',
          }}>
            {!isPremium && (
              <span>{bpCountThisMonth} of {maxBp} blueprints remaining this month</span>
            )}
            {isPremium && (
              <span>Unlimited blueprints available</span>
            )}
          </p>

          {hasReachedLimit && (
            <div style={{
              padding: '14px 18px', background: 'rgba(192,57,43,0.08)',
              border: '1px solid rgba(192,57,43,0.25)', marginBottom: 20,
              fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.danger,
              letterSpacing: '0.04em',
            }}>
              You&#39;ve reached your monthly limit.{' '}
              <span
                style={{ color: COLORS.gold, cursor: 'pointer', textDecoration: 'underline' }}
                onClick={scrollToSubscription}
              >
                Upgrade your plan
              </span>{' '}
              to submit more.
            </div>
          )}

          {paymentMode === 'PER_BLUEPRINT' && !hasReachedLimit && (
            <div style={{
              padding: '12px 18px', background: 'rgba(201,168,76,0.06)',
              border: '1px solid rgba(201,168,76,0.15)', marginBottom: 20,
              fontFamily: 'var(--font-mono)', fontSize: 10, color: COLORS.muted,
              letterSpacing: '0.04em',
            }}>
              After admin approval, you&#39;ll need to pay R{blueprintPrice} to receive your blueprint.
            </div>
          )}

          {submitError && (
            <div style={{
              padding: '12px 18px', background: 'rgba(192,57,43,0.08)',
              border: '1px solid rgba(192,57,43,0.25)', marginBottom: 20,
              fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.danger,
            }}>
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div style={{
              padding: '12px 18px', background: 'rgba(46,204,113,0.06)',
              border: '1px solid rgba(46,204,113,0.2)', marginBottom: 20,
              fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.success,
            }}>
              {submitSuccess}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{
                display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9,
                letterSpacing: '0.2em', color: COLORS.gold, textTransform: 'uppercase', marginBottom: 8,
              }}>
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={submitting || hasReachedLimit}
                placeholder="Name your directive"
                style={{
                  width: '100%', background: 'rgba(240,234,214,0.03)',
                  border: '1px solid rgba(201,168,76,0.15)', color: COLORS.cream,
                  padding: '14px 16px', fontFamily: 'var(--font-body)', fontSize: 15,
                  outline: 'none', transition: 'border-color 0.3s',
                  ...(hasReachedLimit ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
                }}
                onFocus={(e) => { if (!hasReachedLimit) e.currentTarget.style.borderColor = COLORS.gold; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)'; }}
              />
            </div>
            <div>
              <label style={{
                display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9,
                letterSpacing: '0.2em', color: COLORS.gold, textTransform: 'uppercase', marginBottom: 8,
              }}>
                Your Idea / Parameters
              </label>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                required
                disabled={submitting || hasReachedLimit}
                rows={6}
                placeholder="Describe your business idea, career goal, or the challenge you want The Engine to process. Be specific. Vagueness produces vague directives."
                style={{
                  width: '100%', background: 'rgba(240,234,214,0.03)',
                  border: '1px solid rgba(201,168,76,0.15)', color: COLORS.cream,
                  padding: '14px 16px', fontFamily: 'var(--font-body)', fontSize: 14,
                  outline: 'none', resize: 'vertical', transition: 'border-color 0.3s',
                  ...(hasReachedLimit ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
                }}
                onFocus={(e) => { if (!hasReachedLimit) e.currentTarget.style.borderColor = COLORS.gold; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)'; }}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || hasReachedLimit}
              style={{
                padding: '16px', background: submitting ? COLORS.dim : COLORS.gold,
                color: COLORS.bg, border: 'none',
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em',
                textTransform: 'uppercase', cursor: submitting || hasReachedLimit ? 'not-allowed' : 'pointer',
                transition: 'background 0.3s, opacity 0.3s',
                opacity: hasReachedLimit ? 0.4 : 1,
              }}
              onMouseEnter={(e) => {
                if (!submitting && !hasReachedLimit) e.currentTarget.style.background = '#d4b65e';
              }}
              onMouseLeave={(e) => {
                if (!submitting) e.currentTarget.style.background = COLORS.gold;
              }}
            >
              {submitting ? 'Submitting...' : 'Submit to The Engine'}
            </button>
          </form>
        </section>

        {/* ─── Section 3: My Blueprints ─── */}
        <section id="blueprints" style={{ marginBottom: 56 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.12em',
            color: COLORS.cream, textTransform: 'uppercase', margin: '0 0 24px 0',
          }}>
            My Blueprints
          </h2>

          <div style={{
            border: '1px solid rgba(201,168,76,0.1)', overflow: 'hidden',
            ...(blueprints.length > 0 ? { maxHeight: 500, overflowY: 'auto' } : {}),
          }}>
            {blueprints.length === 0 ? (
              <div style={{
                padding: 48, textAlign: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 10, color: COLORS.dim,
                letterSpacing: '0.08em',
              }}>
                No blueprints yet. Submit your first idea above.
              </div>
            ) : (
              blueprints.map((bp) => {
                const sc = statusBadgeColor(bp.status);
                return (
                  <div key={bp.id} style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(201,168,76,0.06)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20,
                    transition: 'background 0.2s',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,168,76,0.02)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.08em',
                        color: COLORS.cream, textTransform: 'uppercase', margin: '0 0 4px 0',
                      }}>
                        {bp.title}
                      </h3>
                      <p style={{
                        fontFamily: 'var(--font-body)', fontSize: 12, color: COLORS.dim,
                        fontStyle: 'italic', maxWidth: 460, margin: '0 0 4px 0',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {bp.idea.slice(0, 120)}{bp.idea.length > 120 ? '...' : ''}
                      </p>
                      {bp.status === 'REJECTED' && bp.rejectionReason && (
                        <p style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10, color: COLORS.danger,
                          margin: '4px 0 0 0', letterSpacing: '0.04em',
                        }}>
                          Reason: {bp.rejectionReason}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
                        color: sc.color, background: sc.bg,
                        border: `1px solid ${sc.color}33`, padding: '4px 10px',
                        textTransform: 'uppercase', whiteSpace: 'nowrap',
                      }}>
                        {bp.status.replace(/_/g, ' ')}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9, color: COLORS.dim, whiteSpace: 'nowrap',
                      }}>
                        {new Date(bp.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {bp.status === 'APPROVED' && bp.content && (
                        <button
                          onClick={() => setViewBp(bp)}
                          style={{
                            padding: '7px 14px', background: 'transparent',
                            border: '1px solid rgba(201,168,76,0.3)',
                            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                            color: COLORS.gold, textTransform: 'uppercase', cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(201,168,76,0.08)';
                            e.currentTarget.style.borderColor = COLORS.gold;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)';
                          }}
                        >
                          View Blueprint
                        </button>
                      )}
                      {bp.status === 'PAYMENT_PENDING' && (
                        <button
                          onClick={() => handleCompletePayment(bp)}
                          style={{
                            padding: '7px 14px', background: 'rgba(230,126,34,0.1)',
                            border: '1px solid rgba(230,126,34,0.4)',
                            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                            color: COLORS.orange, textTransform: 'uppercase', cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(230,126,34,0.18)';
                            e.currentTarget.style.borderColor = COLORS.orange;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(230,126,34,0.1)';
                            e.currentTarget.style.borderColor = 'rgba(230,126,34,0.4)';
                          }}
                        >
                          Complete Payment
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ─── Section 4: Subscription ─── */}
        <section id="subscription-section">
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.12em',
            color: COLORS.cream, textTransform: 'uppercase', margin: '0 0 24px 0',
          }}>
            Subscription
          </h2>

          {/* Current Plan Card */}
          <div style={{
            background: COLORS.cardBg, border: '1px solid rgba(201,168,76,0.12)',
            padding: '28px 32px', marginBottom: 32,
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
              color: COLORS.dim, textTransform: 'uppercase', margin: '0 0 8px 0',
            }}>
              Current Plan
            </p>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 20, color: COLORS.gold,
              textTransform: 'uppercase', margin: '0 0 6px 0', letterSpacing: '0.08em',
            }}>
              {currentTier ? currentTier.name : 'Free'}
              {currentTier && currentTier.price > 0 && (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: COLORS.muted, marginLeft: 8 }}>
                  — R{currentTier.price}/mo
                </span>
              )}
            </h3>
            {currentTier && (
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: COLORS.muted,
                letterSpacing: '0.06em', margin: '0 0 14px 0',
              }}>
                {currentTier.maxBlueprints >= 999
                  ? 'Unlimited blueprints per month'
                  : `${maxBp} blueprint${maxBp !== 1 ? 's' : ''} per month`
                }
              </p>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0,
            }}>
              <div style={{ flex: 1, maxWidth: 200, height: 6, background: 'rgba(201,168,76,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: isPremium ? '100%' : `${Math.min((bpCountThisMonth / maxBp) * 100, 100)}%`,
                  height: '100%', background: hasReachedLimit ? COLORS.danger : COLORS.gold,
                  borderRadius: 3, transition: 'width 0.5s',
                }} />
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, color: COLORS.muted,
                letterSpacing: '0.06em',
              }}>
                {bpCountThisMonth} of {isPremium ? '∞' : maxBp} used this month
              </span>
            </div>
          </div>

          {/* Tier Cards */}
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em',
            color: COLORS.dim, textTransform: 'uppercase', margin: '0 0 16px 0',
          }}>
            Available Plans
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 40,
          }}>
            {tiers.map((tier) => {
              const isCurrent = currentTier?.slug === tier.slug;
              const isUnlimited = tier.maxBlueprints >= 999;
              return (
                <div key={tier.slug} style={{
                  background: COLORS.cardBg,
                  border: isCurrent
                    ? `1px solid rgba(201,168,76,0.4)`
                    : '1px solid rgba(201,168,76,0.08)',
                  padding: '28px 24px',
                  display: 'flex', flexDirection: 'column',
                  transition: 'border-color 0.3s',
                }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) e.currentTarget.style.borderColor = 'rgba(201,168,76,0.08)';
                  }}
                >
                  <h4 style={{
                    fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.1em',
                    color: COLORS.cream, textTransform: 'uppercase', margin: '0 0 6px 0',
                  }}>
                    {tier.name}
                  </h4>
                  <p style={{
                    fontFamily: 'var(--font-body)', fontSize: 20, color: COLORS.gold,
                    margin: '0 0 4px 0', fontStyle: 'italic',
                  }}>
                    R{tier.price}<span style={{ fontSize: 12, color: COLORS.dim }}>/mo</span>
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, color: COLORS.dim,
                    letterSpacing: '0.06em', margin: '0 0 18px 0',
                  }}>
                    {isUnlimited ? 'Unlimited blueprints' : `${tier.maxBlueprints} blueprints/month`}
                  </p>
                  <ul style={{
                    listStyle: 'none', padding: 0, margin: '0 0 24px 0', flex: 1,
                  }}>
                    {tier.features.map((f, i) => (
                      <li key={i} style={{
                        fontFamily: 'var(--font-body)', fontSize: 12, color: COLORS.muted,
                        padding: '4px 0', borderBottom: '1px solid rgba(201,168,76,0.04)',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <span style={{
                          color: COLORS.gold, fontSize: 10, flexShrink: 0,
                        }}>◆</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled={isCurrent}
                    onClick={() => handleChoosePlan(tier.id || tier.slug)}
                    style={{
                      padding: '12px', background: isCurrent ? 'rgba(201,168,76,0.06)' : COLORS.gold,
                      color: isCurrent ? COLORS.dim : COLORS.bg,
                      border: isCurrent ? '1px solid rgba(201,168,76,0.15)' : '1px solid ' + COLORS.gold,
                      fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em',
                      textTransform: 'uppercase', cursor: isCurrent ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrent) e.currentTarget.style.background = '#d4b65e';
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrent) e.currentTarget.style.background = COLORS.gold;
                    }}
                  >
                    {isCurrent ? 'Current Plan' : 'Choose Plan'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Payment Methods */}
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em',
            color: COLORS.dim, textTransform: 'uppercase', margin: '0 0 16px 0',
          }}>
            Payment Methods
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18,
          }}>
            {/* PayFast */}
            <div style={{
              background: COLORS.cardBg,
              border: '1px solid rgba(46,204,113,0.2)',
              padding: '24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 10,
                background: 'rgba(46,204,113,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 11, color: COLORS.success,
                letterSpacing: '0.1em', fontWeight: 600,
              }}>
                PF
              </div>
              <p style={{
                fontFamily: 'var(--font-display)', fontSize: 13, color: COLORS.cream,
                letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0,
              }}>
                PayFast
              </p>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
                color: COLORS.success, textTransform: 'uppercase',
                background: 'rgba(46,204,113,0.08)',
                border: '1px solid rgba(46,204,113,0.2)',
                padding: '4px 12px',
              }}>
                Available
              </span>
            </div>

            {/* PayPal */}
            <div style={{
              background: COLORS.cardBg,
              border: '1px solid rgba(201,168,76,0.06)',
              padding: '24px', opacity: 0.45,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 10,
                background: 'rgba(189,180,154,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 11, color: COLORS.muted,
                letterSpacing: '0.1em', fontWeight: 600,
              }}>
                PP
              </div>
              <p style={{
                fontFamily: 'var(--font-display)', fontSize: 13, color: COLORS.cream,
                letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0,
              }}>
                PayPal
              </p>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
                color: COLORS.dim, textTransform: 'uppercase',
                background: 'rgba(122,98,40,0.08)',
                border: '1px solid rgba(122,98,40,0.15)',
                padding: '4px 12px',
              }}>
                Coming Soon
              </span>
            </div>

            {/* Visa */}
            <div style={{
              background: COLORS.cardBg,
              border: '1px solid rgba(201,168,76,0.06)',
              padding: '24px', opacity: 0.45,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 10,
                background: 'rgba(189,180,154,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 11, color: COLORS.muted,
                letterSpacing: '0.1em', fontWeight: 600,
              }}>
                V
              </div>
              <p style={{
                fontFamily: 'var(--font-display)', fontSize: 13, color: COLORS.cream,
                letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0,
              }}>
                Visa / Mastercard
              </p>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
                color: COLORS.dim, textTransform: 'uppercase',
                background: 'rgba(122,98,40,0.08)',
                border: '1px solid rgba(122,98,40,0.15)',
                padding: '4px 12px',
              }}>
                Coming Soon
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* ═══ BLUEPRINT VIEWER MODAL (FULL SCREEN OVERLAY) ═══ */}
      {viewBp && viewBp.content && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(4,4,10,0.92)',
            zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 40,
            animation: 'fadeIn 0.25s ease',
          }}
          onClick={() => setViewBp(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0C0C18',
              border: '1px solid rgba(201,168,76,0.15)',
              maxWidth: 780, width: '100%',
              maxHeight: '85vh', overflow: 'auto',
              padding: '48px 52px',
              animation: 'slideUp 0.3s ease',
            }}
          >
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 22, color: COLORS.gold,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              margin: '0 0 6px 0',
            }}>
              {viewBp.title}
            </h3>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, color: COLORS.dim,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              margin: '0 0 28px 0',
            }}>
              Generated by Thinkovr
            </p>
            <div style={{
              background: 'rgba(201,168,76,0.03)',
              border: '1px solid rgba(201,168,76,0.08)',
              padding: '28px 32px',
            }}>
              <pre style={{
                fontFamily: 'var(--font-body)', fontSize: 14, color: COLORS.cream,
                whiteSpace: 'pre-wrap', lineHeight: 1.9, margin: 0,
                wordBreak: 'break-word',
              }}>
                {viewBp.content}
              </pre>
            </div>
            <div style={{ marginTop: 28, textAlign: 'center' }}>
              <button
                onClick={() => setViewBp(null)}
                style={{
                  padding: '12px 28px', background: 'transparent',
                  border: '1px solid rgba(201,168,76,0.18)',
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
                  color: COLORS.muted, textTransform: 'uppercase', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = COLORS.gold;
                  e.currentTarget.style.color = COLORS.gold;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.18)';
                  e.currentTarget.style.color = COLORS.muted;
                }}
              >
                Close
              </button>
            </div>
          </div>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* ═══ Global scrollbar styles ═══ */}
      <style>{`
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(201,168,76,0.03);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(201,168,76,0.15);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(201,168,76,0.3);
        }
      `}</style>
    </div>
  );
}
