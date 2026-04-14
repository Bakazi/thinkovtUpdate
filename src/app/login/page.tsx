'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        return;
      }

      // Fetch session to get role
      const res = await fetch('/api/auth/session');
      const session = await res.json();
      const role = session?.user?.role;

      if (role === 'ADMIN' || role === 'STAFF') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080810',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-cormorant), Georgia, serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
        opacity: 0.5,
      }} />

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 420,
        padding: '0 20px',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1 style={{
              fontFamily: 'var(--font-cinzel), serif',
              fontSize: '1.3rem',
              letterSpacing: '0.3em',
              color: '#C9A84C',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              Thinkovr
            </h1>
            <p style={{
              fontFamily: 'var(--font-courier), monospace',
              fontSize: '0.55rem',
              letterSpacing: '0.3em',
              color: '#BDB49A',
              textTransform: 'uppercase',
            }}>
              Verum Engine · Think Over Everything
            </p>
          </Link>
        </div>

        {/* Form Card */}
        <div style={{
          border: '1px solid rgba(201,168,76,0.18)',
          padding: '48px 40px',
          background: 'rgba(28,28,46,0.3)',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#F0EAD6',
            marginBottom: 32,
            textAlign: 'center',
          }}>
            Sign In
          </h2>

          {error && (
            <div style={{
              padding: '12px 16px',
              marginBottom: 20,
              background: 'rgba(192,57,43,0.1)',
              border: '1px solid rgba(192,57,43,0.2)',
              fontFamily: 'var(--font-courier), monospace',
              fontSize: '0.72rem',
              color: '#C0392B',
              letterSpacing: '0.05em',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-courier), monospace',
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                color: '#C9A84C',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  background: 'rgba(240,234,214,0.04)',
                  border: '1px solid rgba(201,168,76,0.18)',
                  color: '#F0EAD6',
                  padding: '14px 16px',
                  fontFamily: 'var(--font-cormorant), Georgia, serif',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#C9A84C')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(201,168,76,0.18)')}
                placeholder="your@email.com"
              />
            </div>

            <div style={{ marginBottom: 32 }}>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-courier), monospace',
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                color: '#C9A84C',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  background: 'rgba(240,234,214,0.04)',
                  border: '1px solid rgba(201,168,76,0.18)',
                  color: '#F0EAD6',
                  padding: '14px 16px',
                  fontFamily: 'var(--font-cormorant), Georgia, serif',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#C9A84C')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(201,168,76,0.18)')}
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: loading ? '#7A6228' : '#C9A84C',
                color: '#080810',
                border: 'none',
                fontFamily: 'var(--font-courier), monospace',
                fontSize: '0.65rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.3s, transform 0.2s',
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div style={{
            marginTop: 24,
            textAlign: 'center',
          }}>
            <p style={{
              fontFamily: 'var(--font-courier), monospace',
              fontSize: '0.6rem',
              letterSpacing: '0.1em',
              color: '#BDB49A',
            }}>
              No account?{' '}
              <Link href="/register" style={{
                color: '#C9A84C',
                textDecoration: 'none',
                textTransform: 'uppercase',
              }}>
                Register
              </Link>
            </p>
          </div>

          <div style={{
            marginTop: 16,
            textAlign: 'center',
          }}>
            <Link href="/" style={{
              fontFamily: 'var(--font-courier), monospace',
              fontSize: '0.55rem',
              letterSpacing: '0.1em',
              color: '#7A6228',
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}>
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
