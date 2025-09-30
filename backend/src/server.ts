// src/server.ts
// src/app.ts
import express from "express";
import cors from "cors";
// import { admin } from "./lib/firebase";
import dotenv from "dotenv";
import route from "./routes/AuthRoutes";
import childRoutes from "./routes/web-admin/ChildRoutes";
import teacherRoutes from "./routes/web-admin/TeacherRoutes";

// Must be on top
dotenv.config();

// Enforce security network domain in Cors
const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:3000", // Web admin frontend (runs on port 3000)
      "http://10.0.2.2:8081", // React Native Metro bundler (default port 8081)
      "http://localhost:8081", // React Native Metro bundler alternative
      // Add production domains later
    ],
    credentials: true,
  })
);

app.use(express.json()); // parse JSON body
// For testing backend server is reachable
app.get("/", (req, res) => {
  res.send("Server is running!");
});

//Signup and autherization
app.use("/auth", route);
// Child
app.use("/child", childRoutes);
app.use("/teacher", teacherRoutes);

// Adding "0.0.0.0" for listing all networking, including localhost (web), and emulator and physically machine (phone)
// Then must enforce security in CORS network (domain) access above
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
