// backend/src/server.ts
import "dotenv/config";

import express from "express";
import cors from "cors";

import authRoutes from "./routes/AuthRoutes";
import teacherRoutes from "./routes/web-admin/TeacherRoutes";
import classRoutes from "./routes/web-admin/ClassRoutes";
import locationRoutes from "./routes/web-admin/LocationRoutes";
import usersRoutes from "./routes/web-admin/UsersRoutes";
import childRoutes from "./routes/web-admin/ChildRoutes";
import schedulerRoutes from "./routes/web-admin/SchedulerRoutes";

// mobile
import mobileRegistrationRoutes from "./routes/mobile/registrationRoutes";

const app = express();

app.set("trust proxy", true);

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://10.0.2.2:8081",
      "http://localhost:8081",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// request log
app.use((req, res, next) => {
  console.log("\n📥 Incoming Request:");
  console.log(`  Method: ${req.method}`);
  console.log(`  URL: ${req.originalUrl}`);
  console.log(`  Origin: ${req.headers.origin}`);
  console.log(`  Headers:`, {
    "content-type": req.headers["content-type"],
    authorization: req.headers.authorization ? "Bearer ***" : "none",
  });
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`  Body:`, req.body);
  }

  const originalSend = res.send;
  res.send = function (data) {
    console.log("📤 Outgoing Response:");
    console.log(`  Status: ${res.statusCode}`);
    console.log(
      `  Data:`,
      typeof data === "string" ? data.substring(0, 200) : data
    );
    return originalSend.call(this, data);
  };

  next();
});

// health
app.get("/", (_req, res) => res.send("Server is running!"));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// admin/web-admin routes
app.use("/api/auth", authRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/children", childRoutes);
app.use("/api/schedules", schedulerRoutes);

// mobile routes
app.use("/api/mobile", mobileRegistrationRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Not found" });
});

const PORT = Number(process.env.PORT) || 5001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
