// src/server.ts
// src/app.ts
import express from "express";
import cors from "cors";
import childRoutes from "./routes/ChildRoutes";
import admin from "firebase-admin";
import dotenv from "dotenv";
import route from "./routes/AuthRoutes"

// Must be on top
dotenv.config(); 


// Initialize Firebase Admin SDK for have custom clain assign to custom user roles
admin.initializeApp({
  credential: admin.credential.cert(require("../serviceAccountKey.json")),
});   


// Firestore reference
const db = admin.firestore();


const app = express();
app.use(cors());
app.use(express.json());  // parse JSON body

//Signup
app.use("/auth", route)
// Child 
app.use("/child", childRoutes);



// ------------------ Assign role endpoint ------------------
// app.post("/set-role", async (req, res) => {
//   const { uid, role } = req.body;

//   if (!uid || !role) {
//     return res.status(400).json({ message: "uid and role are required" });
//   }

//   try {
//     await admin.auth().setCustomUserClaims(uid, { role });
//     return res.status(200).json({ message: `Role ${role} assigned to user ${uid}` });
//   } catch (error: any) {
//     console.error("Error setting role:", error);
//     return res.status(500).json({ message: error.message });
//   }
// });
// // -----------------------------------------------------------


// Fetch all teachers
app.get("/teachers", async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection("teachers").get();
    const teachers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to ISO string for frontend
        startDate: data.start ? data.start.toDate().toISOString() : null,
        endDate: data.end? data.end.toDate().toISOString() : null
      };
    });
    return res.status(200).json(teachers);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch teachers" });
  }
});








const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});



export default app;