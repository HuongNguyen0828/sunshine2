"use client"

import * as Types from "../../shared/types/type"
import { NewTeacherInput } from "@/types/forms";

export async function fetchTeachers(): Promise<Types.Teacher[] | null> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher`);
        if (!res.ok) throw new Error("Failed to fetch teachers");
        
        const teachers = await res.json();
        
        // Ensure the response data isn't frozen/read-only
        return teachers
    } catch (err: any) {
        console.error(err);
        return null;
    }
}

export async function addTeacher(newTeacher: NewTeacherInput): Promise<Types.Teacher | null> {
    try {
        const res = await fetch("http://localhost:5000/teacher", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...newTeacher }),
        });
        // If faild calling API
        if (!res.ok) throw new Error("Failed to add teachers");
        //Else, return teacher
        const teacher = await res.json();
        
        // Ensure the response data isn't frozen/read-only
        return teacher
    } catch (err: any) {
        console.error(err);
        return null;
    }
}