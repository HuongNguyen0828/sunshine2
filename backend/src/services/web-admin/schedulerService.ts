import { get } from "http";
import { db, admin } from "../../lib/firebase";
import { daycareLocationIds } from "../authService";
import { EventType } from "../../../../shared/types/type";

export interface ScheduleCreate {
  weekStart: string;
  dayOfWeek: string;
  timeSlot: string;
  type: EventType;
  activityTitle: string;
  activityDescription: string;
  activityMaterials: string;
  classId: string; // null = applies to all classes
  locationId: string; // location scope of the schedule if classId is "*"
  color: string; // hex color code for activity pill
  order: number; // order within the time slot (0 = first, 1 = second, etc.)
}

export async function listSchedules(weekStart: string, classId: string, locationId: string, daycareId: string) {
  // Need to handle boundary to fetch schedules for this specific daycare and location only
  let scheduleRef = db.collection("schedules");
  let query: FirebaseFirestore.Query; // Declare as Firestore Query type
  if (locationId !== "*") {
    // Case admin is scoped to a specific location
   query = scheduleRef
    .where("weekStart", "==", weekStart)
    .where("locationId", "==", locationId);
  } else {
    // Case admin is scoped to all locations within the daycare
    const locationIds = await daycareLocationIds(daycareId);
    query = scheduleRef
    .where("weekStart", "==", weekStart)
    .where("locationId", "in", locationIds);
  }

  if (classId !== "*") {
    // Get schedules for specific class OR schedules that apply to all classes (classId = null)
    // Note: Firestore doesn't support OR queries easily, so we'll fetch all and filter in memory
    const snapshot = await query.get();
    return snapshot.docs
      .filter(doc => {
        const data = doc.data();
        return data.classId === classId;
      })
      .map(doc => ({ id: doc.id, ...doc.data() }));
  }
  // Get all schedules for all classes within the location(s)
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createSchedule(data: ScheduleCreate, userId: string, locationId: string, daycareId: string) {
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
  // Need gradually delete related data if the classId === "*"

  await db.collection("schedules").doc(scheduleId).delete();
}
