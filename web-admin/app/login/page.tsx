// app/login/page.tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import theme from '@/styles/color';

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  console.log('[Login Page] Component state:', { email, loading, hasError: !!err });

  const valid = useMemo(() => {
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const isValid = okEmail && pw.length >= 6 && pw.length <= 50 && pw.trim() === pw;
    console.log('[Login Page] Form validation:', { okEmail, pwLength: pw.length, isValid });
    return isValid;
  }, [email, pw]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('\n🔐 [Login Page] Form submitted');
    console.log('  Valid:', valid, '| Loading:', loading);

    if (!valid || loading) {
      console.log('  ⚠️  Form submission blocked:', { valid, loading });
      return;
    }

    try {
      console.log('  🔄 Starting sign in process...');
      console.log('  Email (normalized):', email.trim().toLowerCase());
      setErr(null);
      setLoading(true);

      await signIn(email.trim().toLowerCase(), pw);

      console.log('  ✅ Sign in successful! Redirecting to dashboard...');
      router.push('/dashboard');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Login failed';
      console.log('  ❌ Sign in failed:', message);
      setErr(message);
    } finally {
      setLoading(false);
      console.log('  🏁 Sign in process completed');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <Image
          src="/logo.svg"
          alt="Sunshine"
          width={120}
          height={120}
          style={{ alignSelf: 'center' }}
        />
        <h2 style={styles.heading}>Sign in</h2>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            style={styles.input}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.currentTarget.value)}
            style={styles.input}
            autoComplete="current-password"
            required
          />
          {err && <p style={{ color: '#d00', margin: 0 }}>{err}</p>}

          <button
            type="submit"
            disabled={!valid || loading}
            style={valid && !loading ? styles.button : styles.buttonDisabled}
          >
            {loading ? 'Loading...' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: 12, textAlign: 'center' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: '#1e90ff' }}>
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 24,
    gap: 24,
    minHeight: '100dvh',
    justifyContent: 'center',
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: 400,
    maxWidth: '92vw',
    padding: 24,
    border: '1px solid #ddd',
    borderRadius: 12,
    gap: 16,
    background: theme.colors.backgroundAlt,
    boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
  },
  heading: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
  },
  input: {
    padding: 12,
    borderRadius: 10,
    border: '1px solid #ddd',
    fontSize: 16,
  },
  button: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#1e90ff',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  },
  buttonDisabled: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#bbb',
    color: '#fff',
    fontWeight: 600,
    cursor: 'not-allowed',
    border: 'none',
  },
};
