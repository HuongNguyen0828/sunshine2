// mobile/services/useParentFeedAPI.ts
import { auth } from "@/lib/firebase";
import { ParentFeedEntry } from "../../shared/types/type";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "http://localhost:5001";

type ParentFeedResponse = {
  ok: boolean;
  count?: number;
  entries?: ParentFeedEntry[];
  message?: string;
};

/**
 * Fetch parent activity feed from backend
 * Returns a list of ParentFeedEntry[] for the logged-in parent.
 */
export async function fetchParentFeed(): Promise<ParentFeedEntry[]> {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const token = await user.getIdToken();
    const res = await fetch(`${BASE_URL}/api/mobile/parent-feed`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.warn("fetchParentFeed: HTTP", res.status);
      return [];
    }

    const data = (await res.json()) as ParentFeedResponse;
    if (!data.ok || !data.entries) return [];

    return data.entries;
  } catch (err) {
    console.error("fetchParentFeed error:", err);
    return [];
  }
}
