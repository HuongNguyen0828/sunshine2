// backend/src/controllers/mobile/dailyReportController.ts

import { Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  listDailyReportsForTeacher,
  listDailyReportsForParent,
  markDailyReportAsSent,
} from "../../services/mobile/dailyReportService";
import type { DailyReportFilter } from "../../../../shared/types/type";

/**
 * GET /mobile/teacher/daily-reports
 * Returns daily reports scoped to the authenticated teacher (daycare + location).
 *
 * Query params (optional):
 * - classId: string
 * - childId: string
 * - dateFrom: string (YYYY-MM-DD)
 * - dateTo: string (YYYY-MM-DD)
 * - sent: "true" | "false"
 */
export const getTeacherDailyReports = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { daycareId, locationId } = req.user;
    if (!daycareId || !locationId) {
      return res
        .status(400)
        .json({ message: "Missing daycare or location scope for user" });
    }

    const filter: DailyReportFilter = {};

    if (typeof req.query.classId === "string") {
      filter.classId = req.query.classId;
    }

    if (typeof req.query.childId === "string") {
      filter.childId = req.query.childId;
    }

    if (typeof req.query.dateFrom === "string") {
      filter.dateFrom = req.query.dateFrom;
    }

    if (typeof req.query.dateTo === "string") {
      filter.dateTo = req.query.dateTo;
    }

    if (typeof req.query.sent === "string") {
      if (req.query.sent === "true") filter.sent = true;
      if (req.query.sent === "false") filter.sent = false;
    }

    const reports = await listDailyReportsForTeacher({
      daycareId,
      locationId,
      filter,
    });

    return res.json(reports);
  } catch (err) {
    console.error("getTeacherDailyReports error:", err);
    return res.status(500).json({
      message: "Failed to fetch daily reports for teacher",
    });
  }
};

/**
 * GET /mobile/parent/daily-reports
 * Returns daily reports for a parent, based on childIds passed from the client.
 *
 * This controller expects:
 * - Authenticated parent user (req.user)
 * - Query params:
 *   - childIds: comma separated string of child ids (e.g. "child1,child2")
 *   - dateFrom?: string (YYYY-MM-DD)
 *   - dateTo?: string (YYYY-MM-DD)
 *   - sent?: "true" | "false"
 *
 * Note:
 * - Resolving childIds from parent user can be added later in a separate service
 *   to keep this controller isolated and low-risk.
 */
export const getParentDailyReports = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { daycareId, locationId } = req.user;
    if (!daycareId) {
      return res
        .status(400)
        .json({ message: "Missing daycare scope for user" });
    }

    const childIdsParam =
      typeof req.query.childIds === "string" ? req.query.childIds : "";

    const parentChildIds = childIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (parentChildIds.length === 0) {
      return res.status(400).json({
        message:
          "Missing childIds query parameter. Expected comma-separated child ids.",
      });
    }

    const filter: DailyReportFilter = {};

    if (typeof req.query.dateFrom === "string") {
      filter.dateFrom = req.query.dateFrom;
    }

    if (typeof req.query.dateTo === "string") {
      filter.dateTo = req.query.dateTo;
    }

    if (typeof req.query.sent === "string") {
      if (req.query.sent === "true") filter.sent = true;
      if (req.query.sent === "false") filter.sent = false;
    }

    const reports = await listDailyReportsForParent({
      daycareId,
      locationId,
      parentChildIds,
      filter,
      onlyVisibleToParents: true,
    });

    return res.json(reports);
  } catch (err) {
    console.error("getParentDailyReports error:", err);
    return res.status(500).json({
      message: "Failed to fetch daily reports for parent",
    });
  }
};

/**
 * POST /mobile/teacher/daily-reports/:id/send
 * Marks a daily report as sent/visible to parents.
 * Can be used by a Share button / Send All button on teacher mobile.
 * Even if you currently auto-send on checkout, this endpoint is useful
 * for future manual resend support.
 */
export const sendDailyReport = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const reportId = req.params.id;
    if (!reportId) {
      return res.status(400).json({ message: "Missing report id" });
    }

    await markDailyReportAsSent(reportId);
    return res.status(204).send();
  } catch (err) {
    console.error("sendDailyReport error:", err);
    return res.status(500).json({
      message: "Failed to send daily report",
    });
  }
};
