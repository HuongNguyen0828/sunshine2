// backend/src/services/mobile/dailyReportService.ts
import { admin } from "../../lib/firebase";
import type {
  EntryDoc,
  DailyReportDoc,
  DailyReportFilter,
} from "../../../../shared/types/type";

const db = admin.firestore();

const ENTRIES_COLLECTION = "entries";
const DAILY_REPORTS_COLLECTION = "dailyReports";

function buildDayRange(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

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

async function fetchEntriesForChildAndDate(params: {
  daycareId: string;
  locationId: string;
  childId: string;
  date: string;
}): Promise<EntryDoc[]> {
  const { daycareId, locationId, childId, date } = params;
  const { startIso, endIso } = buildDayRange(date);

  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
    .collection(ENTRIES_COLLECTION)
    .where("daycareId", "==", daycareId)
    .where("locationId", "==", locationId)
    .where("childId", "==", childId)
    .where("occurredAt", ">=", startIso)
    .where("occurredAt", "<", endIso);

  const snapshot = await query.get();

  const entries: EntryDoc[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data() as EntryDoc;
    entries.push({ ...data, id: doc.id });
  });

  return entries;
}

export async function upsertDailyReportForChildAndDate(params: {
  daycareId: string;
  locationId: string;
  classId?: string | null;
  className?: string;
  childId: string;
  childName?: string;
  date: string;
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
    makeVisibleToParents,
  } = params;

  const entries = await fetchEntriesForChildAndDate({
    daycareId,
    locationId,
    childId,
    date,
  });

  if (entries.length === 0) {
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

export async function upsertDailyReportsForEntries(
  entries: EntryDoc[],
  options?: { makeVisibleToParents?: boolean }
): Promise<void> {
  const seen = new Set<string>();

  for (const entry of entries) {
    if (!entry.childId || !entry.occurredAt) continue;

    const occurred = new Date(entry.occurredAt);
    const year = occurred.getUTCFullYear();
    const month = String(occurred.getUTCMonth() + 1).padStart(2, "0");
    const day = String(occurred.getUTCDate()).padStart(2, "0");
    const date = `${year}-${month}-${day}`;

    const key = `${entry.childId}-${date}`;
    if (seen.has(key)) continue;
    seen.add(key);

    await upsertDailyReportForChildAndDate({
      daycareId: entry.daycareId,
      locationId: entry.locationId,
      classId: entry.classId ?? null,
      className: entry.className,
      childId: entry.childId,
      childName: entry.childName,
      date,
      makeVisibleToParents: options?.makeVisibleToParents ?? false,
    });
  }
}

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

export async function listDailyReportsForTeacher(params: {
  daycareId: string;
  locationId: string;
  filter?: DailyReportFilter;
}): Promise<DailyReportDoc[]> {
  const { daycareId, locationId, filter } = params;

  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
    .collection(DAILY_REPORTS_COLLECTION)
    .where("daycareId", "==", daycareId)
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

export async function listDailyReportsForParent(params: {
  daycareId: string;
  locationId?: string;
  parentChildIds: string[];
  filter?: DailyReportFilter;
  onlyVisibleToParents?: boolean;
}): Promise<DailyReportDoc[]> {
  const { daycareId, locationId, parentChildIds, filter, onlyVisibleToParents } =
    params;

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
    .where("daycareId", "==", daycareId)
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
