// app/layout.tsx

'use client';

import { useState, useMemo } from "react";
import Link from "next/link"; // Use Next.js Link for navigation
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation"; // redirects / programmatic navigation
import Image from "next/image"; // Use Next.js Image for optimized images
import theme from "@/styles/color"

export default function SignUp() {
  const { signUp } = useAuth(); // Correctly use the hook to get the signIn function
  const [ name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Next.js router for navigation
  const router = useRouter();

  const valid = useMemo(() => {
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    return okEmail && pw.length >= 6 && pw.length <= 50 && pw.trim() === pw;
  }, [email, pw]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || loading) return;
    try {
      setErr(null);
      setLoading(true);
      await signUp(name, email, pw); // Use the signIn function from the hook
      router.push("/"); // Redirect to Login screen to assess the role
    } catch (e: any) {
      const msg = e?.message;
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        {/* Logo */}
        <Image src="/logo.svg" alt="Sunshine" width={120} height={120} style={{ alignSelf: "center" }} />
        <h2 style={styles.heading}>Creat new account</h2>
        {/* Login Form */}
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
           <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            style={styles.input}
          />
          {err && <p style={{ color: "#d00" }}>{err}</p>}
          <button type="submit" disabled={!valid || loading} style={valid && !loading ? styles.button : styles.buttonDisabled}>
            {loading ? "Loading..." : "Sign in"}
          </button>
        </form>

        <p style={{ marginTop: 12, textAlign: "center" }}>
          Already have account? <Link href="/" style={{ color: "#1e90ff" }}> Log in </Link>
        </p>
      </div>

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: 24,
    gap: 24,
  },
  formContainer: {
    display: "flex",
    flexDirection: "column",
    width: 400,
    padding: 24,
    border: "1px solid #ddd",
    borderRadius: 12,
    gap: 16,
    backgroundImage: theme.colors.backgroundAlt // Light gradient background
  },

  heading: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: 700,
  },
  input: {
    padding: 12,
    borderRadius: 10,
    border: "1px solid #ddd",
    fontSize: 16,
  },
  button: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#1e90ff",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
  },
  buttonDisabled: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#bbb",
    color: "#fff",
    fontWeight: 600,
    cursor: "not-allowed",
    border: "none",
  },
  imageContainer: {
    display: "flex",
    justifyContent: "center",
  },
  image: {
    width: 500,
    maxWidth: "100%",
    height: 300,
    objectFit: "contain",
  },
};