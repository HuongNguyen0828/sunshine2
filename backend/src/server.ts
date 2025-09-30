// src/server.ts
// src/app.ts
import express from "express";
import cors from "cors";
import childRoutes from "./routes/web-admin/ChildRoutes";
import admin from "firebase-admin";
import dotenv from "dotenv";
import route from "./routes/AuthRoutes";

// Must be on top
dotenv.config();

// Initialize Firebase Admin SDK for have custom clain assign to custom user roles
admin.initializeApp({
  credential: admin.credential.cert(require("../serviceAccountKey.json")),
});

// Firestore reference
export const db = admin.firestore();


// Enforce security network domain in Cors
const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000', // Web admin frontend (runs on port 3000)
    'http://10.0.2.2:8081',  // React Native Metro bundler (default port 8081)
    'http://localhost:8081', // React Native Metro bundler alternative
    // Add production domains later
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); // parse JSON body

// Request logging middleware
app.use((req, res, next) => {
  console.log('\n📥 Incoming Request:');
  console.log(`  Method: ${req.method}`);
  console.log(`  URL: ${req.originalUrl}`);
  console.log(`  Origin: ${req.headers.origin}`);
  console.log(`  Headers:`, {
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? 'Bearer ***' : 'none'
  });
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`  Body:`, req.body);
  }

  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    console.log('📤 Outgoing Response:');
    console.log(`  Status: ${res.statusCode}`);
    console.log(`  Data:`, typeof data === 'string' ? data.substring(0, 200) : data);
    return originalSend.call(this, data);
  };

  next();
});

// For testing backend server is reachable
app.get('/', (req, res) => {
  res.send('Server is running!');
});

//Signup and autherization
app.use("/auth", route);
// Child
app.use("/child", childRoutes);

// Fetch all teachers
app.get("/teachers", async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection("teachers").get();
    const teachers = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    });
    return res.status(200).json(teachers);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch teachers" });
  }
});


// Adding "0.0.0.0" for listing all networking, including localhost (web), and emulator and physically machine (phone)
// Then must enforce security in CORS network (domain) access above
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

app.listen(PORT,'0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
