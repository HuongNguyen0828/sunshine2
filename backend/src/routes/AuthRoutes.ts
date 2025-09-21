//src/routes/AdminRoutes
import {Router } from "express"
import admin from "firebase-admin"



const router = Router();

router.post("/register", async (req, res) => {
    const { email, password, name } = req.body;

    try {
        // 1. Check if email exists in teachers, admin, parents collections
        const teachersSnapShot = await admin.firestore()
            .collection("teachers")
            .where("email", "==", email)
            .get();
        
        const parentsSnapShot =  await admin.firestore()
            .collection("parents")
            .where("email", "==", email)
            .get();

        const adminSnapShot = await admin.firestore()
            .collection("admin")
            .where("email", "==", email)
            .get();

        // Check if cannot find
        if (teachersSnapShot.empty && parentsSnapShot.empty && adminSnapShot.empty) {
            return res.status(400).json({message: "Email not recognized"})
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
            await admin.auth().setCustomUserClaims(userRecord.uid, {role: "parent"});
            // 4. Updating Firebase doc with UID of Auth
            await parentsDoc?.ref.update({id: userRecord.uid});
            return res.status(201).json({message: "Parent registered successfully"})
        }

        if (!adminSnapShot.empty) {
            // Take the matching doc from collection
            const adminDoc = adminSnapShot.docs[0];
            // 3. Set custom claims to be teacher
            await admin.auth().setCustomUserClaims(userRecord.uid, {role: "admin"});
            // 4. Updating Firebase doc with UID of Auth
            await adminDoc?.ref.update({id: userRecord.uid});
            return res.status(201).json({message: "Admin registered successfully"})
        }

    
        if (!teachersSnapShot.empty) {
            // Take the matching doc from collection
            const teacherDoc = teachersSnapShot.docs[0];
            // 3. Set custom claims to be teacher
            await admin.auth().setCustomUserClaims(userRecord.uid, {role: "teacher"});
            // 4. Updating Firebase doc with UID of Auth
            await teacherDoc?.ref.update({id: userRecord.uid});
            return res.status(201).json({message: "Teacher registered successfully"})
        }

        
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({message: error.message})
    }
})




export default router;
