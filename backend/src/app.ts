// src/app.ts
import express from "express";
import childRoutes from "./routes/ChildRoutes";

const app = express();
app.use(express.json());

// Routes
app.use("/kids", childRoutes);

export default app;