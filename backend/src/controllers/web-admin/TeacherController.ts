// Controller functions for handling teacher-related requests
import { Request, Response } from "express";
import * as TeacherService from "../../services/web-admin/teacherService";

// Create a new Teacher
export const addTeacher = async (req: Request, res: Response) => {
  try {
    const newTeacher = await TeacherService.addTeacher(req.body);
    res.status(201).json(newTeacher);
  } catch (error) {
    res.status(500).json({ message: "Error creating teacher" });
  }
};

// Get all teachers
export const getAllTeachers = async (req: Request, res: Response) => {
  try {
    const teachers = await TeacherService.getAllTeachers();
    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teachers" });
  }
};

// Get a single teacher by ID
export const getTeacherById = async (req: Request, res: Response) => {
  try {
    // if id not found return undefined
    const teacher = (await TeacherService.getTeacherById)
      ? req.params.id
      : undefined;
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });
    // if found return the teacher
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: "Error fetching teacher" });
  }
};

// Update an existing teacher
export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const updatedTeacher = (await TeacherService.updateTeacher)
      ? (req.params.id, req.body)
      : undefined;
    if (!updatedTeacher)
      return res.status(404).json({ message: "Teacher not found" });
    res.json(updatedTeacher);
  } catch (error) {
    res.status(500).json({ message: "Error updating teacher" });
  }
};

// Delete a Teacher
export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const success = (await TeacherService.deleteTeacher)
      ? req.params.id
      : false;
    if (!success) return res.status(404).json({ message: "Teacher not found" });
    res.json({ message: "Teacher deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting Teacher" });
  }
};

