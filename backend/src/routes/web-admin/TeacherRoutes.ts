import { Router } from "express";

import { getAllTeachers, addTeacher, updateTeacher, deleteTeacher, getTeacherById} from "../../controllers/web-admin/TeacherController";


const teacherRoutes = Router();


// POST /teachers
teacherRoutes.post("/", addTeacher);

// GET /teachers
teacherRoutes.get("/", getAllTeachers);

// GET /teachers/:id
teacherRoutes.get("/:id", getTeacherById);

// Update teacher
teacherRoutes.put("/:id", updateTeacher);

// DELETE /teachers/:id
teacherRoutes.delete("/:id", deleteTeacher);



export default teacherRoutes;

