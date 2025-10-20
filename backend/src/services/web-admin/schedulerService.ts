import { db, admin } from "../../lib/firebase";

export interface ScheduleCreate {
  weekStart: string;
  dayOfWeek: string;
  timeSlot: string;
  activityTitle: string;
  activityDescription: string;
  activityMaterials: string;
  classId: string;
}

export async function listSchedules(weekStart: string, classId?: string) {
  let query = db.collection("schedules").where("weekStart", "==", weekStart);

  if (classId && classId !== "all") {
    // Get schedules for specific class OR "all" classes
    // Note: Firestore doesn't support OR queries easily, so we'll fetch all and filter in memory
    const snapshot = await query.get();
    return snapshot.docs
      .filter(doc => {
        const data = doc.data();
        return data.classId === classId || data.classId === "all";
      })
      .map(doc => ({ id: doc.id, ...doc.data() }));
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createSchedule(data: ScheduleCreate, userId: string) {
  const schedule = {
    ...data,
    userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection("schedules").add(schedule);
  return { id: ref.id, ...schedule };
}

export async function deleteSchedule(scheduleId: string) {
  await db.collection("schedules").doc(scheduleId).delete();
}
