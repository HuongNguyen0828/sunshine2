
// backend/src/server.ts
import "dotenv/config"; // must be first


import express from "express";
import cors from "cors";

import authRoutes from "./routes/AuthRoutes";
import teacherRoutes from "./routes/web-admin/TeacherRoutes";
import classRoutes from "./routes/web-admin/ClassRoutes";
import locationRoutes from "./routes/web-admin/LocationRoutes";
// import childRoutes from "./routes/web-admin/ChildRoutes"; // if/when you have it

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://10.0.2.2:8081",
      "http://localhost:8081",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Simple health checks
app.get("/", (_req, res) => res.send("Server is running!"));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- API routes (ALL under /api/*) ---
app.use("/api/auth", authRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/locations", locationRoutes);
// app.use("/api/children", childRoutes); // enable when ready

const PORT = Number(process.env.PORT) || 5001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
