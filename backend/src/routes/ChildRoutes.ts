// src/routes/kidsRoutes.ts
import { Router } from "express";
import { getAllChilds, addChild } from "../controllers/KidController";

const router = Router();

// GET /kids
router.get("/", getAllChilds);

// POST /kids
router.post("/", addChild);

export default router;