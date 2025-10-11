// @shared/api/client.ts
"use client";

import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import Cookies from "js-cookie";
import swal from "sweetalert2";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
// First: Wait for Firebase Auth to initialize and get current user
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

// Then, fallbacke to Cookies to get idToken if user already login in and page reload/ open in new tab/window/close and re-open tab/etc.
async function getIdToken(): Promise<string | null> {
  // Case login and user is currentUser
  const user = await waitUser();
  if (user) return user.getIdToken(); // This is idToken from Firebase Auth SDK

  // Case Fallback to Cookies
  const idToken = Cookies.get("idToken");
  console.log("Fallback to Cookies idToken:", idToken);
  return idToken ?? null; // This is idToken stored in Cookies
}



async function request<T>(path: string, init?: RequestInit, authRequired = true): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (authRequired) {
    // const u = await waitUser();
    // const token = u ? await u.getIdToken() : null;

    // Token is wrapped: Either from Firebase Auth SDK or from Cookies
    const token = await getIdToken();
    if (!token) throw new Error("Not authenticated");
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...init, headers });

  // Read text once to safely handle empty or non-JSON responses

  // If response not ok, throw error with status and message from response if any
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    // Fix title for each failed request
    let title = "Failed";

    // Add more details to action type
    if (url.includes("add")) title += " Add ";;
    if (url.includes("update")) title += " Update ";
    if (url.includes("delete")) title += " Delete ";
    if (url.includes("fetch")) title += " Get ";
    if (url.includes("assign")) title += " Assign ";

    // Add more details to entity type
    if (url.includes("teacher")) title += "Teacher";
    if (url.includes("class")) title +="Class";
    if (url.includes("children")) title += "Child";
    if (url.includes("parent")) title += "Parent";
    if (url.includes("report")) title += "Report";

    try {
      const j = await res.json();
      if (j?.message) msg = `${res.status} — ${JSON.stringify(j)}`;
    } catch {}
    // throw new Error(msg);
    // Custom alert for each failed request
    swal.fire({ icon: "error", title: title, text: msg });
  }

  if (res.status === 204) return {} as T;
  if (res.status === 200) return (await res.json() as T);
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
