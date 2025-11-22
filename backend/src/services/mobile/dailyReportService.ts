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
 * Extracts "YYYY-MM-DD" (UTC) from an ISO datetime string.
 */
function getDateKeyFromOccurredAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    return iso.slice(0, 10);
  }
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Builds an activity summary like "3 Food, 2 Sleep, 1 Activity".
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
 * Upserts a single daily report document for a given child + date
 * using the provided entries (no extra reads from "entries" collection).
 */
async function upsertSingleDailyReport(params: {
  childId: string;
  date: string;
  newEntries: EntryDoc[];
  templateEntry: EntryDoc;
  makeVisibleToParents: boolean;
}): Promise<void> {
  const { childId, date, newEntries, templateEntry, makeVisibleToParents } =
    params;

  const reportId = `${childId}-${date}`;
  const docRef = db.collection(DAILY_REPORTS_COLLECTION).doc(reportId);
  const snap = await docRef.get();

  let existingEntries: EntryDoc[] = [];
  let existingCreatedAt: string | undefined;
  let existingVisibleToParents = false;
  let existingSent = false;
  let existingSentAt: string | undefined;

  if (snap.exists) {
    const existing = snap.data() as DailyReportDoc;
    existingEntries = Array.isArray(existing.entries) ? existing.entries : [];
    existingCreatedAt = existing.createdAt;
    existingVisibleToParents = !!existing.visibleToParents;
    existingSent = !!existing.sent;
    existingSentAt = existing.sentAt;
  }

  const mergedEntries = [...existingEntries, ...newEntries];

  const { totalActivities, summary } = buildActivitySummary(mergedEntries);
  const nowIso = new Date().toISOString();

  const visibleToParents =
    makeVisibleToParents || existingVisibleToParents || false;

  const sent = visibleToParents || existingSent;
  const sentAt = sent ? existingSentAt || nowIso : undefined;

  const report: DailyReportDoc = {
    id: reportId,

    // We keep daycareId for compatibility, but do not rely on it for filtering.
    daycareId: templateEntry.daycareId ?? "",
    locationId: templateEntry.locationId ?? "",
    classId: templateEntry.classId ?? null,
    className: templateEntry.className,

    childId: templateEntry.childId,
    childName: templateEntry.childName,

    date,
    totalActivities,
    activitySummary: summary,
    entries: mergedEntries,

    visibleToParents,
    sent,
    sentAt,

    createdAt: existingCreatedAt || nowIso,
    updatedAt: nowIso,
  };

  await docRef.set(report, { merge: true });
}

/**
 * Given a list of EntryDoc, upsert daily reports for each (childId, date) pair.
 * This does NOT read from "entries" collection. It only reads/writes dailyReports.
 */
export async function upsertDailyReportsForEntries(
  entries: EntryDoc[],
  options?: { makeVisibleToParents?: boolean }
): Promise<void> {
  if (!entries || entries.length === 0) return;

  const makeVisibleToParents = options?.makeVisibleToParents ?? false;

  // Group entries by (childId, date)
  const grouped = new Map<
    string,
    { childId: string; date: string; entries: EntryDoc[]; templateEntry: EntryDoc }
  >();

  for (const entry of entries) {
    if (!entry.childId || !entry.occurredAt) continue;

    const date = getDateKeyFromOccurredAt(entry.occurredAt);
    const key = `${entry.childId}|${date}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        childId: entry.childId,
        date,
        entries: [entry],
        templateEntry: entry,
      });
    } else {
      const g = grouped.get(key)!;
      g.entries.push(entry);
    }
  }

  const tasks: Promise<void>[] = [];

  for (const { childId, date, entries: groupEntries, templateEntry } of grouped.values()) {
    tasks.push(
      upsertSingleDailyReport({
        childId,
        date,
        newEntries: groupEntries,
        templateEntry,
        makeVisibleToParents,
      })
    );
  }

  await Promise.all(tasks);
}

/**
 * Marks a daily report as sent/visible to parents.
 */
export async function markDailyReportAsSent(reportId: string): Promise<void> {
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
 * Lists daily reports for a teacher context.
 * We scope by locationId (teacher has only one location in your model).
 */
export async function listDailyReportsForTeacher(params: {
  daycareId: string; // kept for signature compatibility, not used for filtering
  locationId: string;
  filter?: DailyReportFilter;
}): Promise<DailyReportDoc[]> {
  const { locationId, filter } = params;

  if (!locationId) {
    return [];
  }

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
 * Lists daily reports for a parent context.
 */
export async function listDailyReportsForParent(params: {
  daycareId: string; // kept for signature compatibility, not used for filtering
  locationId?: string;
  parentChildIds: string[];
  filter?: DailyReportFilter;
  onlyVisibleToParents?: boolean;
}): Promise<DailyReportDoc[]> {
  const { locationId, parentChildIds, filter, onlyVisibleToParents } = params;

  if (!parentChildIds || parentChildIds.length === 0) {
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
