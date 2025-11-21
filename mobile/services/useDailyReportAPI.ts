// mobile/services/useDailyReportAPI.ts

import { auth } from "@/lib/firebase";
import type { DailyReportDoc, DailyReportFilter } from "../../shared/types/type";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:5001/api";

type TeacherDailyReportFilter = DailyReportFilter;

type ParentDailyReportFilter = DailyReportFilter;

/**
 * Helper to build query string from an object.
 */
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      if (key === "childIds") {
        // for parent endpoint we pass as comma separated child ids
        searchParams.append(key, value.join(","));
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

/**
 * Low-level authenticated fetch wrapper for mobile → backend calls.
 */
async function authFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User is not authenticated");
  }

  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
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

  // 204 No Content
  if (res.status === 204) {
    // @ts-expect-error
    return null;
  }

  return (await res.json()) as T;
}

/**
 * Fetch teacher daily reports with optional filters.
 *
 * GET /api/mobile/teacher/daily-reports
 */
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
    `/mobile/teacher/daily-reports${qs}`
  );
}

/**
 * Fetch parent daily reports for one or more children.
 *
 * Required:
 * - childIds: string[] (child ids belonging to the parent)
 *
 * Optional filters (same as teacher):
 * - classId, childId, dateFrom, dateTo, sent
 *
 * GET /api/mobile/parent/daily-reports
 */
export async function fetchParentDailyReports(params: {
  childIds: string[];
  filter?: ParentDailyReportFilter;
}): Promise<DailyReportDoc[]> {
  const { childIds, filter } = params;

  const qs = buildQueryString({
    childIds,
    classId: filter?.classId,
    childId: filter?.childId,
    dateFrom: filter?.dateFrom,
    dateTo: filter?.dateTo,
    sent:
      typeof filter?.sent === "boolean" ? String(filter.sent) : undefined,
  });

  return await authFetch<DailyReportDoc[]>(
    `/mobile/parent/daily-reports${qs}`
  );
}

/**
 * Optional: manually mark a report as sent / visible to parents.
 *
 * POST /api/mobile/teacher/daily-reports/:id/send
 */
export async function sendDailyReport(reportId: string): Promise<void> {
  await authFetch<null>(
    `/mobile/teacher/daily-reports/${reportId}/send`,
    {
      method: "POST",
    }
  );
}
