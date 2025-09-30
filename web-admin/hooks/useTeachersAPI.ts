"use client"

import * as Types from "../../shared/types/type"

export async function fetchTeachers(): Promise<Types.Teacher[] | null> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teachers`);
        if (!res.ok) throw new Error("Failed to fetch teachers");
        
        const teachers = await res.json();
        
        // Ensure the response data isn't frozen/read-only
        return teachers
    } catch (err: any) {
        console.error(err);
        return null;
    }
}