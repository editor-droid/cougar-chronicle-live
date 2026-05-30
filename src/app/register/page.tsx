'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Automatically log them in after registration
      const signInResult = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (signInResult?.error) {
        // If auto-login fails, redirect to manual login
        router.push('/login?registered=true');
      } else {
        // Success! Go to dashboard
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
      <div style={{ maxWidth: '400px', width: '100%', backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '0.5rem', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="font-serif" style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--foreground)' }}>Writer Registration</h1>
          <p className="font-sans text-muted" style={{ fontSize: '0.9rem' }}>Create your account to start writing for The Cougar Chronicle.</p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.25rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="font-sans" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Jacob Christensen"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)', fontFamily: 'var(--font-sans)' }}
            />
          </div>
          <div>
            <label className="font-sans" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)', fontFamily: 'var(--font-sans)' }}
            />
          </div>
          <div>
            <label className="font-sans" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)', fontFamily: 'var(--font-sans)' }}
            />
          </div>
          <button 
            type="submit" 
            className="btn font-sans" 
            disabled={isLoading}
            style={{ width: '100%', padding: '0.875rem', marginTop: '0.5rem', fontWeight: 600, backgroundColor: 'var(--primary)', color: 'white', border: 'none' }}
          >
            {isLoading ? 'Creating Account...' : 'Register as Writer'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <p className="text-muted">
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
