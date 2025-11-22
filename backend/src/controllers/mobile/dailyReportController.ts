// backend/src/controllers/mobile/dailyReportController.ts

import { Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  listDailyReportsForTeacher,
  listDailyReportsForParent,
  markDailyReportAsSent,
} from "../../services/mobile/dailyReportService";
import type { DailyReportFilter } from "../../../../shared/types/type";

function normalizeOptional(v?: string | string[] | null) {
  if (Array.isArray(v)) v = v[0];
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const t = s.toLowerCase();
  if (t === "all" || t === "all classes" || t === "all children") return undefined;
  return s;
}

/**
 * GET /api/mobile/teacher/daily-reports
 * Role: teacher only
 */
export const getTeacherDailyReports = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "forbidden_role" });
    }

    const { daycareId, locationId } = req.user;
    if (!daycareId || !locationId) {
      return res
        .status(400)
        .json({ message: "Missing daycare or location scope for user" });
    }

    const filter: DailyReportFilter = {};

    const classId = normalizeOptional(req.query.classId as any);
    const childId = normalizeOptional(req.query.childId as any);

    if (classId) filter.classId = classId;
    if (childId) filter.childId = childId;

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
 * GET /api/mobile/parent/daily-reports
 * Role: parent only
 */
export const getParentDailyReports = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "parent") {
      return res.status(403).json({ message: "forbidden_role" });
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

    const classId = normalizeOptional(req.query.classId as any);
    const childId = normalizeOptional(req.query.childId as any);

    if (classId) filter.classId = classId;
    if (childId) filter.childId = childId;

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
 * POST /api/mobile/teacher/daily-reports/:id/send
 * Role: teacher only
 */
export const sendDailyReport = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "forbidden_role" });
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
