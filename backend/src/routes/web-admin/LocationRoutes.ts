// backend/src/routes/web-admin/LocationRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { getLocations } from "../../controllers/web-admin/LocationController";

const router = Router();
router.get("/", authMiddleware, getLocations);
export default router;
