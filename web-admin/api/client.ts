// web-admin/api/client.ts
"use client";

import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import Cookies from "js-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/** Wait until Firebase Auth is initialized and a user (if any) is available. */
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

/** Get an ID token from Firebase Auth or fallback to cookies. */
async function getIdToken(): Promise<string | null> {
  const user = await waitUser();
  if (user) return user.getIdToken();
  const idToken = Cookies.get("idToken");
  return idToken ?? null;
}

/** Core HTTP request wrapper that always returns a value for 2xx responses. */
async function request<T>(path: string, init?: RequestInit, authRequired = true): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (authRequired) {
    const token = await getIdToken();
    if (!token) throw new Error("Not authenticated");
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j && typeof j === "object" && "message" in j) {
        msg = `${res.status} — ${JSON.stringify(j)}`;
      }
    } catch {
      /* ignore json parsing error */
    }
    throw new Error(msg);
  }

  // Handle no-content responses (204/205 or explicit empty body)
  if (res.status === 204 || res.status === 205) {
    return undefined as unknown as T;
  }

  // If content-length is 0 or missing body, treat as empty
  const contentLength = res.headers.get("content-length");
  if (contentLength === "0") {
    return undefined as unknown as T;
  }

  // Prefer JSON when content-type indicates JSON
  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.toLowerCase().includes("application/json");

  if (isJson) {
    // Covers 200, 201, 202, 206... when JSON body exists
    const data = await res.json();
    return data as T;
  }

  // Fallback: try text; if empty, return undefined; else unsafe-cast
  const text = await res.text();
  if (!text) {
    return undefined as unknown as T;
  }
  // If server returned non-JSON text but caller expects T, we still return something.
  // Callers should define T accordingly or server should return JSON.
  return text as unknown as T;
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
