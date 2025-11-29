import { admin } from "../../lib/firebase";
import type {
  EntryDoc,
  DailyReportDoc,
  DailyReportFilter,
} from "../../../../shared/types/type";

const db = admin.firestore();

const ENTRIES_COLLECTION = "entries";
const DAILY_REPORTS_COLLECTION = "dailyReports";
const CHILDREN_COLLECTION = "children";

/**
 * Build ISO datetime range [start, end) for a given "YYYY-MM-DD" date bucket.
 */
function buildDayRange(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

/**
 * Aggregate EntryDoc list into a summary string like "3 Food, 2 Sleep, 1 Activity".
 */
function buildActivitySummary(entries: EntryDoc[]): {
  totalActivities: number;
  summary: string;
} {
  const typeCounts: Record<string, number> = {};

  for (const entry of entries) {
    const key = entry.type || "Unknown";
    typeCounts[key] = (typeCounts[key] || 0) + 1;
  }

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
 * Resolve child name from children collection.
 */
async function resolveChildName(childId: string): Promise<string | undefined> {
  if (!childId) return undefined;

  const snap = await db.collection(CHILDREN_COLLECTION).doc(childId).get();
  if (!snap.exists) return undefined;

  const data = snap.data() as any;
  const fromName: string | undefined = data?.name;
  const fromFirstLast = [data?.firstName, data?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fromName && fromName.trim()) return fromName.trim();
  if (fromFirstLast) return fromFirstLast;

  return undefined;
}

/**
 * Fetch all EntryDoc for a given child + location + date bucket.
 */
async function fetchEntriesForChildAndDate(params: {
  locationId: string;
  childId: string;
  date: string; // "YYYY-MM-DD"
}): Promise<EntryDoc[]> {
  const { locationId, childId, date } = params;
  const { startIso, endIso } = buildDayRange(date);

  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
    .collection(ENTRIES_COLLECTION)
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

/**
 * Upsert a DailyReportDoc for a given child + date by aggregating EntryDoc records.
 * If there are no entries for that day, it returns null and does not write anything.
 */
export async function upsertDailyReportForChildAndDate(params: {
  daycareId?: string | null;
  locationId: string;
  classId?: string | null;
  className?: string;
  childId: string;
  childName?: string;
  date: string; // "YYYY-MM-DD"
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
    locationId,
    childId,
    date,
  });

  if (entries.length === 0) {
    return null;
  }

  let resolvedChildName = childName;
  if (!resolvedChildName) {
    resolvedChildName = await resolveChildName(childId);
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
    daycareId: daycareId ?? "",
    locationId,
    classId: classId ?? null,
    className,
    childId,
    childName: resolvedChildName,
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
 * Given a list of EntryDoc, upsert daily reports for each entry.
 * If the entry is an Attendance "Check out", the report is made visible to parents.
 */
export async function upsertDailyReportsForEntries(
  entries: EntryDoc[]
): Promise<void> {
  for (const entry of entries) {
    if (!entry.childId || !entry.occurredAt || !entry.locationId) continue;

    const occurred = new Date(entry.occurredAt);
    const year = occurred.getUTCFullYear();
    const month = String(occurred.getUTCMonth() + 1).padStart(2, "0");
    const day = String(occurred.getUTCDate()).padStart(2, "0");
    const date = `${year}-${month}-${day}`;

    const makeVisible =
      entry.type === "Attendance" && entry.subtype === "Check out";

    await upsertDailyReportForChildAndDate({
      daycareId: (entry as any).daycareId ?? "",
      locationId: entry.locationId,
      classId: entry.classId ?? null,
      className: (entry as any).className,
      childId: entry.childId,
      childName: (entry as any).childName,
      date,
      makeVisibleToParents: makeVisible,
    });
  }
}

/**
 * Mark a daily report as sent/visible to parents.
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
 * List daily reports for a teacher context.
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
 * List daily reports for a parent context.
 * parentChildIds must already be resolved from Parent → Child relationships.
 */
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
