// Controller functions for handling teacher-related requests
// All handlers call service-layer functions and shape HTTP responses.

import { Request, Response } from "express";
import * as TeacherService from "../../services/web-admin/teacherService";

// POST /api/teachers
// Create a new teacher
export const addTeacher = async (req: Request, res: Response) => {
  try {
    const created = await TeacherService.addTeacher(req.body);
    return res.status(201).json(created);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Error creating teacher" });
  }
};

// GET /api/teachers
// List all teachers
export const getAllTeachers = async (_req: Request, res: Response) => {
  try {
    const teachers = await TeacherService.getAllTeachers();
    return res.status(200).json(teachers);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to fetch teachers" });
  }
};

// GET /api/teachers/:id
// Get a single teacher by ID
export const getTeacherById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: "id required" });

    const teacher = await TeacherService.getTeacherById(id);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    return res.json(teacher);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Error fetching teacher" });
  }
};

// PUT /api/teachers/:id
// Update an existing teacher
export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: "id required" });

    const updated = await TeacherService.updateTeacher(id, req.body);
    if (!updated) return res.status(404).json({ message: "Teacher not found" });

    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Error updating teacher" });
  }
};

// DELETE /api/teachers/:id
// Delete a teacher by ID
export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: "id required" });

    const ok = await TeacherService.deleteTeacher(id);
    if (!ok) return res.status(404).json({ message: "Teacher not found" });

    return res.json({ ok: true, uid: id });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Error deleting teacher" });
  }
};

// POST /api/teachers/:id/assign
// Assign a teacher to a class (bidirectional update)
export const assignTeacherToClass = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { classId } = req.body || {};

    if (!id) return res.status(400).json({ message: "id required" });
    if (!classId) return res.status(400).json({ message: "classId required" });

    const ok = await TeacherService.assignTeacherToClass(id, classId);
    if (!ok) return res.status(404).json({ message: "Teacher or class not found" });

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Error assigning class" });
  }
};
