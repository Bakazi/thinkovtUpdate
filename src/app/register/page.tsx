'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setSuccess('Account created successfully. Redirecting to login...');
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('An error occurred during registration');
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
      padding: '40px 0',
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
            Create Account
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

          {success && (
            <div style={{
              padding: '12px 16px',
              marginBottom: 20,
              background: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.2)',
              fontFamily: 'var(--font-courier), monospace',
              fontSize: '0.72rem',
              color: '#C9A84C',
              letterSpacing: '0.05em',
            }}>
              {success}
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
                Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
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
                placeholder="Your name"
              />
            </div>

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
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
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
                placeholder="Min. 6 characters"
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
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
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
                placeholder="Re-enter password"
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
              {loading ? 'Creating Account...' : 'Create Account'}
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
              Already have an account?{' '}
              <Link href="/login" style={{
                color: '#C9A84C',
                textDecoration: 'none',
                textTransform: 'uppercase',
              }}>
                Sign In
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
