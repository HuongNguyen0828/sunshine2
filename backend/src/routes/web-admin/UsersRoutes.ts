// routes/usersRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { getTeacherCandidates } from "../../controllers/web-admin/ClassController";

const router = Router();
// final path: /api/users/teacher-candidates
router.get("/teacher-candidates", authMiddleware, getTeacherCandidates);
export default router;
