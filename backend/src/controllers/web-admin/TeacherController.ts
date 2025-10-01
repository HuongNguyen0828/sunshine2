// Controller functions for handling teacher-related requests
// All handlers call service-layer functions and shape HTTP responses.

import { Request, Response } from "express";
import * as TeacherService from "../../services/web-admin/teacherService";
import { messaging } from "firebase-admin";

// POST /api/teachers
// Create a new teacher
export const addTeacher = async (req: Request, res: Response) => { 
  // Extract loationId and the teacher data from req.user and req.body
  const locationId = req.user?.locationId;

  // Check locationId exists
  if (!locationId) {
    return res.status(400).json({message: "Location missing from current Admin  profile"});
  }
  // Check body exists
  const teacherData = req.body;
  if (!teacherData) {
    return res.status(400).json({ message: "Teacher data required" });
  }

  // Else, create the teacher
  try {
    const newTeacher = await TeacherService.addTeacher(req.body);
    res.status(201).json(newTeacher);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Error creating teacher" });
  }
};

// GET /api/teachers
// List all teachers
export const getAllTeachers = async (req: Request, res: Response) => {
  // Extract locationId from req.user (set by authMiddleware)
  const locationId = req.user?.locationId;
  if (!locationId) {
    return res.status(400).json({message: "Location missing from user profile"});
  }

  // Else, get all teachers only of that location
  try {
    const teachers = await TeacherService.getAllTeachers();
    res.status(200).json(teachers);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch teachers" });
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
    // if found return the teacher
    res.json(teacher);
  } catch (error: any) {
    res.status(500).json({message: error.message ||  "Error fetching teacher" });
  }
};

// PUT /api/teachers/:id
// Update an existing teacher
export const updateTeacher = async (req: Request, res: Response) => {
  const id = req.params.id;
  const body = req.body;
  if (!id) return res.status(403).json({message: "Missing teacher id"})
  try {
    const updatedTeacher = await TeacherService.updateTeacher(id, body);

    if (!updatedTeacher)
      return res.status(404).json({ message: "Teacher not found" });
    res.json(updatedTeacher);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Error updating teacher" });
  }
};

// DELETE /api/teachers/:id
// Delete a teacher by ID
export const deleteTeacher = async (req: Request, res: Response) => {
  // DELETE passing Resources Id in the URL
  const id = req.params.id;
  if (!id) return res.status(403).json({message: "Missing teacher id"})
  try {
    const success = await TeacherService.deleteTeacher(id);
    if (!success) return res.status(404).json({ message: "Teacher not found" });
    res.json({ message: "Teacher deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Error deleting Teacher" });
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
