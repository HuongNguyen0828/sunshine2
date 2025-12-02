import { Response} from "express";
import { AuthRequest } from "../../middleware/authMiddleware";
import {listSchedules, listSchedulesForParent} from '../../services/mobile/scheduleService';


// For Teacher
export const getSchedulesForTeacher = async (req: AuthRequest, res: Response) => {
    try {
        // Extract teacherId and locationId from authenticated user
        const teacherId  = req.user?.uid; // is matching with Firebase Auth UID
        const locationId = req.user?.locationId;

        // Extract weekStart from query parameters
        const monthStart  = req.query.month as string;

         console.log('🔍 Received parameters:', {
            teacherId,
            locationId,
            monthStart,
            query: req.query, // Log all query parameters
            params: req.params // Log all route parameters
        });

        if (!teacherId || !locationId) {
            return res.status(400).json({ ok: false, message: "Invalid teacher or location ID" });
        }
        // Matching teacherId from Auth with docId in users collection
        const schedules = await listSchedules(monthStart, teacherId, locationId);
        res.status(200).json({ ok: true, data: schedules });
    } catch (error) {
        console.error("Error in getSchedulesForTeacher:", error);
        res.status(500).json({ ok: false, message: "Internal server error" });
    }
}

// For Parent
export const getSchedulesForParent = async (req: AuthRequest, res: Response) => {
    try {
        // Extract teacherId and locationId from authenticated user
        const parentId  = req.user?.uid; // is matching with Firebase Auth UID
        const locationIds = req.user?.locationIds;

        // Extract weekStart from query parameters
        const monthStart  = req.query.month as string;

         console.log('🔍 Received parameters:', {
            parentId,
            locationIds,
            monthStart,
            query: req.query, // Log all query parameters
            params: req.params // Log all route parameters
        });

        if (!parentId ) {
            return res.status(400).json({ ok: false, message: "Invalid parent or location ID" });
        }
        // Matching parentId from Auth with docId in users collection
        const schedules = await listSchedulesForParent(monthStart, parentId);
        res.status(200).json({ ok: true, data: schedules });
    } catch (error) {
        console.error("Error in getSchedulesForParent:", error);
        res.status(500).json({ ok: false, message: "Internal server error" });
    }
}