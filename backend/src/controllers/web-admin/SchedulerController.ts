import { Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";
import * as schedulerService from "../../services/web-admin/schedulerService";

export async function getSchedules(req: AuthRequest, res: Response) {
  try {
    const weekStart = req.query.weekStart as string;
    const classId = req.query.classId as string | undefined;

    if (!weekStart) {
      return res.status(400).json({ message: "weekStart is required" });
    }

    const schedules = await schedulerService.listSchedules(weekStart, classId);
    return res.json(schedules);
  } catch (error) {
    console.error("[getSchedules] error:", error);
    return res.status(500).json({ message: "Failed to fetch schedules" });
  }
}

export async function createSchedule(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const schedule = await schedulerService.createSchedule(req.body, userId);
    return res.status(201).json(schedule);
  } catch (error) {
    console.error("[createSchedule] error:", error);
    return res.status(500).json({ message: "Failed to create schedule" });
  }
}

export async function deleteSchedule(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    await schedulerService.deleteSchedule(id);
    return res.status(204).send();
  } catch (error) {
    console.error("[deleteSchedule] error:", error);
    return res.status(500).json({ message: "Failed to delete schedule" });
  }
}
