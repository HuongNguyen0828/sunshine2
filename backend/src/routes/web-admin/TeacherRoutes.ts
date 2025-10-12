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

const router = Router();

// Global auth guard for this router
router.use(authMiddleware);

// Create
router.post("/", authMiddleware, addTeacher);

// Read (list)
router.get("/", authMiddleware, getAllTeachers);

// Read (detail)
router.get("/:id", authMiddleware, getTeacherById);

// Update
router.put("/:id", authMiddleware, updateTeacher);

// Delete
router.delete("/:id", authMiddleware, deleteTeacher);

// Assign class
router.post("/:id/assign", authMiddleware, assignTeacherToClass);

export default router;
