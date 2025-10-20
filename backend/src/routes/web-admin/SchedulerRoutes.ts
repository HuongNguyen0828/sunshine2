import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  getSchedules,
  createSchedule,
  deleteSchedule,
} from "../../controllers/web-admin/SchedulerController";

const router = Router();

router.get("/", authMiddleware, getSchedules);
router.post("/", authMiddleware, createSchedule);
router.delete("/:id", authMiddleware, deleteSchedule);

export default router;
