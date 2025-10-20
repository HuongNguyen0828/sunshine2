import { db, admin } from "../../lib/firebase";

export interface ScheduleCreate {
  weekStart: string;
  dayOfWeek: string;
  timeSlot: string;
  activityTitle: string;
  activityDescription: string;
  activityMaterials: string;
  classId: string | null; // null = applies to all classes
  color: string; // hex color code for activity pill
  order: number; // order within the time slot (0 = first, 1 = second, etc.)
}

export async function listSchedules(weekStart: string, classId?: string) {
  let query = db.collection("schedules").where("weekStart", "==", weekStart);

  if (classId && classId !== "all") {
    // Get schedules for specific class OR schedules that apply to all classes (classId = null)
    // Note: Firestore doesn't support OR queries easily, so we'll fetch all and filter in memory
    const snapshot = await query.get();
    return snapshot.docs
      .filter(doc => {
        const data = doc.data();
        return data.classId === classId || data.classId === null;
      })
      .map(doc => ({ id: doc.id, ...doc.data() }));
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createSchedule(data: ScheduleCreate, userId: string) {
  const now = admin.firestore.Timestamp.now();
  const schedule = {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db.collection("schedules").add(schedule);

  // Return serializable object
  return {
    id: ref.id,
    ...data,
    userId,
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  };
}

export async function deleteSchedule(scheduleId: string) {
  await db.collection("schedules").doc(scheduleId).delete();
}
