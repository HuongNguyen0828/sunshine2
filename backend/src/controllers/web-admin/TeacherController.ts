// Controller functions for handling teacher-related requests
import { Request, Response } from "express";
import * as TeacherService from "../../services/web-admin/teacherService";
import { messaging } from "firebase-admin";

// Create a new Teacher
export const addTeacher = async (req: Request, res: Response) => {
  try {
    const newTeacher = await TeacherService.addTeacher(req.body);
    res.status(201).json(newTeacher);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Error creating teacher" });
  }
};

// Get all teachers
export const getAllTeachers = async (req: Request, res: Response) => {
  // Extract location id from user decoded inside JWT
  const locationId = req.user?.locationId;
  console.log(locationId);
  try {
    const teachers = await TeacherService.getAllTeachers(locationId);
    res.status(200).json(teachers);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch teachers" });
  }
};

// Get a single teacher by ID
export const getTeacherById = async (req: Request, res: Response) => {
  try {
    // if id not found return undefined
    const teacher = await TeacherService.getTeacherById(req.params.id)
    
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });
    // if found return the teacher
    res.json(teacher);
  } catch (error: any) {
    res.status(500).json({message: error.message ||  "Error fetching teacher" });
  }
};

// Update an existing teacher
export const updateTeacher = async (req: Request, res: Response) => {
  console.log("Handling  http request")
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

// Delete a Teacher
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

