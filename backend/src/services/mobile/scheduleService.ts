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
export async function listSchedules(monthStart: string, teacherId: string, locationId: string) {
    // 1. First, get classes for the teacher at the specified location
    const classes = await getClassesForTeacherId(teacherId, locationId);
    const classIds = classes.map(c => c.id);
    let query = null;
    let wildcardQuery = null;

    /* ================
    Example of weekStart(2025-11-10) included in monthStart(2025-11-01): matching year and month 2025-11
        As Firestore Doesn't support "Contains substring", so we can use in range: (2025-11-1, 2025-11-32)
    Also, need to consider case: classId === "*"
    =======================
    */
   const rangeStart = monthStart;
//    const rangeEnd = monthStart.slice( 0, 6).concat("-32");  // get at YYYY-MM, adding boundary "-32"
    const rangeEnd = `${monthStart.slice(0, 6)}-32`; // better approach

    // 2. Build the query to fetch schedules for those classes
    if (classIds.length > 0) {
        // Checking if inside Schedules, classId === "*", then we need to fetch those schedules as well
        // 2.1. Case when exactly match classId on Schedules
        query = db.collection("schedules")
        .where("weekStart", ">=", rangeStart) // >= rangeStart
        .where("weekStart", "<=", rangeEnd) // <= rangeEnd
        .where("locationId", "==", locationId)
        .where("classId", "in", classIds); // it's safe as 1 teacher won't have more than 2 classes

        // 2.2. Case when classId iscould be "*", find any schedules that apply to all classes and with this locationId
        wildcardQuery = db.collection("schedules")
        .where("weekStart", ">=", rangeStart) // >= rangeStart
        .where("weekStart", "<=", rangeEnd) // <= rangeEnd        
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
