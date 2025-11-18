import { Response} from "express";
import { AuthRequest } from "../../middleware/authMiddleware";
import {listSchedules} from '../../services/mobile/scheduleService';

export const getSchedulesForTeacherController = async (req: AuthRequest, res: Response) => {
    try {
        // Extract teacherId and locationId from authenticated user
        const teacherId  = req.user?.uid; // is matching with Firebase Auth UID
        const locationId = req.user?.locationId;

        // Extract weekStart from query parameters
        const weekStart  = req.query.weekStart as string;

        if (!teacherId || !locationId) {
            return res.status(400).json({ ok: false, message: "Invalid teacher or location ID" });
        }
        // Matching teacherId from Auth with docId in users collection
        const schedules = await listSchedules(weekStart, teacherId, locationId);
        res.status(200).json({ ok: true, data: schedules });
    } catch (error) {
        console.error("Error in getSchedulesForTeacherController:", error);
        res.status(500).json({ ok: false, message: "Internal server error" });
    }
}