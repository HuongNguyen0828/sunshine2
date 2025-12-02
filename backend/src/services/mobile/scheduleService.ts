import { db, admin } from "../../lib/firebase";

// Helper function to get classes for a given teacherId and locationId
async function getClassesForTeacherId(teacherId: string, locationId: string) {
    // First, need to get Teacher docId from teacherID (authUid)
    const teacherSnapshot = await db.collection("users")
        .where("role", "==", "teacher")
        .where("authUid", "==", teacherId) // Matching uid
        .get();

    if (teacherSnapshot.empty) {
        throw new Error("Cannot match user with teacher doc")
    }
    const teacherRef = teacherSnapshot.docs[0].ref;
    const teacherDocId = teacherRef.id;

    const classesSnapshot = await db.collection("classes")
        .where("teacherIds", "array-contains", teacherDocId) // matching teacherId
        .where("locationId", "==", locationId)   // matching locationId
        .get();

    return classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// List schedules for a given weekStart, teacherId (in proven of classId and locationId)
export async function listSchedules(monthStart: string, teacherId: string, locationId: string) {
    // 1. First, get classes for the teacher at the specified location
    const classes = await getClassesForTeacherId(teacherId, locationId);
    const classIds = classes.map(c => c.id);

    /* ================
    Example of weekStart(2025-11-10) included in monthStart(2025-11-01): matching year and month 2025-11
        As Firestore Doesn't support "Contains substring", so we can use in range: (2025-11-1, 2025-11-32)
    Also, need to consider case: classId === "*"
    =======================
    */

    // Add null checks and debugging
    if (!monthStart) {
      console.error('Month parameter is undefined or null');
      throw new Error('Month parameter is required');
    }
    // console.log(monthStart);
    const rangeStart = `${monthStart.slice(0, 7)}-00`; 
    //const rangeEnd = monthStart.slice( 0, 7).concat("-32");  // get at YYYY-MM, adding boundary "-32"
    const rangeEnd = `${monthStart.slice(0, 7)}-32`; // better approach

    // 2. Build the query to fetch schedules for those classes
    if (classIds.length > 0) {
        // Checking if inside Schedules, classId === "*", then we need to fetch those schedules as well
        // 2.1. Case when exactly match classId on Schedules
        console.log("ClassIds: ", classIds);
        // 2.2. Case when classId iscould be "*", find any schedules that apply to all classes and with this locationId
        const combinedClassIds = [...classIds, '*'];
        
        // Using index for performance of Firestore query and it's required as this is a complex query (with range and in condition)
        /*===========
        from Firestore Recommendation
            The schedules collection requires additional indexing to run your query

                Composite indexes 
                Fields	Order	Status 
                classId
                locationId
                weekStart
                __name__
                Ascending
                Ascending
                Ascending
                Ascending
                Needs creation
        */
        const query = db.collection("schedules")
        .where("weekStart", ">=", rangeStart) // >= rangeStart
        .where("weekStart", "<=", rangeEnd) // <= rangeEnd
        .where("locationId", "==", locationId)
        .where("classId", "in", combinedClassIds); // it's safe as 1 teacher won't have more than 2 classes + '*' = 3

          // 3. Execute the query 
        const snapshotQuery = await query.get();
        const resultExactlyMatched = snapshotQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Exactly match" + resultExactlyMatched);

        // 4. Combine results from both queries
        return resultExactlyMatched;

    } else {
        // If the teacher has no classes, return an empty array
        return [];
    }
}



/**
 * List schedules for a given weekStart, teacherId (in proven of classId and locationId)
 * 
 *  */ 
export async function listSchedulesForParent(monthStart: string, parentId: string) {

      // 1. First, get classes for the teacher at the specified location
    const classIds = await getClassesForParentId(parentId);

    /* ================
    Example of weekStart(2025-11-10) included in monthStart(2025-11-01): matching year and month 2025-11
        As Firestore Doesn't support "Contains substring", so we can use in range: (2025-11-1, 2025-11-32)
    Also, need to consider case: classId === "*"
    =======================
    */

    // Add null checks and debugging
    if (!monthStart) {
      console.error('Month parameter is undefined or null');
      throw new Error('Month parameter is required');
    }
    // console.log(monthStart);
    const rangeStart = `${monthStart.slice(0, 7)}-00`; 
    //const rangeEnd = monthStart.slice( 0, 7).concat("-32");  // get at YYYY-MM, adding boundary "-32"
    const rangeEnd = `${monthStart.slice(0, 7)}-32`; // better approach

    // 2. Build the query to fetch schedules for those classes
    if (classIds.length > 0) {
        // Checking if inside Schedules, classId === "*", then we need to fetch those schedules as well
        // 2.1. Case when exactly match classId on Schedules
        console.log("ClassIds: ", classIds);
        // 2.2. Case when classId iscould be "*", find any schedules that apply to all classes and with this locationId
        const combinedClassIds = [...classIds, '*'];
        
        // Using index for performance of Firestore query and it's required as this is a complex query (with range and in condition)
        /*===========
        from Firestore Recommendation
            The schedules collection requires additional indexing to run your query

                Composite indexes 
                Fields	Order	Status 
                classId
                locationId
                weekStart
                __name__
                Ascending
                Ascending
                Ascending
                Ascending
                Needs creation
        */
        const query = db.collection("schedules")
        .where("weekStart", ">=", rangeStart) // >= rangeStart
        .where("weekStart", "<=", rangeEnd) // <= rangeEnd
        // .where("locationId", "==", locationId)
        .where("classId", "in", combinedClassIds); // it's safe as 1 teacher won't have more than 2 classes + '*' = 3

          // 3. Execute the query 
        const snapshotQuery = await query.get();
        const resultExactlyMatched = snapshotQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Exactly match" + resultExactlyMatched);

        // 4. Combine results from both queries
        return resultExactlyMatched;

    } else {
        // If the teacher has no classes, return an empty array
        return [];
    }
}


// Helper function to get classes for a given parentId and locationId: also based on the children parent have inside the class

async function getClassesForParentId(parentId: string) {
    // 1. First, need to get Parent docId from parentID (authUid)
    const parentSnapshot = await db.collection("users")
        .where("role", "==", "parent")
        .where("authUid", "==", parentId) // Matching uid
        .get();

    if (parentSnapshot.empty) {
        throw new Error("Cannot match user with parent doc")
    }
    const parentDoc = parentSnapshot.docs[0];

    // 2. Find childIds from parentDoc
    const parentData = parentDoc.data();
    const childRelationships = Array.isArray(parentData.childRelationships) 
        ? parentData.childRelationships
        : [] 
    ;
    const childrenIds: string[] = childRelationships.map(rel => rel.childId);
    // 3. From each childId, find their class.
    const childRefs = childrenIds.map(id => db.collection('children').doc(id));
    const childSnaps = await db.getAll(...childRefs);


    // Extract classId strings and filter undefined/null
    const classIdsRaw = childSnaps
        .map(snap => (snap.exists ? snap.data()?.classId : undefined))
        .filter((cid): cid is string => typeof cid === "string" && cid.length > 0)
    ;

    // Combine if same classId
    return Array.from(new Set(classIdsRaw));
}