import admin from "firebase-admin";

export async function signUp(email: string, password: string, name: string) {
  // 1. Check if email exists in teachers, admin, parents collections
  const teachersSnapShot = await admin
    .firestore()
    .collection("teachers")
    .where("email", "==", email)
    .get();

  const parentsSnapShot = await admin
    .firestore()
    .collection("parents")
    .where("email", "==", email)
    .get();

  const adminsSnapShot = await admin
    .firestore()
    .collection("admin")
    .where("email", "==", email)
    .get();

  // If cannot find
  if (teachersSnapShot.empty && parentsSnapShot.empty && adminsSnapShot.empty) {
    throw new Error("Email not recognized in our system. \n Your daycare need to have contract with Sunshine.");
  }

  // Else, if found
  // 2. Create Auth user
  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: `${name}`,
  });

  // 3. Set custom claims to be parent
  if (!parentsSnapShot.empty) {
    // Take the matching doc from collection
    const parentsDoc = parentsSnapShot.docs[0];
    // 3. Set custom claims to be teacher
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: "parent" });
    // 4. Updating Firebase doc with UID of Auth
    await parentsDoc?.ref.update({ uid: userRecord.uid });
    //Create a center users Collection of user
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      email: userRecord.email,
      displayName: userRecord.displayName,
      role: "parent", // or infer from your teacher/parent/admin check
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { role: "parent" }; // for later tracking
  }

  if (!adminsSnapShot.empty) {
    // Take the matching doc from collection
    const adminDoc = adminsSnapShot.docs[0];
    // 3. Set custom claims to be teacher
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: "admin" });
    // 4. Updating Firebase doc with UID of Auth
    await adminDoc?.ref.update({ uid: userRecord.uid });

    //Create a center users Collection of user
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      email: userRecord.email,
      displayName: userRecord.displayName,
      role: "admin", // or infer from your teacher/parent/admin check
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { role: "admin" };
  }

  if (!teachersSnapShot.empty) {
    // Take the matching doc from collection
    const teacherDoc = teachersSnapShot.docs[0];
    // 3. Set custom claims to be teacher
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: "teacher" });
    // 4. Updating Firebase doc with UID of Auth
    await teacherDoc?.ref.update({ uid: userRecord.uid });

    //Create a center users Collection of user
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      email: userRecord.email,
      displayName: userRecord.displayName,
      role: "teacher", // or infer from your teacher/parent/admin check
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { role: "teacher" };
  }

  // Else
  throw new Error("Unexpected error during registration");
}

