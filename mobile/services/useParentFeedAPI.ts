// mobile/services/useParentFeedAPI.ts
import { auth } from "@/lib/firebase";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "http://localhost:5001";

type ParentFeedEntry = {
  id: string;
  type: string;
  subtype?: string;
  detail?: any;
  childId: string;
  createdAt?: any;
  photoUrl?: string;
  classId?: string;
  teacherName?: string;
};

type ParentFeedResponse = {
  ok: boolean;
  count?: number;
  entries?: ParentFeedEntry[];
  message?: string;
};

export async function fetchParentFeed(): Promise<ParentFeedEntry[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const token = await user.getIdToken();
  const res = await fetch(`${BASE_URL}/api/mobile/parent-feed`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    return [];
  }

  const data = (await res.json()) as ParentFeedResponse;
  if (!data.ok || !data.entries) return [];

  return data.entries;
}
