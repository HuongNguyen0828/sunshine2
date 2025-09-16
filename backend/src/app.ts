// src/app.ts
import express from "express";
import kidsRoutes from "./routes/ChildRoutes";

const app = express();
app.use(express.json());

// Routes
app.use("/kids", kidsRoutes);

export default app;