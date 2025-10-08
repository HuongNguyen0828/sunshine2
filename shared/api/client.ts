// @shared/api/client.ts
"use client";

import { getAuth, onAuthStateChanged, type User } from "firebase/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";


//Make sure the user is signed in, get their ID token for requests
async function waitUser(): Promise<User | null> {
  const auth = getAuth();
  if (auth.currentUser) return auth.currentUser;
  return await new Promise<User | null>((resolve) => {
    const off = onAuthStateChanged(
      auth,
      (u) => {
        off();
        resolve(u);
      },
      () => {
        off();
        resolve(null);
      }
    );
  });
}

async function request<T>(path: string, init?: RequestInit, authRequired = true): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (authRequired) {
    const u = await waitUser();
    const token = u ? await u.getIdToken() : null;
    if (!token) throw new Error("Not authenticated");
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.message) msg = `${res.status} — ${JSON.stringify(j)}`;
    } catch {}
    throw new Error(msg);
  }

  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

const api = {
  get<T>(path: string, opts?: { auth?: boolean }) {
    return request<T>(path, { method: "GET" }, opts?.auth ?? true);
  },
  post<T>(path: string, body?: unknown, opts?: { auth?: boolean }) {
    return request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }, opts?.auth ?? true);
  },
  put<T>(path: string, body?: unknown, opts?: { auth?: boolean }) {
    return request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }, opts?.auth ?? true);
  },
  delete<T>(path: string, opts?: { auth?: boolean }) {
    return request<T>(path, { method: "DELETE" }, opts?.auth ?? true);
  },
};

export default api;
