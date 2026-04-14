'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/* ──────────────────────── types ──────────────────────── */

interface Blueprint {
  id: string;
  title: string;
  idea: string;
  status: string;
  content: string | null;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  _count: { blueprints: number };
  subscription?: { status: string; tier?: { name: string } } | null;
}

interface AIConfig {
  id: string;
  key: string;
  value: string;
}

interface PaymentTier {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  maxBlueprints: number;
  features: string;
  isActive: boolean;
  sortOrder: number;
}

interface PaymentItem {
  id: string;
  userId: string;
  user: { name: string | null; email: string };
  blueprintId: string | null;
  blueprint: { title: string } | null;
  amount: number;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  description: string | null;
  createdAt: string;
}

type Tab = 'blueprints' | 'users' | 'ai-config' | 'payments' | 'quotes' | 'agents';

interface QuoteItem {
  id: string;
  status: string;
  quoteAmount: number | null;
  currency: string;
  denialReason: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; email: string };
  requestedTier: PaymentTier;
  currentTier: PaymentTier | null;
}

interface AgentInfo {
  name: string;
  displayName: string;
  description: string;
  category: string;
  currentPrompt: string;
  isCustomPrompt: boolean;
  isActive: boolean;
  promptId: string | null;
  customPromptCount: number;
  lastUpdated: string | null;
}
type BlueprintFilter = 'ALL' | 'PENDING' | 'GENERATING' | 'GENERATED' | 'APPROVED' | 'REJECTED';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

/* ──────────────────────── constants ──────────────────────── */

const BG = '#080810';
const CARD_BG = 'rgba(28,28,46,0.3)';
const GOLD = '#C9A84C';
const CREAM = '#F0EAD6';
const MUTED = '#BDB49A';
const DIM = '#7A6228';
const DANGER = '#C0392B';
const SUCCESS = '#2ecc71';
const BORDER = 'rgba(201,168,76,0.12)';
const BORDER_LIGHT = 'rgba(201,168,76,0.18)';

const FONT_DISPLAY = 'var(--font-display)';
const FONT_BODY = 'var(--font-body)';
const FONT_MONO = 'var(--font-mono)';

/* ──────────────────────── helpers ──────────────────────── */

const statusColor = (s: string) => {
  switch (s) {
    case 'PENDING': return GOLD;
    case 'GENERATING': return '#E8C97A';
    case 'GENERATED': return '#3498db';
    case 'APPROVED': return SUCCESS;
    case 'REJECTED': return DANGER;
    default: return MUTED;
  }
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });

const fmtDateFull = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

const fmtCurrency = (amt: number, cur: string = 'ZAR') =>
  `${cur === 'ZAR' ? 'R' : '$'}${amt.toFixed(2)}`;

let toastCounter = 0;

/* ──────────────────────── component ──────────────────────── */

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  /* ── state ── */
  const [activeTab, setActiveTab] = useState<Tab>('blueprints');
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [tiers, setTiers] = useState<PaymentTier[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [quoteTotals, setQuoteTotals] = useState<{ pending: number; approved: number; denied: number } | null>(null);
  const [bpFilter, setBpFilter] = useState<BlueprintFilter>('ALL');
  const [selectedBp, setSelectedBp] = useState<Blueprint | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [editConfigs, setEditConfigs] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // Payments tab state
  const [paymentMode, setPaymentMode] = useState<string>('SUBSCRIPTION');
  const [blueprintPrice, setBlueprintPrice] = useState('199.00');
  const [editTiers, setEditTiers] = useState<Record<string, { price: string; maxBlueprints: string }>>({});
  const [payfastSettings, setPayfastSettings] = useState({ merchantId: '', merchantKey: '', passphrase: '', baseUrl: 'https://sandbox.payfast.co.za' });
  const [paypalClientId, setPaypalClientId] = useState('');

  // Agents tab state
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [promptEditor, setPromptEditor] = useState('');
  const [promptDescription, setPromptDescription] = useState('');
  const [agentActionLoading, setAgentActionLoading] = useState(false);
  const [agentTestInput, setAgentTestInput] = useState('');
  const [agentTestResult, setAgentTestResult] = useState<string>('');

  /* ── toast ── */
  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  /* ── data loading ── */
  const loadBlueprints = useCallback(async () => {
    try {
      const res = await fetch('/api/blueprints');
      if (res.ok) {
        const data = await res.json();
        setBlueprints(data.blueprints || []);
      }
    } catch (err) {
      console.error('Failed to load blueprints:', err);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, []);

  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const data = await res.json();
        const cfgs = data.configs || [];
        setConfigs(cfgs);
        const map: Record<string, string> = {};
        for (const c of cfgs) {
          map[c.key] = c.value;
        }
        setEditConfigs(map);
        if (map.PAYMENT_MODE) setPaymentMode(map.PAYMENT_MODE);
        if (map.BLUEPRINT_PRICE_PER) setBlueprintPrice(map.BLUEPRINT_PRICE_PER);
        if (map.PAYFAST_MERCHANT_ID) setPayfastSettings((p) => ({ ...p, merchantId: map.PAYFAST_MERCHANT_ID }));
        if (map.PAYFAST_MERCHANT_KEY) setPayfastSettings((p) => ({ ...p, merchantKey: map.PAYFAST_MERCHANT_KEY }));
        if (map.PAYFAST_PASSPHRASE) setPayfastSettings((p) => ({ ...p, passphrase: map.PAYFAST_PASSPHRASE }));
        if (map.PAYFAST_BASE_URL) setPayfastSettings((p) => ({ ...p, baseUrl: map.PAYFAST_BASE_URL }));
        if (map.PAYPAL_CLIENT_ID) setPaypalClientId(map.PAYPAL_CLIENT_ID);
      }
    } catch (err) {
      console.error('Failed to load configs:', err);
    }
  }, []);

  const loadTiers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tiers');
      if (res.ok) {
        const data = await res.json();
        const t = data.tiers || [];
        setTiers(t);
        const map: Record<string, { price: string; maxBlueprints: string }> = {};
        for (const tier of t) {
          map[tier.id] = { price: String(tier.price), maxBlueprints: String(tier.maxBlueprints) };
        }
        setEditTiers(map);
      }
    } catch (err) {
      console.error('Failed to load tiers:', err);
    }
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/payments');
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    }
  }, []);

  const loadQuotes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/quotes');
      if (res.ok) {
        const data = await res.json();
        setQuotes(data.quotes || []);
        setQuoteTotals(data.totals || null);
      }
    } catch (err) {
      console.error('Failed to load quotes:', err);
    }
  }, []);

  const loadTabData = useCallback(async (tab: Tab) => {
    setDataLoading(true);
    if (tab === 'blueprints') await loadBlueprints();
    else if (tab === 'users') await loadUsers();
    else if (tab === 'ai-config') await loadConfigs();
    else if (tab === 'payments') {
      await Promise.all([loadConfigs(), loadTiers(), loadPayments()]);
    }
    else if (tab === 'quotes') {
      await loadQuotes();
    }
    else if (tab === 'agents') {
      await loadAgents();
    }
    setDataLoading(false);
  }, [loadBlueprints, loadUsers, loadConfigs, loadTiers, loadPayments, loadQuotes, loadAgents]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadBlueprints(), loadUsers(), loadConfigs(), loadQuotes(), loadAgents()]);
    setLoading(false);
  }, [loadBlueprints, loadUsers, loadConfigs, loadQuotes, loadAgents]);

  /* ── effects ── */
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated' && session?.user) {
      const role = (session.user as { role: string }).role;
      if (role !== 'ADMIN' && role !== 'STAFF') {
        router.push('/login');
        return;
      }
      loadInitialData();
    }
  }, [status, session, router, loadInitialData]);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  /* ── blueprint actions ── */
  const handleGenerate = async (id: string) => {
    setGenerating(id);
    try {
      const res = await fetch(`/api/blueprints/${id}/generate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setBlueprints((prev) => prev.map((bp) => (bp.id === id ? { ...bp, ...data.blueprint } : bp)));
        if (selectedBp?.id === id) setSelectedBp((prev) => prev ? { ...prev, ...data.blueprint } : null);
        showToast('Blueprint generation started', 'success');
      } else {
        showToast(data.error || 'Generation failed', 'error');
      }
    } catch {
      showToast('Generation failed', 'error');
    }
    setGenerating(null);
  };

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
        if (selectedBp?.id === id) setSelectedBp((prev) => prev ? { ...prev, ...data.blueprint } : null);
        showToast('Blueprint approved and released', 'success');
      } else {
        showToast('Failed to approve blueprint', 'error');
      }
    } catch {
      showToast('Failed to approve blueprint', 'error');
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      showToast('Please provide a rejection reason', 'error');
      return;
    }
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
        showToast('Blueprint rejected', 'info');
      } else {
        showToast('Failed to reject blueprint', 'error');
      }
    } catch {
      showToast('Failed to reject blueprint', 'error');
    }
  };

  /* ── config actions ── */
  const handleSaveConfig = async (key: string) => {
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: editConfigs[key] || '' }),
      });
      if (res.ok) {
        showToast(`${key.replace(/_/g, ' ')} saved`, 'success');
        loadConfigs();
      } else {
        showToast('Failed to save config', 'error');
      }
    } catch {
      showToast('Failed to save config', 'error');
    }
  };

  const handleTestAI = async () => {
    try {
      const res = await fetch('/api/admin/config/test', { method: 'POST' });
      const data = await res.json();
      setAiStatus(data);
    } catch {
      setAiStatus({ success: false, message: 'Failed to test connection' });
    }
  };

  /* ── payment mode toggle ── */
  const handlePaymentModeToggle = async (mode: string) => {
    setPaymentMode(mode);
    setEditConfigs((prev) => ({ ...prev, PAYMENT_MODE: mode }));
    try {
      await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'PAYMENT_MODE', value: mode }),
      });
      showToast(`Payment mode set to ${mode === 'PER_BLUEPRINT' ? 'Per-Blueprint' : 'Subscription'}`, 'success');
    } catch {
      showToast('Failed to update payment mode', 'error');
    }
  };

  const handleSaveBlueprintPrice = async () => {
    setEditConfigs((prev) => ({ ...prev, BLUEPRINT_PRICE_PER: blueprintPrice }));
    await handleSaveConfig('BLUEPRINT_PRICE_PER');
  };

  /* ── tier actions ── */
  const handleSaveTier = async (tier: PaymentTier) => {
    const edits = editTiers[tier.id];
    if (!edits) return;
    try {
      const res = await fetch('/api/admin/tiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tier.id, price: parseFloat(edits.price) || 0, maxBlueprints: parseInt(edits.maxBlueprints) || 1 }),
      });
      if (res.ok) {
        showToast(`${tier.name} tier updated`, 'success');
        loadTiers();
      } else {
        showToast('Failed to update tier', 'error');
      }
    } catch {
      showToast('Failed to update tier', 'error');
    }
  };

  /* ── quote actions ── */
  const handleSendQuote = async (quoteId: string, amount: number) => {
    try {
      const res = await fetch('/api/admin/quotes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId, action: 'send_quote', quoteAmount: amount }),
      });
      if (res.ok) {
        showToast('Quote sent', 'success');
        loadQuotes();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to send quote', 'error');
      }
    } catch {
      showToast('Failed to send quote', 'error');
    }
  };

  const handleDenyQuote = async (quoteId: string) => {
    const denialReason = prompt('Reason for denial?') || '';
    try {
      const res = await fetch('/api/admin/quotes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId, action: 'deny', denialReason }),
      });
      if (res.ok) {
        showToast('Quote denied', 'info');
        loadQuotes();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to deny quote', 'error');
      }
    } catch {
      showToast('Failed to deny quote', 'error');
    }
  };

  const handleSavePayfastSetting = async (key: string, value: string) => {
    await handleSaveConfig(key);
  };

  /* ── agent prompt actions ── */
  const handleInjectPrompt = async (agentName: string) => {
    if (!promptEditor.trim()) {
      showToast('Prompt cannot be empty', 'error');
      return;
    }
    setAgentActionLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'inject', agentName, systemPrompt: promptEditor, description: promptDescription }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        loadAgents();
        setPromptEditor('');
        setPromptDescription('');
        setSelectedAgent(null);
      } else {
        showToast(data.error || 'Failed to inject prompt', 'error');
      }
    } catch {
      showToast('Failed to inject prompt', 'error');
    }
    setAgentActionLoading(false);
  };

  const handleEjectPrompt = async (agentName: string) => {
    setAgentActionLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eject', agentName }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        loadAgents();
        setSelectedAgent(null);
      } else {
        showToast(data.error || 'Failed to eject prompt', 'error');
      }
    } catch {
      showToast('Failed to eject prompt', 'error');
    }
    setAgentActionLoading(false);
  };

  const handleTestAgent = async (agentName: string) => {
    if (!agentTestInput.trim()) {
      showToast('Test input cannot be empty', 'error');
      return;
    }
    setAgentActionLoading(true);
    setAgentTestResult('');
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', agentName, message: agentTestInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setAgentTestResult(JSON.stringify(data.result, null, 2));
        showToast('Agent executed successfully', 'success');
      } else {
        showToast(data.error || 'Agent execution failed', 'error');
      }
    } catch {
      showToast('Failed to run agent', 'error');
    }
    setAgentActionLoading(false);
  };

  /* ── computed ── */
  const pendingCount = blueprints.filter((bp) => bp.status === 'PENDING').length;
  const generatedCount = blueprints.filter((bp) => bp.status === 'GENERATED').length;
  const approvedCount = blueprints.filter((bp) => bp.status === 'APPROVED').length;
  const rejectedCount = blueprints.filter((bp) => bp.status === 'REJECTED').length;

  const filteredBlueprints = bpFilter === 'ALL'
    ? blueprints
    : blueprints.filter((bp) => bp.status === bpFilter);

  /* ── render ── */

  // Loading guard
  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: BG }}>
        <p style={{ fontFamily: FONT_MONO, color: DIM, letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
          Loading...
        </p>
      </div>
    );
  }

  if (!session) return null;

  const userName = (session.user as { name: string }).name || 'Admin';
  const userEmail = (session.user as { email: string }).email || '';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
      {/* ═══════════ SIDEBAR ═══════════ */}
      <aside style={{
        width: 240,
        background: '#04040A',
        borderRight: `1px solid ${BORDER}`,
        padding: '32px 0',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}>
        <div style={{ padding: '0 24px', marginBottom: 40 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '0.85rem', letterSpacing: '0.22em', color: GOLD, textTransform: 'uppercase' }}>
              Thinkovr
            </h2>
            <p style={{ fontFamily: FONT_MONO, fontSize: '0.48rem', letterSpacing: '0.22em', color: DIM, textTransform: 'uppercase', marginTop: 4 }}>
              Admin Panel
            </p>
          </Link>
        </div>

        <nav style={{ padding: '0 12px', flex: 1 }}>
          {([
            { key: 'blueprints' as Tab, label: 'Blueprints', badge: pendingCount > 0 ? pendingCount : null },
            { key: 'users' as Tab, label: 'Users' },
            { key: 'ai-config' as Tab, label: 'AI Config' },
            { key: 'payments' as Tab, label: 'Payments' },
            { key: 'quotes' as Tab, label: 'Quotes' },
            { key: 'agents' as Tab, label: 'Agents' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px 16px',
                background: activeTab === tab.key ? 'rgba(201,168,76,0.08)' : 'transparent',
                border: 'none',
                borderLeft: activeTab === tab.key ? `2px solid ${GOLD}` : '2px solid transparent',
                fontFamily: FONT_MONO,
                fontSize: '0.58rem',
                letterSpacing: '0.15em',
                color: activeTab === tab.key ? GOLD : MUTED,
                textTransform: 'uppercase',
                cursor: 'pointer',
                textAlign: 'left',
                marginBottom: 2,
                transition: 'all 0.2s',
              }}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span style={{
                  background: GOLD,
                  color: BG,
                  fontSize: '0.42rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 8,
                  letterSpacing: '0.05em',
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: '0 24px' }}>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
            <p style={{ fontFamily: FONT_MONO, fontSize: '0.52rem', color: GOLD, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
              {userName}
            </p>
            <p style={{ fontFamily: FONT_MONO, fontSize: '0.42rem', color: DIM, letterSpacing: '0.08em' }}>
              {userEmail}
            </p>
            <button
              onClick={() => signOut({ callbackUrl: window.location.origin + '/' })}
              style={{
                marginTop: 12,
                padding: '8px 12px',
                background: 'transparent',
                border: `1px solid rgba(192,57,43,0.3)`,
                fontFamily: FONT_MONO,
                fontSize: '0.48rem',
                letterSpacing: '0.15em',
                color: DANGER,
                textTransform: 'uppercase',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main style={{ marginLeft: 240, flex: 1, padding: '40px 48px', position: 'relative' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.6rem', letterSpacing: '0.05em', color: CREAM, textTransform: 'uppercase' }}>
              Admin Dashboard
            </h1>
            <p style={{ fontFamily: FONT_MONO, fontSize: '0.55rem', color: DIM, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
              Thinkovr Control Center
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: window.location.origin + '/' })}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: `1px solid ${BORDER_LIGHT}`,
              fontFamily: FONT_MONO,
              fontSize: '0.52rem',
              letterSpacing: '0.15em',
              color: MUTED,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>

        {/* ── Stats Bar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
          {[
            { label: 'Total Users', value: users.length, color: CREAM },
            { label: 'Pending', value: pendingCount, color: GOLD },
            { label: 'Approved', value: approvedCount, color: SUCCESS },
            { label: 'Rejected', value: rejectedCount, color: DANGER },
          ].map((stat) => (
            <div key={stat.label} style={{
              border: `1px solid ${BORDER}`,
              padding: '20px 24px',
              background: CARD_BG,
            }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: '0.5rem', color: DIM, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                {stat.label}
              </p>
              <p style={{ fontFamily: FONT_DISPLAY, fontSize: '2rem', fontWeight: 700, color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Data Loading Indicator ── */}
        {dataLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 12, height: 12, border: `2px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: '0.5rem', color: DIM, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading...</span>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            BLUEPRINTS TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'blueprints' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1rem', letterSpacing: '0.1em', color: CREAM, textTransform: 'uppercase' }}>
                Blueprints
              </h2>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['ALL', 'PENDING', 'GENERATING', 'GENERATED', 'APPROVED', 'REJECTED'] as BlueprintFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setBpFilter(f)}
                    style={{
                      padding: '6px 12px',
                      background: bpFilter === f ? 'rgba(201,168,76,0.15)' : 'transparent',
                      border: bpFilter === f ? `1px solid rgba(201,168,76,0.3)` : `1px solid rgba(201,168,76,0.08)`,
                      fontFamily: FONT_MONO,
                      fontSize: '0.48rem',
                      letterSpacing: '0.1em',
                      color: bpFilter === f ? GOLD : DIM,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ border: `1px solid ${BORDER}`, overflow: 'auto', maxHeight: 'calc(100vh - 400px)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(28,28,46,0.6)' }}>
                    {['User', 'Title', 'Idea Preview', 'Status', 'Date', 'Actions'].map((h) => (
                      <th key={h} style={{
                        padding: '12px 16px',
                        fontFamily: FONT_MONO,
                        fontSize: '0.48rem',
                        letterSpacing: '0.15em',
                        color: DIM,
                        textTransform: 'uppercase',
                        textAlign: 'left',
                        borderBottom: `1px solid ${BORDER}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBlueprints.map((bp) => (
                    <tr key={bp.id} style={{ borderBottom: `1px solid rgba(201,168,76,0.06)` }}>
                      <td style={{ padding: '12px 16px', fontFamily: FONT_MONO, fontSize: '0.6rem', color: MUTED, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bp.user?.name || bp.user?.email || 'Unknown'}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: FONT_DISPLAY, fontSize: '0.65rem', color: CREAM, letterSpacing: '0.05em', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => { setSelectedBp(bp); setRejectReason(''); }}>
                        {bp.title}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: FONT_BODY, fontSize: '0.7rem', color: MUTED, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                        {bp.idea.slice(0, 80)}...
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontFamily: FONT_MONO,
                          fontSize: '0.48rem',
                          letterSpacing: '0.15em',
                          color: statusColor(bp.status),
                          border: `1px solid ${statusColor(bp.status)}33`,
                          padding: '3px 8px',
                          textTransform: 'uppercase',
                        }}>
                          {bp.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: FONT_MONO, fontSize: '0.55rem', color: DIM, whiteSpace: 'nowrap' }}>
                        {fmtDate(bp.createdAt)}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {bp.status === 'PENDING' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleGenerate(bp.id); }}
                            disabled={generating === bp.id}
                            style={{
                              padding: '6px 12px',
                              background: generating === bp.id ? DIM : GOLD,
                              color: BG,
                              border: 'none',
                              fontFamily: FONT_MONO,
                              fontSize: '0.45rem',
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              cursor: generating === bp.id ? 'not-allowed' : 'pointer',
                              marginRight: 4,
                            }}
                          >
                            {generating === bp.id ? 'Generating...' : 'Generate'}
                          </button>
                        )}
                        {bp.status === 'GENERATED' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApprove(bp.id); }}
                            style={{
                              padding: '6px 12px',
                              background: SUCCESS,
                              color: BG,
                              border: 'none',
                              fontFamily: FONT_MONO,
                              fontSize: '0.45rem',
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              cursor: 'pointer',
                              marginRight: 4,
                            }}
                          >
                            Release
                          </button>
                        )}
                        {(bp.status === 'PENDING' || bp.status === 'GENERATING' || bp.status === 'GENERATED') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedBp(bp); setRejectReason(''); }}
                            style={{
                              padding: '6px 12px',
                              background: 'transparent',
                              border: '1px solid rgba(192,57,43,0.3)',
                              fontFamily: FONT_MONO,
                              fontSize: '0.45rem',
                              letterSpacing: '0.1em',
                              color: DANGER,
                              textTransform: 'uppercase',
                              cursor: 'pointer',
                              marginRight: 4,
                            }}
                          >
                            Reject
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedBp(bp); setRejectReason(''); }}
                          style={{
                            padding: '6px 12px',
                            background: 'transparent',
                            border: `1px solid ${BORDER_LIGHT}`,
                            fontFamily: FONT_MONO,
                            fontSize: '0.45rem',
                            letterSpacing: '0.1em',
                            color: MUTED,
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredBlueprints.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: 40, textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.6rem', color: DIM }}>
                        No blueprints found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            USERS TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1rem', letterSpacing: '0.1em', color: CREAM, textTransform: 'uppercase', marginBottom: 20 }}>
              User Management
            </h2>
            <div style={{ border: `1px solid ${BORDER}`, overflow: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(28,28,46,0.6)' }}>
                    {['Name', 'Email', 'Role', 'Subscription Tier', 'Blueprints', 'Joined'].map((h) => (
                      <th key={h} style={{
                        padding: '12px 16px',
                        fontFamily: FONT_MONO,
                        fontSize: '0.48rem',
                        letterSpacing: '0.15em',
                        color: DIM,
                        textTransform: 'uppercase',
                        textAlign: 'left',
                        borderBottom: `1px solid ${BORDER}`,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: `1px solid rgba(201,168,76,0.06)` }}>
                      <td style={{ padding: '12px 16px', fontFamily: FONT_BODY, fontSize: '0.75rem', color: CREAM }}>
                        {u.name || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: FONT_MONO, fontSize: '0.6rem', color: MUTED }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontFamily: FONT_MONO,
                          fontSize: '0.48rem',
                          letterSpacing: '0.15em',
                          color: u.role === 'ADMIN' ? GOLD : u.role === 'STAFF' ? '#E8C97A' : MUTED,
                          border: `1px solid ${u.role === 'ADMIN' ? 'rgba(201,168,76,0.3)' : u.role === 'STAFF' ? 'rgba(232,201,122,0.3)' : 'rgba(189,180,154,0.2)'}`,
                          padding: '3px 8px',
                          textTransform: 'uppercase',
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontFamily: FONT_MONO,
                          fontSize: '0.48rem',
                          letterSpacing: '0.12em',
                          color: u.subscription?.status === 'ACTIVE' ? SUCCESS : DIM,
                          border: `1px solid ${u.subscription?.status === 'ACTIVE' ? 'rgba(46,204,113,0.3)' : 'rgba(122,98,40,0.2)'}`,
                          padding: '3px 8px',
                          textTransform: 'uppercase',
                        }}>
                          {u.subscription?.tier?.name || u.subscription?.status === 'NONE' ? 'Free' : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: FONT_MONO, fontSize: '0.6rem', color: MUTED }}>
                        {u._count.blueprints}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: FONT_MONO, fontSize: '0.55rem', color: DIM }}>
                        {fmtDate(u.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: 40, textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.6rem', color: DIM }}>
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            AI CONFIG TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'ai-config' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1rem', letterSpacing: '0.1em', color: CREAM, textTransform: 'uppercase' }}>
                AI Configuration
              </h2>
              <button
                onClick={handleTestAI}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: `1px solid rgba(201,168,76,0.3)`,
                  fontFamily: FONT_MONO,
                  fontSize: '0.55rem',
                  letterSpacing: '0.15em',
                  color: GOLD,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Test Connection
              </button>
            </div>

            {aiStatus && (
              <div style={{
                padding: '12px 16px',
                marginBottom: 20,
                background: aiStatus.success ? 'rgba(201,168,76,0.08)' : 'rgba(192,57,43,0.08)',
                border: `1px solid ${aiStatus.success ? 'rgba(201,168,76,0.2)' : 'rgba(192,57,43,0.2)'}`,
                fontFamily: FONT_MONO,
                fontSize: '0.6rem',
                color: aiStatus.success ? GOLD : DANGER,
                letterSpacing: '0.05em',
              }}>
                {aiStatus.message}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {configs
                .filter((c) => [
                  'AI_PROVIDER',
                  'BLUEPRINT_SYSTEM_PROMPT',
                  'ENGINE_SKILLS',
                  'AUDIT_SYSTEM_PROMPT',
                  'SMTP_HOST',
                  'SMTP_PORT',
                  'SMTP_USER',
                  'SMTP_PASS',
                  'SMTP_FROM',
                  'GEMINI_API_KEYS',
                  'GEMINI_MODEL',
                  'GROQ_API_KEYS',
                  'GROQ_MODEL',
                  'OLLAMA_BASE_URL',
                  'OLLAMA_MODEL',
                ].includes(c.key))
                .map((config) => (
                  <div key={config.key} style={{
                    border: `1px solid ${BORDER}`,
                    padding: '20px 24px',
                    background: CARD_BG,
                  }}>
                    <label style={{
                      display: 'block',
                      fontFamily: FONT_MONO,
                      fontSize: '0.55rem',
                      letterSpacing: '0.2em',
                      color: GOLD,
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}>
                      {config.key.replace(/_/g, ' ')}
                    </label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {config.key === 'AI_PROVIDER' ? (
                        <select
                          value={editConfigs[config.key] || 'AUTO'}
                          onChange={(e) => setEditConfigs((prev) => ({ ...prev, [config.key]: e.target.value }))}
                          style={{
                            flex: 1,
                            background: 'rgba(240,234,214,0.04)',
                            border: `1px solid ${BORDER_LIGHT}`,
                            color: CREAM,
                            padding: '10px 14px',
                            fontFamily: FONT_MONO,
                            fontSize: '0.7rem',
                            outline: 'none',
                          }}
                        >
                          <option value="AUTO">AUTO (Gemini → Groq → Ollama)</option>
                          <option value="GEMINI">GEMINI</option>
                          <option value="BUILTIN">BUILTIN</option>
                          <option value="GROQ">GROQ</option>
                          <option value="OLLAMA">OLLAMA</option>
                        </select>
                      ) : ['BLUEPRINT_SYSTEM_PROMPT', 'ENGINE_SKILLS', 'AUDIT_SYSTEM_PROMPT'].includes(config.key) ? (
                        <textarea
                          value={editConfigs[config.key] || ''}
                          onChange={(e) => setEditConfigs((prev) => ({ ...prev, [config.key]: e.target.value }))}
                          rows={config.key === 'ENGINE_SKILLS' ? 6 : 10}
                          style={{
                            flex: 1,
                            background: 'rgba(240,234,214,0.04)',
                            border: `1px solid ${BORDER_LIGHT}`,
                            color: CREAM,
                            padding: '10px 14px',
                            fontFamily: FONT_MONO,
                            fontSize: '0.7rem',
                            outline: 'none',
                            resize: 'vertical',
                            lineHeight: 1.6,
                          }}
                          placeholder={
                            config.key === 'BLUEPRINT_SYSTEM_PROMPT'
                              ? 'System prompt for blueprint generation...'
                              : config.key === 'AUDIT_SYSTEM_PROMPT'
                                ? 'System prompt for free audit responses...'
                                : '- Skill/rule 1\n- Skill/rule 2\n- Skill/rule 3'
                          }
                        />
                      ) : (
                        <input
                          type={config.key.includes('KEY') ? 'password' : 'text'}
                          value={editConfigs[config.key] || ''}
                          onChange={(e) => setEditConfigs((prev) => ({ ...prev, [config.key]: e.target.value }))}
                          style={{
                            flex: 1,
                            background: 'rgba(240,234,214,0.04)',
                            border: `1px solid ${BORDER_LIGHT}`,
                            color: CREAM,
                            padding: '10px 14px',
                            fontFamily: FONT_MONO,
                            fontSize: '0.7rem',
                            outline: 'none',
                          }}
                          placeholder={
                            config.key === 'SMTP_HOST' ? 'smtp.yourmail.com' :
                            config.key === 'SMTP_PORT' ? '587' :
                            config.key === 'SMTP_USER' ? 'alerts@yourdomain.com' :
                            config.key === 'SMTP_PASS' ? '(password)' :
                            config.key === 'SMTP_FROM' ? '"Thinkovr Verum Engine" <alerts@yourdomain.com>' :
                            config.key === 'GEMINI_API_KEYS' ? 'AIza... (comma-separated keys supported)' :
                            config.key === 'GROQ_API_KEYS' ? 'gsk_... (comma-separated keys supported)' :
                            config.key === 'OLLAMA_BASE_URL' ? 'http://localhost:11434' :
                            config.key === 'GEMINI_MODEL' ? 'gemini-1.5-flash' :
                            config.key === 'GROQ_MODEL' ? 'llama-3.3-70b-versatile' :
                            'llama3'
                          }
                        />
                      )}
                      <button
                        onClick={() => handleSaveConfig(config.key)}
                        style={{
                          padding: '10px 20px',
                          background: GOLD,
                          color: BG,
                          border: 'none',
                          fontFamily: FONT_MONO,
                          fontSize: '0.5rem',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                        }}
                      >
                        Save
                      </button>
                    </div>
                    <p style={{ fontFamily: FONT_MONO, fontSize: '0.45rem', color: DIM, marginTop: 6, letterSpacing: '0.05em' }}>
                      {config.key === 'AI_PROVIDER' ? 'AUTO will try Gemini first, then Groq, then Ollama.' :
                       config.key === 'BLUEPRINT_SYSTEM_PROMPT' ? 'Controls how the Engine writes blueprints.' :
                       config.key === 'ENGINE_SKILLS' ? 'Reusable rules/skills appended to the Engine prompt.' :
                       config.key === 'AUDIT_SYSTEM_PROMPT' ? 'Controls how the Engine writes free audits.' :
                       config.key === 'SMTP_HOST' ? 'SMTP host for sending workflow emails.' :
                       config.key === 'SMTP_PORT' ? 'SMTP port (587 typical, 465 for SSL).' :
                       config.key === 'SMTP_USER' ? 'SMTP username (usually an email address).' :
                       config.key === 'SMTP_PASS' ? 'SMTP password/app password.' :
                       config.key === 'SMTP_FROM' ? 'From header used for outgoing emails.' :
                       config.key === 'GEMINI_API_KEYS' ? 'Gemini keys (free tier possible). Paste multiple keys separated by commas/newlines for failover.' :
                       config.key === 'GEMINI_MODEL' ? 'Gemini model id (e.g. gemini-1.5-flash).' :
                       config.key === 'GROQ_API_KEYS' ? 'Groq keys. Paste multiple keys separated by commas/newlines for failover.' :
                       config.key === 'GROQ_MODEL' ? 'Groq model id (e.g. llama-3.3-70b-versatile).' :
                       config.key === 'OLLAMA_BASE_URL' ? 'Local model server (Ollama). Not reachable from Vercel unless hosted publicly.' :
                       'Ollama model name (e.g. llama3, mistral).'}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            PAYMENTS TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'payments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* ── Payment Mode Toggle ── */}
            <div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1rem', letterSpacing: '0.1em', color: CREAM, textTransform: 'uppercase', marginBottom: 16 }}>
                Payment Mode
              </h2>
              <p style={{ fontFamily: FONT_MONO, fontSize: '0.5rem', color: DIM, letterSpacing: '0.08em', marginBottom: 12 }}>
                Select the business model for charging users
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { mode: 'PER_BLUEPRINT', label: 'Per-Blueprint', desc: 'Users pay for each blueprint individually' },
                  { mode: 'SUBSCRIPTION', label: 'Subscription', desc: 'Users subscribe to a monthly tier' },
                ].map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() => handlePaymentModeToggle(opt.mode)}
                    style={{
                      flex: 1,
                      padding: '24px',
                      background: paymentMode === opt.mode ? 'rgba(201,168,76,0.1)' : CARD_BG,
                      border: paymentMode === opt.mode ? `1px solid rgba(201,168,76,0.4)` : `1px solid ${BORDER}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <p style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: '0.75rem',
                      letterSpacing: '0.1em',
                      color: paymentMode === opt.mode ? GOLD : MUTED,
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}>
                      {paymentMode === opt.mode ? '● ' : '○ '}{opt.label}
                    </p>
                    <p style={{ fontFamily: FONT_MONO, fontSize: '0.45rem', color: DIM, letterSpacing: '0.05em' }}>
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Per-Blueprint Settings ── */}
            {paymentMode === 'PER_BLUEPRINT' && (
              <div style={{ border: `1px solid ${BORDER}`, padding: '20px 24px', background: CARD_BG }}>
                <label style={{ display: 'block', fontFamily: FONT_MONO, fontSize: '0.55rem', letterSpacing: '0.2em', color: GOLD, textTransform: 'uppercase', marginBottom: 8 }}>
                  Price per Blueprint
                </label>
                <p style={{ fontFamily: FONT_MONO, fontSize: '0.45rem', color: DIM, marginBottom: 10, letterSpacing: '0.05em' }}>
                  The amount charged for each individual blueprint generation
                </p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: '0.7rem', color: MUTED }}>R</span>
                  <input
                    type="number"
                    value={blueprintPrice}
                    onChange={(e) => setBlueprintPrice(e.target.value)}
                    style={{
                      width: 160,
                      background: 'rgba(240,234,214,0.04)',
                      border: `1px solid ${BORDER_LIGHT}`,
                      color: CREAM,
                      padding: '10px 14px',
                      fontFamily: FONT_MONO,
                      fontSize: '0.7rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleSaveBlueprintPrice}
                    style={{
                      padding: '10px 20px',
                      background: GOLD,
                      color: BG,
                      border: 'none',
                      fontFamily: FONT_MONO,
                      fontSize: '0.5rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* ── Tier Management ── */}
            {paymentMode === 'SUBSCRIPTION' && (
              <div>
                <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1rem', letterSpacing: '0.1em', color: CREAM, textTransform: 'uppercase', marginBottom: 16 }}>
                  Tier Management
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {tiers.length > 0 ? tiers.sort((a, b) => a.sortOrder - b.sortOrder).map((tier) => {
                    const edits = editTiers[tier.id] || { price: String(tier.price), maxBlueprints: String(tier.maxBlueprints) };
                    let features: string[] = [];
                    try { features = JSON.parse(tier.features); } catch { /* empty */ }
                    return (
                      <div key={tier.id} style={{
                        border: `1px solid ${BORDER}`,
                        padding: '24px',
                        background: CARD_BG,
                        position: 'relative',
                      }}>
                        {tier.slug === 'premium' && (
                          <span style={{
                            position: 'absolute', top: -1, right: 16,
                            background: GOLD, color: BG,
                            fontFamily: FONT_MONO, fontSize: '0.4rem', letterSpacing: '0.15em',
                            padding: '2px 10px', textTransform: 'uppercase',
                          }}>
                            Popular
                          </span>
                        )}
                        <p style={{ fontFamily: FONT_DISPLAY, fontSize: '0.85rem', letterSpacing: '0.1em', color: CREAM, textTransform: 'uppercase', marginBottom: 4 }}>
                          {tier.name}
                        </p>
                        <p style={{ fontFamily: FONT_MONO, fontSize: '0.4rem', color: DIM, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
                          {tier.slug}
                        </p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
                          <span style={{ fontFamily: FONT_MONO, fontSize: '0.55rem', color: MUTED }}>R</span>
                          <input
                            type="number"
                            value={edits.price}
                            onChange={(e) => setEditTiers((prev) => ({ ...prev, [tier.id]: { ...edits, price: e.target.value } }))}
                            style={{
                              width: 80,
                              background: 'rgba(240,234,214,0.04)',
                              border: `1px solid ${BORDER_LIGHT}`,
                              color: CREAM,
                              padding: '6px 8px',
                              fontFamily: FONT_MONO,
                              fontSize: '0.65rem',
                              outline: 'none',
                            }}
                          />
                          <span style={{ fontFamily: FONT_MONO, fontSize: '0.45rem', color: DIM }}>/mo</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                          <label style={{ fontFamily: FONT_MONO, fontSize: '0.45rem', color: DIM, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Max BP:
                          </label>
                          <input
                            type="number"
                            value={edits.maxBlueprints}
                            onChange={(e) => setEditTiers((prev) => ({ ...prev, [tier.id]: { ...edits, maxBlueprints: e.target.value } }))}
                            style={{
                              width: 60,
                              background: 'rgba(240,234,214,0.04)',
                              border: `1px solid ${BORDER_LIGHT}`,
                              color: CREAM,
                              padding: '6px 8px',
                              fontFamily: FONT_MONO,
                              fontSize: '0.65rem',
                              outline: 'none',
                            }}
                          />
                          <span style={{ fontFamily: FONT_MONO, fontSize: '0.45rem', color: DIM }}>/mo</span>
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
                          {features.map((f, i) => (
                            <li key={i} style={{ fontFamily: FONT_BODY, fontSize: '0.65rem', color: MUTED, padding: '3px 0', letterSpacing: '0.02em' }}>
                              <span style={{ color: GOLD, marginRight: 6 }}>▸</span>{f}
                            </li>
                          ))}
                        </ul>
                        <button
                          onClick={() => handleSaveTier(tier)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            background: GOLD,
                            color: BG,
                            border: 'none',
                            fontFamily: FONT_MONO,
                            fontSize: '0.48rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          Save Tier
                        </button>
                      </div>
                    );
                  }) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, fontFamily: FONT_MONO, fontSize: '0.6rem', color: DIM }}>
                      No tiers configured. Seed the database to create default tiers.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── PayFast Settings ── */}
            <div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1rem', letterSpacing: '0.1em', color: CREAM, textTransform: 'uppercase', marginBottom: 16 }}>
                PayFast Settings
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'PAYFAST_MERCHANT_ID', label: 'Merchant ID', value: payfastSettings.merchantId, onChange: (v: string) => setPayfastSettings((p) => ({ ...p, merchantId: v })), hint: 'Your PayFast merchant ID' },
                  { key: 'PAYFAST_MERCHANT_KEY', label: 'Merchant Key', value: payfastSettings.merchantKey, onChange: (v: string) => setPayfastSettings((p) => ({ ...p, merchantKey: v })), hint: 'Your PayFast merchant key', isPassword: true },
                  { key: 'PAYFAST_PASSPHRASE', label: 'Passphrase', value: payfastSettings.passphrase, onChange: (v: string) => setPayfastSettings((p) => ({ ...p, passphrase: v })), hint: 'PayFast passphrase for security', isPassword: true },
                  { key: 'PAYFAST_BASE_URL', label: 'Base URL', value: payfastSettings.baseUrl, onChange: (v: string) => setPayfastSettings((p) => ({ ...p, baseUrl: v })), hint: 'Sandbox: https://sandbox.payfast.co.za | Live: https://www.payfast.co.za' },
                ].map((field) => (
                  <div key={field.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontFamily: FONT_MONO, fontSize: '0.48rem', letterSpacing: '0.15em', color: GOLD, textTransform: 'uppercase', marginBottom: 4 }}>
                        {field.label}
                      </label>
                      <input
                        type={field.isPassword ? 'password' : 'text'}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(240,234,214,0.04)',
                          border: `1px solid ${BORDER_LIGHT}`,
                          color: CREAM,
                          padding: '10px 14px',
                          fontFamily: FONT_MONO,
                          fontSize: '0.65rem',
                          outline: 'none',
                        }}
                      />
                      <p style={{ fontFamily: FONT_MONO, fontSize: '0.4rem', color: DIM, marginTop: 3, letterSpacing: '0.05em' }}>
                        {field.hint}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditConfigs((prev) => ({ ...prev, [field.key]: field.value }));
                        handleSaveConfig(field.key);
                      }}
                      style={{
                        padding: '10px 20px',
                        background: GOLD,
                        color: BG,
                        border: 'none',
                        fontFamily: FONT_MONO,
                        fontSize: '0.48rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      Save
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── PayPal Settings ── */}
            <div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1rem', letterSpacing: '0.1em', color: CREAM, textTransform: 'uppercase', marginBottom: 16 }}>
                PayPal Settings
                <span style={{ fontFamily: FONT_MONO, fontSize: '0.48rem', color: DIM, letterSpacing: '0.1em', marginLeft: 12, textTransform: 'uppercase' }}>
                  Coming Soon
                </span>
              </h2>
              <div style={{ border: `1px solid ${BORDER}`, padding: '20px 24px', background: CARD_BG, opacity: 0.5 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontFamily: FONT_MONO, fontSize: '0.48rem', letterSpacing: '0.15em', color: GOLD, textTransform: 'uppercase', marginBottom: 4 }}>
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={paypalClientId}
                      onChange={(e) => setPaypalClientId(e.target.value)}
                      disabled
                      style={{
                        width: '100%',
                        background: 'rgba(240,234,214,0.02)',
                        border: `1px solid rgba(122,98,40,0.2)`,
                        color: DIM,
                        padding: '10px 14px',
                        fontFamily: FONT_MONO,
                        fontSize: '0.65rem',
                        outline: 'none',
                        cursor: 'not-allowed',
                      }}
                      placeholder="PayPal Client ID — Coming Soon"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontFamily: FONT_MONO, fontSize: '0.48rem', letterSpacing: '0.15em', color: GOLD, textTransform: 'uppercase', marginBottom: 4 }}>
                      Secret
                    </label>
                    <input
                      type="text"
                      disabled
                      style={{
                        width: '100%',
                        background: 'rgba(240,234,214,0.02)',
                        border: `1px solid rgba(122,98,40,0.2)`,
                        color: DIM,
                        padding: '10px 14px',
                        fontFamily: FONT_MONO,
                        fontSize: '0.65rem',
                        outline: 'none',
                        cursor: 'not-allowed',
                      }}
                      placeholder="Coming Soon"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Payment Methods ── */}
            <div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1rem', letterSpacing: '0.1em', color: CREAM, textTransform: 'uppercase', marginBottom: 16 }}>
                Payment Methods
              </h2>
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { name: 'PayFast', status: 'Active', color: SUCCESS, active: true },
                  { name: 'PayPal', status: 'Coming Soon', color: DIM, active: false },
                  { name: 'Visa', status: 'Coming Soon', color: DIM, active: false },
                ].map((method) => (
                  <div key={method.name} style={{
                    flex: 1,
                    border: `1px solid ${method.active ? 'rgba(46,204,113,0.3)' : BORDER}`,
                    padding: '24px',
                    background: method.active ? 'rgba(46,204,113,0.05)' : CARD_BG,
                    opacity: method.active ? 1 : 0.5,
                    textAlign: 'center',
                  }}>
                    <p style={{ fontFamily: FONT_DISPLAY, fontSize: '0.85rem', letterSpacing: '0.1em', color: method.active ? CREAM : DIM, textTransform: 'uppercase', marginBottom: 8 }}>
                      {method.name}
                    </p>
                    <span style={{
                      fontFamily: FONT_MONO,
                      fontSize: '0.42rem',
                      letterSpacing: '0.15em',
                      color: method.color,
                      border: `1px solid ${method.color}44`,
                      padding: '3px 10px',
                      textTransform: 'uppercase',
                    }}>
                      {method.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Payment History ── */}
            <div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1rem', letterSpacing: '0.1em', color: CREAM, textTransform: 'uppercase', marginBottom: 16 }}>
                Payment History
              </h2>
              <div style={{ border: `1px solid ${BORDER}`, overflow: 'auto', maxHeight: '400px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(28,28,46,0.6)' }}>
                      {['User', 'Amount', 'Method', 'Status', 'Date', 'Reference'].map((h) => (
                        <th key={h} style={{
                          padding: '12px 16px',
                          fontFamily: FONT_MONO,
                          fontSize: '0.48rem',
                          letterSpacing: '0.15em',
                          color: DIM,
                          textTransform: 'uppercase',
                          textAlign: 'left',
                          borderBottom: `1px solid ${BORDER}`,
                          whiteSpace: 'nowrap',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} style={{ borderBottom: `1px solid rgba(201,168,76,0.06)` }}>
                        <td style={{ padding: '12px 16px', fontFamily: FONT_MONO, fontSize: '0.6rem', color: MUTED }}>
                          {p.user?.name || p.user?.email || 'Unknown'}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: FONT_MONO, fontSize: '0.6rem', color: CREAM }}>
                          {fmtCurrency(p.amount, p.currency)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontFamily: FONT_MONO,
                            fontSize: '0.48rem',
                            letterSpacing: '0.12em',
                            color: MUTED,
                            border: `1px solid rgba(189,180,154,0.2)`,
                            padding: '3px 8px',
                            textTransform: 'uppercase',
                          }}>
                            {p.method}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontFamily: FONT_MONO,
                            fontSize: '0.48rem',
                            letterSpacing: '0.15em',
                            color: p.status === 'COMPLETED' ? SUCCESS : p.status === 'PENDING' ? GOLD : DANGER,
                            border: `1px solid ${p.status === 'COMPLETED' ? 'rgba(46,204,113,0.3)' : p.status === 'PENDING' ? 'rgba(201,168,76,0.3)' : 'rgba(192,57,43,0.3)'}`,
                            padding: '3px 8px',
                            textTransform: 'uppercase',
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: FONT_MONO, fontSize: '0.55rem', color: DIM, whiteSpace: 'nowrap' }}>
                          {fmtDate(p.createdAt)}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: FONT_MONO, fontSize: '0.55rem', color: DIM, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.reference || p.blueprint?.title || '—'}
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: 40, textAlign: 'center', fontFamily: FONT_MONO, fontSize: '0.6rem', color: DIM }}>
                          No payments recorded
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            QUOTES TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'quotes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
              <div>
                <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1rem', letterSpacing: '0.1em', color: CREAM, textTransform: 'uppercase', marginBottom: 6 }}>
                  Quotes
                </h2>
                <p style={{ fontFamily: FONT_MONO, fontSize: '0.5rem', color: DIM, letterSpacing: '0.08em' }}>
                  Tier-change quotes: send quote, then user accepts/denies.
                </p>
              </div>
              <button
                onClick={() => loadQuotes()}
                style={{
                  padding: '10px 18px',
                  background: 'transparent',
                  border: `1px solid rgba(201,168,76,0.3)`,
                  fontFamily: FONT_MONO,
                  fontSize: '0.55rem',
                  letterSpacing: '0.15em',
                  color: GOLD,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Refresh
              </button>
            </div>

            {quoteTotals && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { k: 'pending', label: 'Pending', v: quoteTotals.pending },
                  { k: 'approved', label: 'Approved', v: quoteTotals.approved },
                  { k: 'denied', label: 'Denied', v: quoteTotals.denied },
                ].map((x) => (
                  <div key={x.k} style={{ border: `1px solid ${BORDER}`, background: CARD_BG, padding: 16 }}>
                    <p style={{ fontFamily: FONT_MONO, fontSize: '0.48rem', color: DIM, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>
                      {x.label}
                    </p>
                    <p style={{ fontFamily: FONT_DISPLAY, fontSize: '1.2rem', color: GOLD, margin: 0 }}>{x.v}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ border: `1px solid ${BORDER}`, background: CARD_BG }}>
              <div style={{ padding: 16, borderBottom: `1px solid ${BORDER}` }}>
                <p style={{ fontFamily: FONT_MONO, fontSize: '0.55rem', color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
                  Latest requests
                </p>
              </div>

              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {quotes.length === 0 && (
                  <p style={{ fontFamily: FONT_MONO, fontSize: '0.6rem', color: DIM, margin: 0 }}>No quotes yet.</p>
                )}
                {quotes.map((q) => {
                  const amount = q.quoteAmount ?? q.requestedTier.price;
                  return (
                    <div key={q.id} style={{ border: `1px solid rgba(201,168,76,0.12)`, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontFamily: FONT_MONO, fontSize: '0.55rem', color: GOLD, letterSpacing: '0.1em', margin: 0, textTransform: 'uppercase' }}>
                            {q.user.email} — {q.status}
                          </p>
                          <p style={{ fontFamily: FONT_MONO, fontSize: '0.52rem', color: MUTED, margin: '6px 0 0 0' }}>
                            Requested: {q.requestedTier.name} ({fmtCurrency(q.requestedTier.price, q.requestedTier.currency)}) · Current: {q.currentTier?.name || 'Free'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          {(q.status === 'PENDING' || q.status === 'QUOTED') && (
                            <button
                              onClick={() => handleSendQuote(q.id, amount)}
                              style={{
                                padding: '8px 12px',
                                background: GOLD,
                                color: BG,
                                border: 'none',
                                fontFamily: FONT_MONO,
                                fontSize: '0.5rem',
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                              }}
                            >
                              Send Quote
                            </button>
                          )}
                          {q.status !== 'DENIED' && q.status !== 'APPROVED' && (
                            <button
                              onClick={() => handleDenyQuote(q.id)}
                              style={{
                                padding: '8px 12px',
                                background: 'transparent',
                                color: DANGER,
                                border: `1px solid rgba(192,57,43,0.3)`,
                                fontFamily: FONT_MONO,
                                fontSize: '0.5rem',
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                              }}
                            >
                              Deny
                            </button>
                          )}
                        </div>
                      </div>
                      {q.denialReason && (
                        <p style={{ fontFamily: FONT_MONO, fontSize: '0.52rem', color: DANGER, margin: '10px 0 0 0' }}>
                          Denial: {q.denialReason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            AGENTS TAB
        ════════════════════════════════════════════════════ */}
        {activeTab === 'agents' && (
          <div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '1rem', letterSpacing: '0.1em', color: CREAM, textTransform: 'uppercase', marginBottom: 8 }}>
              AI Agent Management
            </h2>
            <p style={{ fontFamily: FONT_MONO, fontSize: '0.55rem', color: DIM, letterSpacing: '0.05em', marginBottom: 24 }}>
              Inject custom prompts into agents or revert to defaults. Test agent responses.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20, marginBottom: 32 }}>
              {agents.map((agent) => (
                <div key={agent.name} style={{
                  border: `1px solid ${selectedAgent?.name === agent.name ? 'rgba(201,168,76,0.4)' : BORDER}`,
                  padding: '24px',
                  background: selectedAgent?.name === agent.name ? 'rgba(201,168,76,0.06)' : CARD_BG,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }} onClick={() => { setSelectedAgent(agent); setPromptEditor(agent.currentPrompt); setPromptDescription(''); setAgentTestInput(''); setAgentTestResult(''); }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '0.85rem', color: CREAM, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        {agent.displayName}
                      </h3>
                      <span style={{ fontFamily: FONT_MONO, fontSize: '0.45rem', color: DIM, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {agent.category}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {agent.isCustomPrompt && (
                        <span style={{ fontFamily: FONT_MONO, fontSize: '0.4rem', color: GOLD, border: '1px solid rgba(201,168,76,0.3)', padding: '2px 6px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          Custom
                        </span>
                      )}
                      <span style={{
                        fontFamily: FONT_MONO, fontSize: '0.4rem',
                        color: agent.isActive ? SUCCESS : DANGER,
                        border: `1px solid ${agent.isActive ? 'rgba(46,204,113,0.3)' : 'rgba(192,57,43,0.3)'}`,
                        padding: '2px 6px', letterSpacing: '0.1em', textTransform: 'uppercase',
                      }}>
                        {agent.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontFamily: FONT_BODY, fontSize: '0.75rem', color: MUTED, lineHeight: 1.6, marginBottom: 8 }}>
                    {agent.description}
                  </p>
                  <p style={{ fontFamily: FONT_MONO, fontSize: '0.4rem', color: DIM, letterSpacing: '0.05em' }}>
                    {agent.customPromptCount} custom prompt versions
                    {agent.lastUpdated && ` · Last updated: ${fmtDate(agent.lastUpdated)}`}
                  </p>
                </div>
              ))}
            </div>

            {/* Agent Editor Panel */}
            {selectedAgent && (
              <div style={{ border: `1px solid ${BORDER}`, padding: 32, background: CARD_BG }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '0.9rem', color: CREAM, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Edit: {selectedAgent.displayName}
                  </h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEjectPrompt(selectedAgent.name); }}
                      disabled={agentActionLoading || !selectedAgent.isCustomPrompt}
                      style={{
                        padding: '8px 16px', background: 'transparent',
                        border: `1px solid ${selectedAgent.isCustomPrompt ? 'rgba(192,57,43,0.3)' : 'rgba(122,98,40,0.2)'}`,
                        fontFamily: FONT_MONO, fontSize: '0.45rem', letterSpacing: '0.1em',
                        color: selectedAgent.isCustomPrompt ? DANGER : DIM,
                        textTransform: 'uppercase', cursor: selectedAgent.isCustomPrompt ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Eject to Default
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontFamily: FONT_MONO, fontSize: '0.5rem', color: GOLD, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Prompt Description (optional)
                  </label>
                  <input
                    type="text"
                    value={promptDescription}
                    onChange={(e) => setPromptDescription(e.target.value)}
                    placeholder="Describe this version of the prompt..."
                    style={{
                      width: '100%', background: 'rgba(240,234,214,0.04)',
                      border: `1px solid ${BORDER_LIGHT}`, color: CREAM,
                      padding: '10px 14px', fontFamily: FONT_MONO, fontSize: '0.65rem', outline: 'none',
                    }}
                  />
                </div>

                {/* Prompt Editor */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontFamily: FONT_MONO, fontSize: '0.5rem', color: GOLD, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>
                    System Prompt
                  </label>
                  <textarea
                    value={promptEditor}
                    onChange={(e) => setPromptEditor(e.target.value)}
                    rows={12}
                    style={{
                      width: '100%', background: 'rgba(240,234,214,0.04)',
                      border: `1px solid ${BORDER_LIGHT}`, color: CREAM,
                      padding: '14px', fontFamily: FONT_MONO, fontSize: '0.65rem',
                      outline: 'none', resize: 'vertical', lineHeight: 1.8,
                    }}
                  />
                </div>

                {/* Inject Button */}
                <button
                  onClick={() => handleInjectPrompt(selectedAgent.name)}
                  disabled={agentActionLoading}
                  style={{
                    padding: '12px 24px', background: agentActionLoading ? DIM : GOLD,
                    color: BG, border: 'none', fontFamily: FONT_MONO,
                    fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                    cursor: agentActionLoading ? 'not-allowed' : 'pointer', marginRight: 12,
                  }}
                >
                  {agentActionLoading ? 'Processing...' : 'Inject Prompt'}
                </button>

                {/* Test Section */}
                <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 24, paddingTop: 24 }}>
                  <h4 style={{ fontFamily: FONT_DISPLAY, fontSize: '0.75rem', color: CREAM, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                    Test Agent
                  </h4>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <input
                      type="text"
                      value={agentTestInput}
                      onChange={(e) => setAgentTestInput(e.target.value)}
                      placeholder={selectedAgent.category === 'email' ? 'e.g. Draft an intro email to john@example.com about our new product' : 'e.g. Customer is asking for a password reset but their account is locked'}
                      style={{
                        flex: 1, background: 'rgba(240,234,214,0.04)',
                        border: `1px solid ${BORDER_LIGHT}`, color: CREAM,
                        padding: '10px 14px', fontFamily: FONT_BODY, fontSize: '0.75rem', outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleTestAgent(selectedAgent.name)}
                      disabled={agentActionLoading}
                      style={{
                        padding: '10px 20px', background: 'transparent',
                        border: `1px solid rgba(201,168,76,0.3)`,
                        fontFamily: FONT_MONO, fontSize: '0.45rem', letterSpacing: '0.1em',
                        color: GOLD, textTransform: 'uppercase', cursor: agentActionLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Run Test
                    </button>
                  </div>
                  {agentTestResult && (
                    <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.1)', padding: 16 }}>
                      <p style={{ fontFamily: FONT_MONO, fontSize: '0.45rem', color: DIM, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Result:</p>
                      <pre style={{ fontFamily: FONT_BODY, fontSize: '0.75rem', color: CREAM, whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0, maxHeight: 300, overflow: 'auto' }}>
                        {agentTestResult}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ BLUEPRINT DETAIL MODAL ═══════════ */}
        {selectedBp && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(4,4,10,0.92)',
              zIndex: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 32,
            }}
            onClick={() => { setSelectedBp(null); setRejectReason(''); }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#0C0C18',
                border: `1px solid ${BORDER_LIGHT}`,
                width: '100%',
                maxWidth: 960,
                maxHeight: '90vh',
                overflow: 'auto',
                padding: 40,
                position: 'relative',
              }}
            >
              {/* Close button */}
              <button
                onClick={() => { setSelectedBp(null); setRejectReason(''); }}
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  background: 'transparent',
                  border: `1px solid ${BORDER_LIGHT}`,
                  color: MUTED,
                  fontFamily: FONT_MONO,
                  fontSize: '0.6rem',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24, paddingRight: 40 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '1.3rem', color: CREAM, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10, lineHeight: 1.3 }}>
                    {selectedBp.title}
                  </h3>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <p style={{ fontFamily: FONT_MONO, fontSize: '0.5rem', color: DIM, letterSpacing: '0.1em' }}>
                      <span style={{ color: GOLD }}>USER:</span> {selectedBp.user?.name || '—'} ({selectedBp.user?.email})
                    </p>
                    <p style={{ fontFamily: FONT_MONO, fontSize: '0.5rem', color: DIM, letterSpacing: '0.1em' }}>
                      <span style={{ color: GOLD }}>SUBMITTED:</span> {fmtDateFull(selectedBp.createdAt)}
                    </p>
                    {selectedBp.reviewedAt && (
                      <p style={{ fontFamily: FONT_MONO, fontSize: '0.5rem', color: DIM, letterSpacing: '0.1em' }}>
                        <span style={{ color: GOLD }}>REVIEWED:</span> {fmtDateFull(selectedBp.reviewedAt)}
                      </p>
                    )}
                  </div>
                </div>
                <span style={{
                  fontFamily: FONT_MONO,
                  fontSize: '0.52rem',
                  letterSpacing: '0.15em',
                  color: statusColor(selectedBp.status),
                  border: `1px solid ${statusColor(selectedBp.status)}44`,
                  padding: '4px 12px',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}>
                  {selectedBp.status}
                </span>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: BORDER, marginBottom: 24 }} />

              {/* Original Idea */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontFamily: FONT_MONO, fontSize: '0.5rem', color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Original Idea
                </p>
                <p style={{ fontFamily: FONT_BODY, fontSize: '0.95rem', color: MUTED, fontStyle: 'italic', lineHeight: 1.7 }}>
                  {selectedBp.idea}
                </p>
              </div>

              {/* Generated Blueprint Content */}
              {selectedBp.content ? (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontFamily: FONT_MONO, fontSize: '0.5rem', color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
                    AI-Generated Blueprint Content
                  </p>
                  <div style={{
                    background: 'rgba(201,168,76,0.03)',
                    border: `1px solid rgba(201,168,76,0.1)`,
                    padding: 28,
                    borderRadius: 4,
                  }}>
                    <pre style={{
                      fontFamily: FONT_BODY,
                      fontSize: '0.88rem',
                      color: CREAM,
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      lineHeight: 1.9,
                      margin: 0,
                      letterSpacing: '0.01em',
                    }}>
                      {selectedBp.content}
                    </pre>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontFamily: FONT_MONO, fontSize: '0.5rem', color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
                    AI-Generated Blueprint Content
                  </p>
                  <div style={{
                    background: 'rgba(122,98,40,0.05)',
                    border: `1px solid rgba(122,98,40,0.15)`,
                    padding: 28,
                    textAlign: 'center',
                  }}>
                    <p style={{ fontFamily: FONT_MONO, fontSize: '0.6rem', color: DIM, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      No content generated yet
                    </p>
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedBp.rejectionReason && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontFamily: FONT_MONO, fontSize: '0.5rem', color: DANGER, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Rejection Reason
                  </p>
                  <div style={{ background: 'rgba(192,57,43,0.05)', border: '1px solid rgba(192,57,43,0.15)', padding: 20 }}>
                    <p style={{ fontFamily: FONT_BODY, fontSize: '0.9rem', color: MUTED, fontStyle: 'italic', lineHeight: 1.7, margin: 0 }}>
                      {selectedBp.rejectionReason}
                    </p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {(selectedBp.status === 'PENDING' || selectedBp.status === 'GENERATING' || selectedBp.status === 'GENERATED') && (
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 24 }}>
                  <p style={{ fontFamily: FONT_MONO, fontSize: '0.5rem', color: DANGER, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Reject with reason
                  </p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why this blueprint is being rejected..."
                    rows={3}
                    style={{
                      width: '100%',
                      background: 'rgba(240,234,214,0.04)',
                      border: `1px solid ${BORDER_LIGHT}`,
                      color: CREAM,
                      padding: '12px 14px',
                      fontFamily: FONT_BODY,
                      fontSize: '0.85rem',
                      outline: 'none',
                      resize: 'vertical',
                      marginBottom: 12,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleReject(selectedBp.id)}
                      disabled={!rejectReason.trim()}
                      style={{
                        padding: '10px 24px',
                        background: 'transparent',
                        border: `1px solid ${DANGER}`,
                        fontFamily: FONT_MONO,
                        fontSize: '0.5rem',
                        letterSpacing: '0.1em',
                        color: DANGER,
                        textTransform: 'uppercase',
                        cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                        opacity: rejectReason.trim() ? 1 : 0.5,
                      }}
                    >
                      Confirm Rejection
                    </button>
                    {selectedBp.status === 'GENERATED' && (
                      <button
                        onClick={() => handleApprove(selectedBp.id)}
                        style={{
                          padding: '10px 24px',
                          background: SUCCESS,
                          border: 'none',
                          fontFamily: FONT_MONO,
                          fontSize: '0.5rem',
                          letterSpacing: '0.1em',
                          color: BG,
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                        }}
                      >
                        Release to User
                      </button>
                    )}
                    {selectedBp.status === 'PENDING' && (
                      <button
                        onClick={() => handleGenerate(selectedBp.id)}
                        disabled={generating === selectedBp.id}
                        style={{
                          padding: '10px 24px',
                          background: generating === selectedBp.id ? DIM : GOLD,
                          border: 'none',
                          fontFamily: FONT_MONO,
                          fontSize: '0.5rem',
                          letterSpacing: '0.1em',
                          color: BG,
                          textTransform: 'uppercase',
                          cursor: generating === selectedBp.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {generating === selectedBp.id ? 'Generating...' : 'Generate Blueprint'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ TOAST NOTIFICATIONS ═══════════ */}
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              style={{
                background: toast.type === 'success' ? 'rgba(46,204,113,0.15)' :
                             toast.type === 'error' ? 'rgba(192,57,43,0.15)' :
                             'rgba(201,168,76,0.15)',
                border: `1px solid ${toast.type === 'success' ? 'rgba(46,204,113,0.4)' :
                                       toast.type === 'error' ? 'rgba(192,57,43,0.4)' :
                                       'rgba(201,168,76,0.4)'}`,
                padding: '12px 20px',
                fontFamily: FONT_MONO,
                fontSize: '0.55rem',
                letterSpacing: '0.08em',
                color: toast.type === 'success' ? SUCCESS :
                       toast.type === 'error' ? DANGER :
                       GOLD,
                pointerEvents: 'auto',
                animation: 'fadeIn 0.3s ease-out',
              }}
            >
              {toast.message}
            </div>
          ))}
        </div>

        {/* ── CSS keyframes via style tag ── */}
        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </main>
    </div>
  );
}
