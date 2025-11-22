// backend/src/services/mobile/dailyReportService.ts

import { admin } from "../../lib/firebase";
import type {
  EntryDoc,
  DailyReportDoc,
  DailyReportFilter,
} from "../../../../shared/types/type";

const db = admin.firestore();

const DAILY_REPORTS_COLLECTION = "dailyReports";

/**
 * Builds ISO date string "YYYY-MM-DD" from an ISO datetime.
 */
function toDateBucket(iso: string): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Aggregates entries into a summary string such as "3 Food, 2 Sleep, 1 Activity".
 */
function buildActivitySummary(entries: EntryDoc[]): {
  totalActivities: number;
  summary: string;
} {
  const typeCounts: Record<string, number> = {};

  entries.forEach((entry) => {
    const key = entry.type || "Unknown";
    typeCounts[key] = (typeCounts[key] || 0) + 1;
  });

  const totalActivities = entries.length;

  const parts = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => `${count} ${type}`);

  return {
    totalActivities,
    summary: parts.join(", "),
  };
}

/**
 * Upserts a DailyReportDoc for a given child + date
 * using the provided entries array (already filtered to that child + date).
 * Does NOT re-query the entries collection.
 */
export async function upsertDailyReportForChildAndDate(params: {
  daycareId: string;
  locationId: string;
  classId?: string | null;
  className?: string;
  childId: string;
  childName?: string;
  date: string; // "YYYY-MM-DD"
  entries: EntryDoc[];
  makeVisibleToParents?: boolean;
}): Promise<DailyReportDoc | null> {
  const {
    daycareId,
    locationId,
    classId,
    className,
    childId,
    childName,
    date,
    entries,
    makeVisibleToParents,
  } = params;

  if (!entries.length) {
    return null;
  }

  const { totalActivities, summary } = buildActivitySummary(entries);
  const nowIso = new Date().toISOString();

  const reportId = `${childId}-${date}`;
  const docRef = db.collection(DAILY_REPORTS_COLLECTION).doc(reportId);
  const existingSnap = await docRef.get();

  let existingCreatedAt: string | undefined;
  if (existingSnap.exists) {
    const existingData = existingSnap.data() as DailyReportDoc;
    existingCreatedAt = existingData.createdAt;
  }

  const visibleToParents =
    makeVisibleToParents !== undefined ? makeVisibleToParents : false;

  const sent = visibleToParents;
  const sentAt = sent ? nowIso : undefined;

  const report: DailyReportDoc = {
    id: reportId,
    daycareId,
    locationId,
    classId: classId ?? null,
    className,
    childId,
    childName,
    date,
    totalActivities,
    activitySummary: summary,
    entries,
    visibleToParents,
    sent,
    sentAt,
    createdAt: existingCreatedAt || nowIso,
    updatedAt: nowIso,
  };

  await docRef.set(report, { merge: true });

  return report;
}

/**
 * Given a list of entries, group them by (childId, date) and
 * upsert one daily report per group.
 *
 * This function does everything in memory. It does NOT query the entries
 * collection again, so no Firestore composite index is needed.
 */
export async function upsertDailyReportsForEntries(
  entries: EntryDoc[],
  options?: { makeVisibleToParents?: boolean }
): Promise<void> {
  type Group = {
    daycareId: string;
    locationId: string;
    classId?: string | null;
    className?: string;
    childId: string;
    childName?: string;
    date: string;
    entries: EntryDoc[];
  };

  const groups = new Map<string, Group>();

  for (const entry of entries) {
    if (!entry.childId || !entry.occurredAt || !entry.locationId) continue;

    const date = toDateBucket(entry.occurredAt);
    if (!date) continue;

    const key = `${entry.childId}-${date}`;

    if (!groups.has(key)) {
      groups.set(key, {
        daycareId: (entry as any).daycareId || "",
        locationId: entry.locationId,
        classId: entry.classId ?? null,
        className: (entry as any).className,
        childId: entry.childId,
        childName: (entry as any).childName,
        date,
        entries: [],
      });
    }

    groups.get(key)!.entries.push(entry);
  }

  for (const group of groups.values()) {
    await upsertDailyReportForChildAndDate({
      ...group,
      makeVisibleToParents: options?.makeVisibleToParents ?? false,
    });
  }
}

/**
 * Marks a daily report as sent/visible to parents.
 */
export async function markDailyReportAsSent(
  reportId: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const docRef = db.collection(DAILY_REPORTS_COLLECTION).doc(reportId);

  await docRef.set(
    {
      sent: true,
      visibleToParents: true,
      sentAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );
}

/**
 * Lists daily reports for a teacher.
 * Uses locationId only (teachers are scoped to a single location).
 */
export async function listDailyReportsForTeacher(params: {
  daycareId: string;
  locationId: string;
  filter?: DailyReportFilter;
}): Promise<DailyReportDoc[]> {
  const { locationId, filter } = params;

  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
    .collection(DAILY_REPORTS_COLLECTION)
    .where("locationId", "==", locationId);

  if (filter?.classId) {
    query = query.where("classId", "==", filter.classId);
  }

  if (filter?.childId) {
    query = query.where("childId", "==", filter.childId);
  }

  if (typeof filter?.sent === "boolean") {
    query = query.where("sent", "==", filter.sent);
  }

  if (filter?.dateFrom) {
    query = query.where("date", ">=", filter.dateFrom);
  }

  if (filter?.dateTo) {
    query = query.where("date", "<=", filter.dateTo);
  }

  query = query.orderBy("date", "desc");

  const snapshot = await query.get();
  const reports: DailyReportDoc[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data() as DailyReportDoc;
    reports.push({ ...data, id: doc.id });
  });

  return reports;
}

/**
 * Lists daily reports for a parent.
 * Uses childId list and optional locationId.
 */
export async function listDailyReportsForParent(params: {
  daycareId: string;
  locationId?: string;
  parentChildIds: string[];
  filter?: DailyReportFilter;
  onlyVisibleToParents?: boolean;
}): Promise<DailyReportDoc[]> {
  const { locationId, parentChildIds, filter, onlyVisibleToParents } = params;

  if (parentChildIds.length === 0) {
    return [];
  }

  let allowedChildIds = parentChildIds;
  if (filter?.childId) {
    allowedChildIds = parentChildIds.includes(filter.childId)
      ? [filter.childId]
      : [];
  }

  if (allowedChildIds.length === 0) {
    return [];
  }

  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
    .collection(DAILY_REPORTS_COLLECTION)
    .where("childId", "in", allowedChildIds);

  if (locationId) {
    query = query.where("locationId", "==", locationId);
  }

  if (filter?.classId) {
    query = query.where("classId", "==", filter.classId);
  }

  if (typeof filter?.sent === "boolean") {
    query = query.where("sent", "==", filter.sent);
  }

  if (onlyVisibleToParents) {
    query = query.where("visibleToParents", "==", true);
  }

  if (filter?.dateFrom) {
    query = query.where("date", ">=", filter.dateFrom);
  }

  if (filter?.dateTo) {
    query = query.where("date", "<=", filter.dateTo);
  }

  query = query.orderBy("date", "desc");

  const snapshot = await query.get();
  const reports: DailyReportDoc[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data() as DailyReportDoc;
    reports.push({ ...data, id: doc.id });
  });

  return reports;
}
