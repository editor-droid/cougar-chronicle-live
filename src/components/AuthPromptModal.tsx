'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

type Mode = 'register' | 'signin';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after successful auth (so favorite can retry). */
  onSuccess?: () => void | Promise<void>;
  reason?: string;
};

export default function AuthPromptModal({
  open,
  onClose,
  onSuccess,
  reason = 'Create a free account to save favorites and pick up where you left off on any device.',
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setMode('register');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const finish = async () => {
    await onSuccess?.();
    router.refresh();
    onClose();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || email.split('@')[0],
          email: email.trim(),
          password,
          purpose: 'reader',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create account');

      const signInResult = await signIn('credentials', {
        redirect: false,
        email: email.trim(),
        password,
      });
      if (signInResult?.error) {
        throw new Error('Account created — please sign in.');
      }
      await finish();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const signInResult = await signIn('credentials', {
        redirect: false,
        email: email.trim(),
        password,
      });
      if (signInResult?.error) {
        throw new Error('Invalid email or password.');
      }
      await finish();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = () => {
    const callbackUrl =
      typeof window !== 'undefined'
        ? window.location.href
        : '/';
    void signIn('google', { callbackUrl });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-prompt-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '22rem',
          background: 'var(--surface, #fff)',
          border: '1px solid var(--border)',
          borderRadius: '1rem',
          padding: '1.35rem 1.35rem 1.5rem',
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--muted)',
            padding: '0.35rem',
          }}
        >
          <X size={18} />
        </button>

        <h2
          id="auth-prompt-title"
          className="font-serif"
          style={{
            fontSize: '1.45rem',
            margin: '0 0 0.4rem',
            paddingRight: '1.5rem',
            color: 'var(--foreground)',
          }}
        >
          {mode === 'register' ? 'Save to your account' : 'Welcome back'}
        </h2>
        <p
          className="font-sans text-sm text-muted"
          style={{ margin: '0 0 1.15rem', lineHeight: 1.45 }}
        >
          {reason}
        </p>

        <div
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: '1rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {(['register', 'signin'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError('');
              }}
              className="font-sans text-sm font-bold"
              style={{
                flex: 1,
                padding: '0.55rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: mode === m ? 'var(--primary)' : 'var(--muted)',
                borderBottom:
                  mode === m
                    ? '2px solid var(--primary)'
                    : '2px solid transparent',
              }}
            >
              {m === 'register' ? 'Create account' : 'Sign in'}
            </button>
          ))}
        </div>

        {error && (
          <div
            className="font-sans text-sm"
            style={{
              padding: '0.65rem 0.75rem',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '0.4rem',
              marginBottom: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={mode === 'register' ? handleRegister : handleSignIn}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        >
          {mode === 'register' && (
            <div>
              <label
                className="font-sans text-xs font-bold"
                style={{ display: 'block', marginBottom: '0.3rem' }}
              >
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: '0.4rem',
                  border: '1px solid var(--border)',
                  fontFamily: 'var(--font-sans)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
          <div>
            <label
              className="font-sans text-xs font-bold"
              style={{ display: 'block', marginBottom: '0.3rem' }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: '0.4rem',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-sans)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label
              className="font-sans text-xs font-bold"
              style={{ display: 'block', marginBottom: '0.3rem' }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              autoComplete={
                mode === 'register' ? 'new-password' : 'current-password'
              }
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: '0.4rem',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-sans)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="font-sans"
            style={{
              width: '100%',
              padding: '0.8rem',
              marginTop: '0.25rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'var(--primary)',
              color: '#fff',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading
              ? 'Please wait…'
              : mode === 'register'
                ? 'Create account & save'
                : 'Sign in & save'}
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '1rem 0 0.75rem',
            gap: '0.5rem',
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span className="font-sans text-xs text-muted">OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <button
          type="button"
          onClick={googleSignIn}
          className="font-sans"
          style={{
            width: '100%',
            padding: '0.7rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
            background: 'var(--background, #fff)',
            color: 'var(--foreground)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
