import {req, res} from "express";
import {getSchedulesForTeacher} from '../../services/mobile/scheduleService';

export const getSchedulesForTeacherController = async (req: req, res: res) => {
    try {
        const teacherId  = req.user?.uid; // is matching with Firebase Auth UID
        const locationId = req.user?.locationId;

        const weekStart  = req.params.weekStart as string;

        // Matching teacherId from Auth with docId in users collection
        const schedules = await getSchedulesForTeacher(weekStart, teacherId, locationId);
        res.status(200).json({ ok: true, data: schedules });
    } catch (error) {
        console.error("Error in getSchedulesForTeacherController:", error);
        res.status(500).json({ ok: false, message: "Internal server error" });
    }
}