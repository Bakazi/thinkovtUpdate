'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [token]);

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
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }

      setSuccess(data.message || 'Password reset successfully!');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
          New Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={!token || success !== ''}
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
            opacity: !token || success ? 0.5 : 1,
          }}
          onFocus={(e) => (e.target.style.borderColor = '#C9A84C')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(201,168,76,0.18)')}
          placeholder="Enter new password"
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
          disabled={!token || success !== ''}
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
            opacity: !token || success ? 0.5 : 1,
          }}
          onFocus={(e) => (e.target.style.borderColor = '#C9A84C')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(201,168,76,0.18)')}
          placeholder="Confirm new password"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !token || success !== ''}
        style={{
          width: '100%',
          padding: '16px',
          background: loading || !token || success ? '#7A6228' : '#C9A84C',
          color: '#080810',
          border: 'none',
          fontFamily: 'var(--font-courier), monospace',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          cursor: loading || !token || success ? 'not-allowed' : 'pointer',
          transition: 'background 0.3s, transform 0.2s',
        }}
      >
        {loading ? 'Resetting...' : success ? 'Success!' : 'Reset Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
              Think Over Everything
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
            marginBottom: 16,
            textAlign: 'center',
          }}>
            New Password
          </h2>

          <p style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: '0.9rem',
            color: '#BDB49A',
            textAlign: 'center',
            marginBottom: 32,
            lineHeight: 1.6,
          }}>
            Enter your new password below.
          </p>

          <Suspense fallback={
            <div style={{ textAlign: 'center', color: '#BDB49A', padding: '20px 0' }}>
              Loading...
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>

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
              <Link href="/login" style={{
                color: '#C9A84C',
                textDecoration: 'none',
                textTransform: 'uppercase',
              }}>
                ← Back to Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
