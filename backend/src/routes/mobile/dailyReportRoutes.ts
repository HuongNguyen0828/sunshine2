// backend/src/routes/mobile/dailyReportRoutes.ts

import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  getTeacherDailyReports,
  getParentDailyReports,
  sendDailyReport,
} from "../../controllers/mobile/dailyReportController";

const router = Router();

/**
 * Teacher daily reports
 * Base path (with app.ts prefix) will be: /mobile/teacher/daily-reports
 */
router.get(
  "/teacher/daily-reports",
  authMiddleware,
  getTeacherDailyReports
);

/**
 * Parent daily reports
 * Base path (with app.ts prefix) will be: /mobile/parent/daily-reports
 */
router.get(
  "/parent/daily-reports",
  authMiddleware,
  getParentDailyReports
);

/**
 * Manual send (optional, for future resend/share support)
 * POST /mobile/teacher/daily-reports/:id/send
 */
router.post(
  "/teacher/daily-reports/:id/send",
  authMiddleware,
  sendDailyReport
);

export default router;
