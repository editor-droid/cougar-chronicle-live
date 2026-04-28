import { signIn } from '@/auth';

export default function LoginPage() {
  return (
    <div className="container animate-fade-in" style={{ maxWidth: '400px', marginTop: '4rem' }}>
      <h1 className="font-serif text-center" style={{ marginBottom: '2rem' }}>Sign In</h1>
      <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
        <form
          action={async (formData) => {
            'use server';
            await signIn('credentials', formData);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <div>
            <label className="font-sans text-sm" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Email</label>
            <input type="email" name="email" placeholder="editor@cougarchronicle.com" required />
          </div>
          <div>
            <label className="font-sans text-sm" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Password</label>
            <input type="password" name="password" placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem' }}>
            Sign In Securely
          </button>
        </form>
      </div>
    </div>
  );
}
