import { db, admin } from "../../lib/firebase";

// Helper function to get classes for a given teacherId and locationId
async function getClassesForTeacherId(teacherId: string, locationId: string) {
  const classesSnapshot = await db.collection("classes")
    .where("teacherIds", "array-contains", teacherId) // matching teacherId
    .where("locationId", "==", locationId)   // matching locationId
    .get();

    return classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// List schedules for a given weekStart, teacherId (in proven of classId and locationId)
export async function listSchedules(weekStart: string, teacherId: string, locationId: string) {
    // 1. First, get classes for the teacher at the specified location
    const classes = await getClassesForTeacherId(teacherId, locationId);
    const classIds = classes.map(c => c.id);
    let query = null;
    let wildcardQuery = null;

    // 2. Build the query to fetch schedules for those classes
    if (classIds.length > 0) {
        // Checking if classId inside Schedules === "*", then we need to fetch those schedules as well
        // 2.1. Case when exactly match classId on Schedules
        query = db.collection("schedules")
        .where("weekStart", "==", weekStart)
        .where("locationId", "==", locationId)
        .where("classId", "in", classIds); // it's safe as 1 teacher won't have more than 2 classes

        // 2.2. Case when classId iscould be "*", find any schedules that apply to all classes and with this locationId
        wildcardQuery = db.collection("schedules")
        .where("weekStart", "==", weekStart)
        .where("locationId", "==", locationId)
        .where("classId", "==", "*");

    } else {
        // If the teacher has no classes, return an empty array
        return [];
    }
  
    // 3. Execute the query 
    const snapshotQuery = await query.get();
    const resultExactlyMatched = snapshotQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const snapshotWildcard = await wildcardQuery.get();
    const resultWildcard = snapshotWildcard.docs.map(doc => ({ id: doc.id, ...doc.data() })); // meaning both classes have this schedule

    // 4. Combine results from both queries
    return [...resultExactlyMatched, ...resultWildcard];
}
