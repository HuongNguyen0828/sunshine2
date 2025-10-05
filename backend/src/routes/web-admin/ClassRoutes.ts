import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";
import { UserRole } from "../../models/user";
import {
  getAllClasses,
  addClass,
  updateClass,
  deleteClass,
  assignTeachers,
} from "../../controllers/web-admin/ClassController";

const router = Router();

// Admin-only protected routes
router.get("/", authMiddleware, authorize(UserRole.Admin), getAllClasses);
router.post("/", authMiddleware, authorize(UserRole.Admin), addClass);
router.put("/:id", authMiddleware, authorize(UserRole.Admin), updateClass);
router.delete("/:id", authMiddleware, authorize(UserRole.Admin), deleteClass);
router.post("/:id/assign-teachers", authMiddleware, authorize(UserRole.Admin), assignTeachers);


// Assign teachers to a class (id in path)
router.post("/:id/assign-teachers", authMiddleware, authorize(UserRole.Admin), assignTeachers);

export default router;
