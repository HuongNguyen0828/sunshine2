import { Router } from "express";

import { getAllTeachers, addTeacher, updateTeacher, deleteTeacher, getTeacherById} from "../../controllers/web-admin/TeacherController";
import { authMiddleware } from "../../middleware/authMiddleware";


const teacherRoutes = Router();


// POST /teachers
teacherRoutes.post("/", addTeacher);

// GET /teachers: Add middleware for checking location id from idToken
teacherRoutes.get("/", authMiddleware, getAllTeachers);

// GET /teachers/:id
teacherRoutes.get("/:id", getTeacherById);

// Partial update teacher
// PATCH /teachers/:id: Partially update a teacher
teacherRoutes.patch("/:id", updateTeacher);

// DELETE /teachers/:id
teacherRoutes.delete("/:id", deleteTeacher);




export default teacherRoutes;

