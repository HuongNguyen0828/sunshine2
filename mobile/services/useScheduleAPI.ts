import { Schedule } from "@/features/types";
import { BASE_URL } from "./useEntriesAPI";


export async function fetchSchedulesForTeacher(month: string): Promise<Schedule[]> {
    try {
        const schedules = await fetch(`${BASE_URL}/schedules?month=${encodeURIComponent(month)}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        
        return schedules.json();
  } catch (e: any) {
    throw e;
  }
}