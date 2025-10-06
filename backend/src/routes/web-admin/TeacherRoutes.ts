// Express router for teacher endpoints.
// This router should be mounted in server.ts like:
//   app.use("/api/teachers", TeacherRoutes);

import { Router } from "express";
import {
  getAllTeachers,
  addTeacher,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  assignTeacherToClass,
} from "../../controllers/web-admin/TeacherController";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

// Global auth guard for this router
router.use(authMiddleware);

// Create
router.post("/", authorize("admin"), addTeacher);

// Read (list)
router.get("/", authorize("admin", "teacher"), getAllTeachers);

// Read (detail)
router.get("/:id", authorize("admin", "teacher"), getTeacherById);

// Update
router.put("/:id", authorize("admin"), updateTeacher);

// Delete
router.delete("/:id", authorize("admin"), deleteTeacher);

// Assign class
router.post("/:id/assign", authorize("admin"), assignTeacherToClass);

export default router;
