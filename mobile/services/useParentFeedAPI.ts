// mobile/services/useParentFeedAPI.ts
import { auth } from "@/lib/firebase";
import { ParentFeedEntry } from "../../shared/types/type";
import { Platform } from "react-native";

const getDefaultBaseUrl = () => {
  // Android emulator needs to use 10.0.2.2 to reach the host machine
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5001";
  }

  // iOS simulator or web can still use localhost
  return "http://localhost:5001";
};

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  getDefaultBaseUrl();

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
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn("fetchParentFeed: HTTP", res.status);
      return [];
    }

    const data = (await res.json()) as ParentFeedResponse;

    if (!data.ok || !data.entries) {
      console.warn("fetchParentFeed: invalid payload", data);
      return [];
    }

    return data.entries;
  } catch (err) {
    console.error("fetchParentFeed error:", err, "BASE_URL:", BASE_URL);
    return [];
  }
}
