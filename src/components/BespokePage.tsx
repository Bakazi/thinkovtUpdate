'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
const CONFIG = {
  SLOTS_REMAINING: 7,
  TOTAL_SLOTS: 10,
};

// ═══════════════════════════════════════════════════════════
// TICKER DATA
// ═══════════════════════════════════════════════════════════
const tickerItems = [
  { text: 'Start a dropshipping store', rejected: true },
  { text: 'The Engine rejects 60% of submissions', rejected: false },
  { text: 'Launch a YouTube channel on $0 budget', rejected: true },
  { text: '10 slots only — closes every Tuesday', rejected: false },
  { text: '"Become a crypto trader in 30 days"', rejected: true },
  { text: 'One directive. Zero options.', rejected: false },
  { text: 'Build an app with no co-founder', rejected: true },
  { text: 'Anti-Portfolio updated every Tuesday & Friday', rejected: false },
  { text: '"I\'ll network my way to success"', rejected: true },
  { text: 'The Engine does not validate. It analyses.', rejected: false },
];

// ═══════════════════════════════════════════════════════════
// REJECTION DATA
// ═══════════════════════════════════════════════════════════
const rejections = [
  { date: 'WK 12\n2026', idea: '"Start a dropshipping store selling trending products"', reason: 'Capital insufficient for ad spend required to reach margin threshold. Market saturation index: critical.' },
  { date: 'WK 12\n2026', idea: '"Launch a YouTube channel to build passive income"', reason: 'User committed 4 hours/week. Minimum viable consistency for channel growth: 20+. This is not a channel problem, it\'s a math problem.' },
  { date: 'WK 11\n2026', idea: '"Build an app to solve X" (no technical co-founder, no capital for dev)', reason: 'The idea is not the constraint. The infrastructure is. This is not an idea problem.' },
  { date: 'WK 11\n2026', idea: '"Become a life coach and charge $500/hr immediately"', reason: 'No demonstrated track record submitted. Credibility cannot be purchased. This was a pricing question masquerading as a business plan.' },
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function BespokePage() {
  const { data: session } = useSession();
  const [preloaderHidden, setPreloaderHidden] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [commitChecked, setCommitChecked] = useState(false);
  const [toast, setToast] = useState<{ title: string; msg: string; show: boolean }>({ title: '', msg: '', show: false });
  const [activeSection, setActiveSection] = useState('');
  const [auditSubmitting, setAuditSubmitting] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const orbRef = useRef<HTMLDivElement>(null);
  const revealRefs = useRef<(HTMLElement | null)[]>([]);
  const counterRefs = useRef<(HTMLElement | null)[]>([]);
  const hasCountered = useRef<boolean[]>([]);

  // ── PRELOADER ──
  useEffect(() => {
    const t = setTimeout(() => setPreloaderHidden(true), 2600);
    return () => clearTimeout(t);
  }, []);

  // ── SCROLL ──
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── MOUSE PARALLAX ──
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (orbRef.current) {
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;
        orbRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
    };
    document.addEventListener('mousemove', onMouse, { passive: true });
    return () => document.removeEventListener('mousemove', onMouse);
  }, []);

  // ── INTERSECTION OBSERVER for reveals ──
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('bespoke-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // ── COUNTER ANIMATION ──
  const animateCounter = useCallback((el: HTMLElement, target: number, prefix: string) => {
    const duration = 1800;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(ease * target);
      el.textContent = prefix + value.toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  // ── INTERSECTION OBSERVER for counters ──
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting && !hasCountered.current[i]) {
            hasCountered.current[i] = true;
            const el = entry.target as HTMLElement;
            const target = parseInt(el.dataset.count || '0');
            const prefix = el.dataset.prefix || '';
            animateCounter(el, target, prefix);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counterRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [animateCounter]);

  // ── SECTION OBSERVER for active nav ──
  useEffect(() => {
    const sectionIds = ['manifesto', 'engine', 'pricing', 'anti-portfolio', 'audit'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.4 }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const addRevealRef = useCallback((el: HTMLElement | null) => {
    if (el) revealRefs.current.push(el);
  }, []);

  const addCounterRef = useCallback((el: HTMLElement | null) => {
    if (el) counterRefs.current.push(el);
  }, []);

  // ── TOAST ──
  const showToast = useCallback((title: string, msg: string, duration = 5000) => {
    setToast({ title, msg, show: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), duration);
  }, []);

  // ── MOBILE NAV ──
  const toggleMobileNav = () => {
    const next = !mobileNavOpen;
    setMobileNavOpen(next);
    document.body.style.overflow = next ? 'hidden' : '';
  };
  const closeMobileNav = () => {
    setMobileNavOpen(false);
    document.body.style.overflow = '';
  };

  // ── MODAL ──
  const openModal = () => {
    setModalOpen(true);
    document.body.style.overflow = 'hidden';
  };
  const closeModal = () => {
    setModalOpen(false);
    document.body.style.overflow = '';
  };
  const proceedToForm = () => {
    if (!commitChecked) {
      showToast('Commitment Required', 'You must accept the 30-day commitment contract before the intake form opens.');
      return;
    }
    closeModal();
    showToast('Gate Open', 'The intake form has been processed. Your parameters are being analysed.');
  };

  // ── NEXT TUESDAY ──
  const getNextTuesday = () => {
    const now = new Date();
    const day = now.getDay();
    const daysUntil = (2 - day + 7) % 7 || 7;
    const next = new Date(now);
    next.setDate(now.getDate() + daysUntil);
    return next.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  // ── AUDIT FORM ──
  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuditSubmitting(true);
    try {
      const form = e.target as HTMLFormElement;
      const email = (form.querySelector('input[type="email"]') as HTMLInputElement)?.value;
      const plan = (form.querySelector('textarea') as HTMLTextAreaElement)?.value;
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Audit Submitted', data.message || 'The Engine will deliver your verdict within 72 hours.');
        form.reset();
      } else {
        showToast('Submission Failed', data.error || 'Something went wrong. Try again.');
      }
    } catch {
      showToast('Network Error', 'Could not reach The Engine. Check your connection.');
    } finally {
      setAuditSubmitting(false);
    }
  };

  // ── NEWSLETTER ──
  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    const email = (e.target as HTMLFormElement).querySelector('input')?.value || '';
    showToast('Ember Activated', `${email} has been queued for the Ember briefing. First issue ships this Tuesday.`);
    (e.target as HTMLFormElement).reset();
  };

  const navLinks = [
    { href: '#manifesto', label: 'Manifesto' },
    { href: '#engine', label: 'The Engine' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#anti-portfolio', label: 'Anti-Portfolio' },
    { href: '#audit', label: 'Free Audit' },
  ];

  return (
    <div className="bespoke-root">
      {/* NOISE */}
      <div className="bespoke-noise" />

      {/* ═══ PRELOADER ═══ */}
      <div className={`bespoke-preloader ${preloaderHidden ? 'bespoke-hidden' : ''}`}>
        <div className="bespoke-preloader-logo">Thinkovr</div>
        <div className="bespoke-preloader-bar-wrap">
          <div className="bespoke-preloader-bar" />
        </div>
        <div className="bespoke-preloader-tagline">Initialising Thinkovr Verum Engine...</div>
      </div>

      {/* ═══ MOBILE NAV ═══ */}
      <div className={`bespoke-mobile-nav ${mobileNavOpen ? 'bespoke-open' : ''}`}>
        {navLinks.map((l) => (
          <a key={l.href} href={l.href} onClick={closeMobileNav}>{l.label.replace('Anti-Portfolio', 'Anti-Portfolio')}</a>
        ))}
        <a href="#audit" onClick={closeMobileNav}>Free Audit</a>
        <a href="#intake" onClick={closeMobileNav}>Intake</a>
        <a href="/disclaimer" onClick={closeMobileNav}>Disclaimer</a>
        {session?.user ? (
          <a href={session.user.role === 'ADMIN' || session.user.role === 'STAFF' ? '/admin' : '/dashboard'} onClick={closeMobileNav}>Dashboard</a>
        ) : (
          <Link href="/login" onClick={closeMobileNav} style={{ color: 'var(--gold)', textDecoration: 'none' }}>Login</Link>
        )}
      </div>

      {/* ═══ NAVIGATION ═══ */}
      <nav className={`bespoke-nav ${navScrolled ? 'bespoke-scrolled' : ''}`}>
        <a href="#hero" className="bespoke-nav-logo">
          <span className="bespoke-nav-logo-main">Thinkovr</span>
          <span className="bespoke-nav-logo-sub">Verum Engine</span>
        </a>
        <ul className="bespoke-nav-links" style={{ display: '' }}>
          {navLinks.map((l) => (
            <li key={l.href}>
              <a href={l.href} className={activeSection === l.href.slice(1) ? 'bespoke-active-link' : ''}>{l.label}</a>
            </li>
          ))}
          <li>
            <Link href="/disclaimer" className="bespoke-nav-register">
              Disclaimer
            </Link>
          </li>
          {session?.user ? (
            <li>
              <Link href={session.user.role === 'ADMIN' || session.user.role === 'STAFF' ? '/admin' : '/dashboard'} className="bespoke-nav-cta bespoke-nav-cta-desktop">
                <span>Dashboard</span>
              </Link>
            </li>
          ) : (
            <li>
              <Link href="/login" className="bespoke-nav-cta bespoke-nav-cta-desktop">
                <span>Login</span>
              </Link>
            </li>
          )}
          {!session?.user && (
            <li>
              <Link href="/register" className="bespoke-nav-register">
                Register
              </Link>
            </li>
          )}
        </ul>
        <button className="bespoke-nav-hamburger" onClick={toggleMobileNav} aria-label="Menu">
          <span /><span /><span />
        </button>
      </nav>

      {/* ═══ HERO ═══ */}
      <section id="hero" className="bespoke-hero">
        <div className="bespoke-hero-grid" />
        <div ref={orbRef} className="bespoke-hero-orb bespoke-hero-orb-1" />
        <div className="bespoke-hero-orb bespoke-hero-orb-2" />
        <div className="bespoke-hero-inner">
          <div className="bespoke-hero-eyebrow" style={{ fontSize: '0.72rem' }}>
            ⬡ Thinkovr Verum Engine — Est. 2026 — 10 Slots / Week
          </div>
          <h1 className="bespoke-hero-headline">
            <div className="bkw-line-outline">We Don&apos;t Give</div>
            <div>You <em className="bkw-line-gold">Options.</em></div>
            <div className="bkw-line-outline">We Give You</div>
            <div>The <em className="bkw-line-gold">Move.</em></div>
          </h1>
          <p className="bespoke-hero-sub">
            One directive. Logically derived. Ruthlessly accurate.
            The Thinkovr Verum Engine processes your parameters and delivers
            the singular right move — not a list of possibilities.
          </p>
          <div className="bespoke-hero-pills">
            <div className="bespoke-pill-label" style={{ fontSize: '1rem' }}>Choose your path:</div>
            <a href="#manifesto" className="bespoke-btn bespoke-btn-ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span style={{ fontSize: '0.95rem' }}>I want 50 ideas to brainstorm</span>
            </a>
            <a href="#intake" className="bespoke-btn bespoke-btn-primary">
              <span style={{ fontSize: '0.95rem' }}>I want the exact execution protocol</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
            </a>
          </div>
        </div>
        <div className="bespoke-hero-scroll">
          <span>Scroll</span>
          <div className="bespoke-scroll-line" />
        </div>
      </section>

      {/* ═══ TICKER ═══ */}
      <div className="bespoke-ticker" aria-label="Recently rejected ideas">
        <div className="bespoke-ticker-track">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className={`bespoke-ticker-item ${item.rejected ? 'bespoke-rejected' : ''}`}>
              <span className="bespoke-ticker-dot" />
              {item.text}
            </span>
          ))}
        </div>
      </div>

      {/* ═══ MANIFESTO ═══ */}
      <section id="manifesto" className="bespoke-section bespoke-manifesto">
        <div className="bespoke-container">
          <div className="bespoke-manifesto-grid">
            <div className="bespoke-manifesto-left bespoke-reveal" ref={addRevealRef}>
              <div className="bespoke-section-label">01 — Manifesto</div>
              <div className="bkw-big-text">
                We are the<br />
                <em>Anti-Option.</em>
              </div>
              <p>
                The world already gave you infinite choices.
                You are not paralysed because you lack information.
                You are paralysed because you have too much of it.
              </p>
              <p>
                The Thinkovr Verum Engine exists to end that paralysis.
                The Engine does not brainstorm with you.
                It does not validate you. It does not comfort you.
              </p>
              <p>
                It processes your reality — your capital, your time,
                your skills, your deepest fear — and produces
                one irrefutable directive.
              </p>
            </div>

            <ul className="bespoke-not-list bespoke-reveal bespoke-reveal-delay-2" ref={addRevealRef}>
              <li className="bespoke-not-item">
                <span className="bespoke-not-num">✗</span>
                <div className="bespoke-not-content">
                  <h4><span className="bespoke-strike">A Coaching Service</span></h4>
                  <p>We don&apos;t listen to your feelings. We analyse your constraints.</p>
                </div>
              </li>
              <li className="bespoke-not-item">
                <span className="bespoke-not-num">✗</span>
                <div className="bespoke-not-content">
                  <h4><span className="bespoke-strike">A Consulting Firm</span></h4>
                  <p>We don&apos;t deliver 40-page reports. We deliver one sentence that changes everything.</p>
                </div>
              </li>
              <li className="bespoke-not-item">
                <span className="bespoke-not-num">✗</span>
                <div className="bespoke-not-content">
                  <h4><span className="bespoke-strike">An AI Chatbot</span></h4>
                  <p>The Engine is a logic system with a human checkpoint. It cannot be prompted into agreeing with you.</p>
                </div>
              </li>
              <li className="bespoke-not-item">
                <span className="bespoke-not-num">✗</span>
                <div className="bespoke-not-content">
                  <h4><span className="bespoke-strike">A Yes-Man</span></h4>
                  <p>If your goals are unrealistic, The Engine will tell you. We will turn you away. We have.</p>
                </div>
              </li>
              <li className="bespoke-not-item">
                <span className="bespoke-not-num">✓</span>
                <div className="bespoke-not-content">
                  <h4 style={{ color: 'var(--gold)' }}>A Clarity Machine</h4>
                  <p>One move. Logically derived. Built on your exact parameters. Yours to execute.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ═══ ENGINE PROCESS ═══ */}
      <section id="engine" className="bespoke-section bespoke-engine">
        <div className="bespoke-container">
          <div className="bespoke-engine-header bespoke-reveal" ref={addRevealRef}>
            <div>
              <div className="bespoke-section-label">02 — The Engine</div>
              <h2>Five Filters.<br />One Directive.</h2>
            </div>
            <p>
              &ldquo;The Committee processes your parameters through five elimination filters before a single word of your directive is written.&rdquo;
            </p>
          </div>

          <div className="bespoke-filters-grid">
            {[
              { num: 'FILTER 01', icon: '💰', title: 'Capital Constraint', desc: 'Any move exceeding your stated liquid capital is automatically eliminated. No exceptions. No scale assumptions.' },
              { num: 'FILTER 02', icon: '⏱', title: 'Time Realism', desc: 'Any move requiring more than 80% of your stated weekly hours is cut. The Engine respects your actual life.' },
              { num: 'FILTER 03', icon: '⚡', title: 'Skill Leverage', desc: 'The directive must connect to your single strongest skill. No pivots into the unknown on week one.' },
              { num: 'FILTER 04', icon: '📍', title: 'Geo-Economic Fit', desc: 'The move must be executable in your local market context. What works in New York may not work in Nairobi.' },
              { num: 'FILTER 05', icon: '🎯', title: 'Fear-Failure Alignment', desc: 'Your deepest stated fear shapes the directive. The Engine addresses what you\'re actually afraid of.' },
            ].map((f, i) => (
              <div
                key={i}
                className={`bespoke-filter-card bespoke-reveal ${i > 0 ? `bespoke-reveal-delay-${Math.min(i, 4)}` : ''}`}
                ref={addRevealRef}
              >
                <div className="bespoke-filter-num">{f.num}</div>
                <div className="bespoke-filter-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <div className="bespoke-filter-indicator" />
              </div>
            ))}
          </div>

          <div className="bespoke-engine-arrow bespoke-reveal" ref={addRevealRef}>
            <div className="bespoke-arrow-line" />
          </div>

          <div className="bespoke-output-card bespoke-reveal" ref={addRevealRef}>
            <div className="bespoke-output-headline">THE DICTATUM</div>
            <p>
              A stark, one-page directive. An encrypted audio briefing.
              A locked 7-day execution sheet. One KPI. No noise.
            </p>
            <a href="#intake" className="bespoke-btn bespoke-btn-primary" style={{ display: 'inline-flex', margin: '0 auto' }}>
              <span>Submit Your Parameters</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
            </a>
          </div>
        </div>
      </section>

      {/* ═══ INTAKE / FORM ═══ */}
      <section id="intake" className="bespoke-section bespoke-intake">
        <div className="bespoke-container">
          <div className="bespoke-intake-grid">
            <div className="bespoke-intake-left bespoke-reveal" ref={addRevealRef}>
              <div className="bespoke-section-label">03 — Intake Protocol</div>
              <h2>The Gate Is Intentionally Hard.</h2>
              <p>
                Uncommitted users are filtered before The Engine wastes computational resources on them.
                If you cannot answer these questions precisely, you are not ready for The Dictatum.
              </p>
              <p>
                The intake form links directly to a secure submission portal.
                No account. No login. Your parameters are processed within 48 hours.
              </p>
              <div className="bespoke-slot-counter">
                <div className="bespoke-slot-dots">
                  {Array.from({ length: CONFIG.TOTAL_SLOTS }, (_, i) => (
                    <div key={i} className={`bespoke-slot-dot ${i >= CONFIG.SLOTS_REMAINING ? 'bespoke-taken' : ''}`} />
                  ))}
                </div>
                <div className="bespoke-slot-text">
                  <strong>{CONFIG.SLOTS_REMAINING}</strong> / {CONFIG.TOTAL_SLOTS} slots remaining this week
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
                  ⬡ Intake closes every Tuesday · Next close: {getNextTuesday()}
                </p>
              </div>
            </div>

            <div className="bespoke-reveal bespoke-reveal-delay-2" ref={addRevealRef}>
              <div className="bespoke-form-preview">
                <div className="bespoke-form-field-preview">
                  <label>What failure mode do you fear most?</label>
                  <div className="bespoke-field-display bespoke-locked">
                    <span>Poverty / Obscurity / Regret — choose one</span>
                    <span className="bespoke-lock-icon">🔒</span>
                  </div>
                </div>
                <div className="bespoke-form-field-preview">
                  <label>Your exact runway in days</label>
                  <div className="bespoke-field-display bespoke-locked">
                    <span>No ranges. Exact figure required.</span>
                    <span className="bespoke-lock-icon">🔒</span>
                  </div>
                </div>
                <div className="bespoke-form-field-preview">
                  <label>Your single strongest skill</label>
                  <div className="bespoke-field-display bespoke-locked">
                    <span>The skill you are top 20% at in your network</span>
                    <span className="bespoke-lock-icon">🔒</span>
                  </div>
                </div>
                <div className="bespoke-form-field-preview">
                  <label>Weekly hours you will defend — not plan</label>
                  <div className="bespoke-field-display bespoke-locked">
                    <span>Hours you will actually protect from interruption</span>
                    <span className="bespoke-lock-icon">🔒</span>
                  </div>
                </div>
                <div className="bespoke-form-gate-overlay">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  <span className="bespoke-gate-warning">Full form activates upon committing to execute for 30 days</span>
                </div>
                <div className="bespoke-intake-actions">
                  <button className="bespoke-btn bespoke-btn-primary" onClick={openModal}>
                    <span>I Commit — Open The Gate</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                  <a href="#audit" className="bespoke-btn bespoke-btn-ghost" onClick={(e) => { e.preventDefault(); showToast('Audit', 'Free audit requests are processed every Friday. Submit your current plan to the audit form below.'); }}>
                    <span>I&apos;m not sure yet — Free Audit</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <div className="bespoke-stats-bar">
        <div className="bespoke-container">
          <div className="bespoke-stats-grid">
            <div className="bespoke-stat-item bespoke-reveal" ref={addRevealRef}>
              <div className="bespoke-stat-number" data-count="347" ref={addCounterRef}>0</div>
              <div className="bespoke-stat-label">Directives Delivered</div>
            </div>
            <div className="bespoke-stat-item bespoke-reveal bespoke-reveal-delay-1" ref={addRevealRef}>
              <div className="bespoke-stat-number" data-count="1240" ref={addCounterRef}>0</div>
              <div className="bespoke-stat-label">Bad Ideas Rejected</div>
            </div>
            <div className="bespoke-stat-item bespoke-reveal bespoke-reveal-delay-2" ref={addRevealRef}>
              <div className="bespoke-stat-number" data-count="47" data-prefix="$" ref={addCounterRef}>0</div>
              <div className="bespoke-stat-label">Entry Point</div>
            </div>
            <div className="bespoke-stat-item bespoke-reveal bespoke-reveal-delay-3" ref={addRevealRef}>
              <div className="bespoke-stat-number" data-count="10" ref={addCounterRef}>0</div>
              <div className="bespoke-stat-label">Weekly Slots (Fixed)</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="bespoke-section bespoke-pricing">
        <div className="bespoke-container">
          <div className="bespoke-pricing-header bespoke-reveal" ref={addRevealRef}>
            <div className="bespoke-section-label" style={{ justifyContent: 'center' }}>04 — Access Tiers</div>
            <h2>The Engine Has Levels.</h2>
            <p>Choose your level of engagement with the Protocol.</p>
          </div>

          <div className="bespoke-pricing-grid bespoke-reveal bespoke-reveal-delay-1" ref={addRevealRef}>
            <div className="bespoke-price-card">
              <div className="bespoke-price-tier">⬡ Spark</div>
              <div className="bespoke-price-amount">$47</div>
              <div className="bespoke-price-per">per directive</div>
              <ul className="bespoke-price-features">
                <li>The one-page Dictatum PDF</li>
                <li>Encrypted audio briefing (3–5 min)</li>
                <li>7-Day execution sheet (locked)</li>
                <li>One-KPI Notion dashboard</li>
                <li>30-day commitment contract</li>
                <li>48hr turnaround</li>
              </ul>
              <button className="bespoke-btn bespoke-btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => showToast('Payment Portal', 'Connecting to secure checkout for Spark — $47.')}>
                <span>Get The Move — $47</span>
              </button>
            </div>

            <div className="bespoke-price-card bespoke-featured">
              <div className="bespoke-price-tier">⬡⬡ Ignite</div>
              <div className="bespoke-price-amount">$197</div>
              <div className="bespoke-price-per">per sprint</div>
              <ul className="bespoke-price-features">
                <li>Everything in Spark</li>
                <li>30-minute Engine Call (live debrief)</li>
                <li>Constraint stress-test session</li>
                <li>Priority 24hr turnaround</li>
                <li>One revision cycle</li>
                <li>Community access (Discord)</li>
              </ul>
              <button className="bespoke-btn bespoke-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => showToast('Payment Portal', 'Connecting to secure checkout for Ignite — $197.')}>
                <span>Begin Ignite — $197</span>
              </button>
            </div>

            <div className="bespoke-price-card">
              <div className="bespoke-price-tier">⬡⬡⬡ Blaze</div>
              <div className="bespoke-price-amount">$497</div>
              <div className="bespoke-price-per">4-week sprint</div>
              <ul className="bespoke-price-features">
                <li>Full Engine Sprint — 4 weeks</li>
                <li>Weekly check-in calls (4 sessions)</li>
                <li>Adaptive directive updates</li>
                <li>Direct founder access</li>
                <li>Progress accountability system</li>
                <li>Post-sprint Autopsy report</li>
              </ul>
              <button className="bespoke-btn bespoke-btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => showToast('Payment Portal', 'Connecting to secure checkout for Blaze — $497.')}>
                <span>Enter Blaze — $497</span>
              </button>
            </div>
          </div>

          <div className="bespoke-enterprise-row bespoke-reveal" ref={addRevealRef}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 8 }}>⬡⬡⬡⬡ Forge — Enterprise</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700 }}>$2,500 <span style={{ fontSize: '0.8rem', color: 'var(--cream-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>/ team engagement</span></div>
              <p style={{ fontSize: '0.9rem', color: 'var(--cream-dim)', fontStyle: 'italic', marginTop: 8 }}>Thinkovr Verum Engine deployed for your entire decision-making team. For organisations making high-stakes resource allocation decisions.</p>
            </div>
            <a href="mailto:forge@thinkovr.com?subject=Forge Enterprise Enquiry" className="bespoke-btn bespoke-btn-ghost">
              <span>Enquire — Forge</span>
            </a>
          </div>
        </div>
      </section>

      {/* ═══ ANTI-PORTFOLIO ═══ */}
      <section id="anti-portfolio" className="bespoke-section bespoke-anti-portfolio">
        <div className="bespoke-container">
          <div className="bespoke-ap-header">
            <div className="bespoke-reveal" ref={addRevealRef}>
              <div className="bespoke-section-label">05 — Anti-Portfolio</div>
              <h2>Ideas The Engine<br />Rejected This Week.</h2>
            </div>
            <div className="bespoke-reveal bespoke-reveal-delay-2" ref={addRevealRef}>
              <p>
                These are real submissions. The Engine does not soften its verdicts.
                If your idea appears here, you deserved to know why before you lost two years on it.
              </p>
              <div className="bespoke-ap-feed-note" style={{ marginTop: 16 }}>
                <div className="bespoke-live-dot" />
                <span>Live feed — updated Tuesday &amp; Friday</span>
              </div>
            </div>
          </div>

          <div className="bespoke-rejection-feed bespoke-reveal" ref={addRevealRef}>
            {rejections.map((r, i) => (
              <div key={i} className="bespoke-rejection-item">
                <div className="bespoke-rej-date" style={{ whiteSpace: 'pre-line' }}>{r.date}</div>
                <div>
                  <div className="bespoke-rej-idea">{r.idea}</div>
                  <div className="bespoke-rej-reason">{r.reason}</div>
                </div>
                <div className="bespoke-rej-badge">Rejected</div>
              </div>
            ))}
            <div className="bespoke-rejection-item bespoke-placeholder-item">
              <div className="bespoke-rej-date" style={{ whiteSpace: 'pre-line' }}>LIVE<br />FEED</div>
              <div>
                <div className="bespoke-rej-idea">Next rejection posts Tuesday</div>
                <div className="bespoke-rej-reason">Subscribe to the Ember newsletter to receive the Anti-Portfolio weekly digest.</div>
              </div>
              <div className="bespoke-rej-badge" style={{ borderColor: 'var(--gold-dim)', color: 'var(--gold-dim)' }}>Pending</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FREE AUDIT ═══ */}
      <section id="audit" className="bespoke-section bespoke-audit">
        <div className="bespoke-container">
          <div className="bespoke-audit-inner">
            <div className="bespoke-reveal" ref={addRevealRef}>
              <div className="bespoke-section-label" style={{ justifyContent: 'center', marginBottom: 16 }}>06 — Free Audit</div>
              <h2>Tell The Engine<br /><em>Why You Think You&apos;re Right.</em></h2>
              <p>
                Submit your current business or career plan.
                The Engine will identify the single biggest flaw in your logic.
                No charge. No sales pitch. Just the truth.
              </p>
            </div>

            <form className="bespoke-audit-form bespoke-reveal bespoke-reveal-delay-2" ref={addRevealRef} onSubmit={handleAuditSubmit}>
              <input type="email" className="bespoke-audit-input" placeholder="Your email address" required autoComplete="email" />
              <textarea className="bespoke-audit-input bespoke-audit-textarea" placeholder="Describe your current plan in 3–5 sentences. Be specific. Vagueness produces vague verdicts." required />
              <button type="submit" className="bespoke-btn bespoke-btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={auditSubmitting}>
                <span>{auditSubmitting ? 'Processing...' : 'Submit For Audit — Free'}</span>
                {!auditSubmitting && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>}
              </button>
              <p className="bespoke-audit-disclaimer">
                One free audit per person. Results delivered within 72 hours via email.
                Your submission may be published (anonymised) in the Anti-Portfolio.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF ═══ */}
      <section id="proof" className="bespoke-section bespoke-proof">
        <div className="bespoke-container">
          <div className="bespoke-proof-header bespoke-reveal" ref={addRevealRef}>
            <div className="bespoke-section-label" style={{ justifyContent: 'center' }}>07 — Verdicts</div>
            <h2>What Happens After The Dictatum.</h2>
          </div>

          <div className="bespoke-proof-grid bespoke-reveal bespoke-reveal-delay-1" ref={addRevealRef}>
            {[
              { text: '"I spent three months trying to choose between four business ideas. The Engine gave me one. I executed it. I\'m making more in a week than I made in a month before."', author: 'Client A', location: 'Laid-off SaaS Developer · Johannesburg' },
              { text: '"The Engine told me my plan had a fatal flaw in Filter 2. I was furious. I fixed it. That forced edit saved me from a $12,000 mistake."', author: 'Client B', location: 'Freelance Designer · Lagos' },
              { text: '"I applied three times before the Engine accepted my parameters. Each rejection taught me something. The third Dictatum was the one that changed everything."', author: 'Client C', location: 'Career Transitioner · Nairobi' },
            ].map((t, i) => (
              <div key={i} className="bespoke-proof-card">
                <div className="bespoke-proof-placeholder-badge">Placeholder — Live After Launch</div>
                <p className="bespoke-proof-text">{t.text}</p>
                <div className="bespoke-proof-author">
                  {t.author}
                  <span>{t.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ EMBER NEWSLETTER ═══ */}
      <section id="ember" className="bespoke-section bespoke-ember">
        <div className="bespoke-container">
          <div className="bespoke-ember-grid">
            <div className="bespoke-ember-left bespoke-reveal" ref={addRevealRef}>
              <div className="bespoke-section-label">08 — Ember</div>
              <h2>The Anti-Portfolio Weekly.</h2>
              <p>
                Every week: the bad ideas The Engine rejected, the decision autopsies,
                the contrarian data teardowns. Delivered to your inbox.
                Not a newsletter. An intelligence briefing.
              </p>
              <div className="bespoke-ember-price">
                $9 <span>/ month · cancel anytime</span>
              </div>
              <form className="bespoke-newsletter-form" onSubmit={handleNewsletter}>
                <input type="email" className="bespoke-newsletter-input" placeholder="Enter your email" required autoComplete="email" />
                <button type="submit" className="bespoke-newsletter-btn">Subscribe</button>
              </form>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', letterSpacing: '0.12em', color: 'var(--cream-dim)', opacity: 0.5, marginTop: 12, textTransform: 'uppercase' }}>
                Secure checkout · Cancel anytime · No fluff, ever
              </p>
            </div>

            <ul className="bespoke-ember-features bespoke-reveal bespoke-reveal-delay-2" ref={addRevealRef}>
              {[
                { icon: '📋', title: 'Anti-Portfolio Digest', desc: 'Every bad idea The Engine rejected that week, with the full logical autopsy.' },
                { icon: '🔬', title: 'Decision Autopsy', desc: 'Deep-dive post-mortems on major public business failures, filtered through The Engine\'s lens.' },
                { icon: '📊', title: 'Contrarian Data Teardown', desc: 'One piece of popular advice, destroyed with actual public data. Every single week.' },
                { icon: '⚡', title: 'One Move Spotlight', desc: 'A real Dictatum result — anonymised — and the 30-day execution update.' },
              ].map((f, i) => (
                <li key={i} className="bespoke-ember-feat">
                  <span className="bespoke-feat-icon">{f.icon}</span>
                  <div>
                    <h4>{f.title}</h4>
                    <p>{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="bespoke-footer">
        <div className="bespoke-container">
          <div className="bespoke-footer-top">
            <div className="bespoke-footer-brand bespoke-reveal" ref={addRevealRef}>
              <h3>Thinkovr Verum Engine</h3>
              <p className="bkw-tagline">We don&apos;t give you options. We give you the right move.</p>
              <p>
                The Thinkovr Verum Engine is a precision-grade decision system.
                Not a consulting firm. Not a chatbot. Not a life coach.
                A clarity machine for people who are done with options.
              </p>
            </div>

            <div className="bespoke-footer-col bespoke-reveal bespoke-reveal-delay-1" ref={addRevealRef}>
              <h4>Navigate</h4>
              <ul>
                {navLinks.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
              </ul>
            </div>

            <div className="bespoke-footer-col bespoke-reveal bespoke-reveal-delay-2" ref={addRevealRef}>
              <h4>Legal</h4>
              <ul>
                <li><a href="/disclaimer">Terms &amp; Disclaimer</a></li>
                <li><a href="/disclaimer">Privacy Policy</a></li>
              </ul>
            </div>

            <div className="bespoke-footer-col bespoke-reveal bespoke-reveal-delay-3" ref={addRevealRef}>
              <h4>Connect</h4>
              <ul>
                <li><a href="https://x.com/thinkovr" target="_blank" rel="noopener noreferrer">X / Twitter</a></li>
                <li><a href="https://instagram.com/thinkovr" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="m16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                  <span>thinkovr</span>
                </a></li>
                <li><a href="https://youtube.com/@thinkovr" target="_blank" rel="noopener noreferrer">YouTube</a></li>
                <li><a href="mailto:engine@thinkovr.com">Email The Engine</a></li>
              </ul>
            </div>
          </div>

          <div className="bespoke-footer-bottom">
            <div className="bespoke-footer-legal">
              © 2026 Thinkovr Verum Engine. All rights reserved.
              Thinkovr Verum Engine is a strategic advisory service. Not financial or legal advice.
            </div>
            <div className="bespoke-footer-socials">
              <a href="https://x.com/thinkovr" target="_blank" rel="noopener noreferrer">X</a>
              <a href="https://instagram.com/thinkovr" target="_blank" rel="noopener noreferrer" aria-label="Instagram">Instagram</a>
              <a href="#ember">Newsletter</a>
            </div>
          </div>
        </div>

        {/* ═══ FOOTER DISCLAIMER ═══ */}
        <div className="bespoke-footer-disclaimer">
          <p>Disclaimer &amp; Terms: All generated blueprints are for brainstorming purposes only and do not constitute professional advice. 
          The website, its owners, and developers accept zero liability for any consequences arising from the use of this tool. 
          By entering a prompt, you agree that all submitted ideas, words, and resulting blueprints become the exclusive intellectual property of Thinkovr Verum Engine.
          <a href="/disclaimer">Read our Full Disclaimer and Terms</a>.</p>
        </div>
      </footer>

      {/* ═══ COMMITMENT MODAL ═══ */}
      <div className={`bespoke-modal-overlay ${modalOpen ? 'bespoke-open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="bespoke-modal">
          <button className="bespoke-modal-close" onClick={closeModal}>✕</button>
          <h3>The 30-Day Contract</h3>
          <p>
            The Engine requires commitment before it processes your parameters.
            This is not a formality. It is the first filter.
          </p>
          <div className="bespoke-modal-contract">
            <p>
              &ldquo;I understand that The Engine will produce one directive — not a list of options.
              I commit to executing The Right Move for a minimum of 30 consecutive days
              before questioning its validity. I understand that requesting validation,
              not execution, will result in a permanent ban from Thinkovr Verum Engine.
              I am here for clarity, not comfort.&rdquo;
            </p>
          </div>
          <div className="bespoke-modal-check-wrap">
            <input type="checkbox" id="commitCheck" checked={commitChecked} onChange={(e) => setCommitChecked(e.target.checked)} />
            <label htmlFor="commitCheck">
              I have read and accept the terms above. I am ready to execute,
              not deliberate.
            </label>
          </div>
          <button className="bespoke-btn bespoke-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={proceedToForm}>
            <span>I Accept — Open The Intake Form</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      {/* ═══ TOAST ═══ */}
      <div className={`bespoke-toast ${toast.show ? 'bespoke-show' : ''}`}>
        <div className="bespoke-toast-title">{toast.title}</div>
        <div className="bespoke-toast-msg">{toast.msg}</div>
      </div>
    </div>
  );
}
