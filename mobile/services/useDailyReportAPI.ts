// mobile/services/useDailyReportAPI.ts

import { auth } from "@/lib/firebase";
import type {
  DailyReportDoc,
  DailyReportFilter,
} from "../../shared/types/type";

const API_HOST = (
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:5001"
).replace(/\/$/, "");

const API_BASE_PATH = "/api/mobile";

type TeacherDailyReportFilter = DailyReportFilter;
type ParentDailyReportFilter = DailyReportFilter;

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      if (key === "childIds") {
        const arr = value.map((v) => String(v)).filter(Boolean);
        if (arr.length > 0) {
          searchParams.append(key, arr.join(","));
        }
      } else {
        value.forEach((v) => searchParams.append(key, String(v)));
      }
    } else {
      searchParams.append(key, String(value));
    }
  });

  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

async function authFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User is not authenticated");
  }

  const token = await user.getIdToken();

  const url = `${API_HOST}${API_BASE_PATH}${path}`;
  console.log("DailyReport fetch URL:", url);

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.log("DailyReport API error:", res.status, text);
    throw new Error(
      `Request failed with status ${res.status}: ${text || res.statusText}`
    );
  }

  if (res.status === 204) {
    // @ts-expect-error
    return null;
  }

  return (await res.json()) as T;
}

export async function fetchTeacherDailyReports(
  filter?: TeacherDailyReportFilter
): Promise<DailyReportDoc[]> {
  const qs = buildQueryString({
    classId: filter?.classId,
    childId: filter?.childId,
    dateFrom: filter?.dateFrom,
    dateTo: filter?.dateTo,
    sent:
      typeof filter?.sent === "boolean" ? String(filter.sent) : undefined,
  });

  return await authFetch<DailyReportDoc[]>(
    `/teacher/daily-reports${qs}`
  );
}

export type FetchParentDailyReportsParams = {
  childIds?: string[];
  filter?: ParentDailyReportFilter;
};

export async function fetchParentDailyReports(
  params: FetchParentDailyReportsParams
): Promise<DailyReportDoc[]> {
  const { childIds, filter } = params;

  const qs = buildQueryString({
    childIds: childIds && childIds.length > 0 ? childIds : undefined,
    classId: filter?.classId,
    childId: filter?.childId,
    dateFrom: filter?.dateFrom,
    dateTo: filter?.dateTo,
    sent:
      typeof filter?.sent === "boolean" ? String(filter.sent) : undefined,
  });

  return await authFetch<DailyReportDoc[]>(
    `/parent/daily-reports${qs}`
  );
}

export async function sendDailyReport(reportId: string): Promise<void> {
  await authFetch<null>(
    `/teacher/daily-reports/${reportId}/send`,
    { method: "POST" }
  );
}
