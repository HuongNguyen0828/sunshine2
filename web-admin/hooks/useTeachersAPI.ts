"use client"

import * as Types from "../../shared/types/type"
import { NewTeacherInput } from "@/types/forms";

// Fetch all teachers
export async function fetchAllTeachers(): Promise<Types.Teacher[]> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher`);
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message); // throw error message from backend
        }
        
        const teachers = await res.json();
        // Ensure the response data isn't frozen/read-only
        return teachers
    } catch (err: any) {
        console.error(err);
        return []; // retur empty list
    }
}

// Add a new teacher
export async function fetchAddTeacher(newTeacherInfo: Partial<NewTeacherInput>): Promise<Types.Teacher | null> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...newTeacherInfo }), // pass in object elements, not the whole object
        });
        // If faild calling API
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message); // throw error message from backend
        }
        //Else, return new teacher
        const teacher = await res.json();
        
        // Ensure the response data isn't frozen/read-only
        return teacher
    } catch (err: any) {
        console.error(err);
        return null;
    }
}


// Updating an existing teacher (Partially: only update changing fields)
    // If editing email involved, need to update on Firebase Auth
    // If editing endDate involved, need disable the account after the endDate on Firebase Auth (consider an automatic script)
export async function fetchUpdateTeacher(id: string, editingTeacher: Partial<NewTeacherInput>): Promise<Types.Teacher | null> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editingTeacher), // pass in object 
        });
        // If faild calling API
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message); // throw error message from backend
        };
        //Else, return updated teacher
        const teacher = await res.json();
        
        // Ensure the response data isn't frozen/read-only
        return teacher
    } catch (err: any) {
        console.error(err);
        return null;
    }
}

// Deleting an existing teacher
// After deleting, also delete teacher account on Firebase Auth
export async function fetchDeleteTeacher(teacherId: string): Promise<Types.Teacher | null> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/${teacherId}`, {
            method: "DELETE",
        });
        // If faild calling API
        if (!res.ok) throw new Error("Failed to delete teacher");
        //Else, return deleted teacher
        const teacher = await res.json();
        
        // Ensure the response data isn't frozen/read-only
        return teacher
    } catch (err: any) {
        console.error(err);
        return null;
    }
}