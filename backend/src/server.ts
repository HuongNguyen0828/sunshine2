// src/server.ts
// src/app.ts
import express from "express";
import cors from "cors";
import childRoutes from "./routes/ChildRoutes";
import admin from "firebase-admin";
import dotenv from "dotenv";
// using Firebase Functions for automatic Sync role => clustom claims
import { onDocumentWritten } from "firebase-functions/v2/firestore";


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



// ------------------ Assign role endpoint: With AUTOMATIC sync with Cloud Function ------------------
  // Whenever you assign/change a user’s role:

  // Update Firestore (users/{uid}/role).

  // Set the same role in custom claims.

  // Keep them consistent.

// app.post("/set-role", async (req, res) => {
//   const { uid, role } = req.body;
//    // If doesn't provide enough input
//   if (!uid || !role) {
//     return res.status(400).json({ message: "uid and role are required" });
//   }

//   // Update Firestore
//   try {
//     await admin.auth().setCustomUserClaims(uid, { role });
//     return res.status(200).json({ message: `Role ${role} assigned to user ${uid}` });
//   } catch (error: any) {
//     console.error("Error setting role:", error);
//     return res.status(500).json({ message: error.message });
//   }
// });

// When the event provider generates an event that matches the function's conditions, the code is invoked. 
// Trigger when a user's role field changes
export const syncRoleToClaims = onDocumentWritten("users/{uid}", async (event) => {
  
  // Get uid
  const uid = event.params.uid;
  // Firestore document snapshot
  const afterData = event.data?.after?.data();
  if (!afterData) return;

  const role = afterData.role;

  // Sync role into custom claims
  await admin.auth().setCustomUserClaims(uid, { role });

  console.log(`Custom claims updated for ${uid}: ${role}`);
});


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



app.get("/", (req, res) => {
  console.log("GET / request received");
  res.send("Backend server is running!");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});



export default app;