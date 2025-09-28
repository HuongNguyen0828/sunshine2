"use client"

import * as Types from "../../shared/types/type"

export async function fetchTeachers(): Promise<Types.Teacher[] | null> {
    try {
        const res = await fetch("http://localhost:5000/teachers");
        if (!res.ok) throw new Error("Failed to fetch teachers");
        
        const teachers = await res.json();
        
        // Ensure the response data isn't frozen/read-only
        return Array.isArray(teachers) 
            ? teachers.map(teacher => ({ ...teacher })) // Create new objects
            : null;
    } catch (err: any) {
        console.error(err);
        return null;
    }
}