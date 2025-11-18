// mobile/services/useParentFeedAPI.ts
import { auth } from "@/lib/firebase";
import { ParentFeedEntry } from "../../shared/types/type";
import { Platform } from "react-native";

const getDefaultBaseUrl = () => {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5001";
  }
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

type FetchParentFeedOptions = {
  childId?: string;
};

/**
 * Fetch parent activity feed from backend.
 * Returns a list of ParentFeedEntry[] for the logged-in parent.
 */
export async function fetchParentFeed(
  options: FetchParentFeedOptions = {}
): Promise<ParentFeedEntry[]> {
  const user = auth.currentUser;
  if (!user) {
    console.warn("fetchParentFeed: no authenticated user");
    return [];
  }

  try {
    const token = await user.getIdToken();
    const params = new URLSearchParams();

    if (options.childId) {
      params.append("childId", options.childId);
    }

    const url =
      params.toString().length > 0
        ? `${BASE_URL}/api/mobile/parent-feed?${params.toString()}`
        : `${BASE_URL}/api/mobile/parent-feed`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 401) {
        console.warn("fetchParentFeed: 401 Unauthorized", text);
      } else if (res.status === 403) {
        console.warn("fetchParentFeed: 403 Forbidden", text);
      } else {
        console.warn(
          "fetchParentFeed: HTTP",
          res.status,
          res.statusText,
          text
        );
      }
      return [];
    }

    const data = (await res.json()) as ParentFeedResponse;

    if (!data.ok || !Array.isArray(data.entries)) {
      console.warn("fetchParentFeed: invalid payload", data);
      return [];
    }

    return data.entries;
  } catch (err) {
    console.error("fetchParentFeed error:", err, "BASE_URL:", BASE_URL);
    return [];
  }
}
