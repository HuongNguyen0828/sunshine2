import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  getAllClasses,
  addClass,
  updateClass,
  deleteClass,
  assignTeachers,
  getTeacherCandidates,
} from "../../controllers/web-admin/ClassController";

const router = Router();

// Classes
router.get("/", authMiddleware, getAllClasses);
router.post("/", authMiddleware, addClass);
router.put("/:id", authMiddleware, updateClass);
router.delete("/:id", authMiddleware, deleteClass);
router.post("/:id/assign-teachers", authMiddleware, assignTeachers);

export default router;
