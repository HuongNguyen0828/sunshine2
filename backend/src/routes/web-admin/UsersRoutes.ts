// backend/routes/web-admin/usersRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { getTeacherCandidates, getTeachers } from "../../controllers/web-admin/ClassController";

const router = Router();

router.get("/teacher-candidates", authMiddleware, getTeacherCandidates);
router.get("/teachers", authMiddleware, getTeachers);

export default router;
