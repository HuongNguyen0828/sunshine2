// backend/src/routes/mobile/parentFeedRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { getParentFeed } from "../../controllers/mobile/parentFeedController";

const router = Router();

router.get("/parent-feed", authMiddleware, getParentFeed);

export default router;
