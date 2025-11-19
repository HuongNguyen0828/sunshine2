import { Schedule } from "../../shared/types/type";
import { BASE_URL } from "./useEntriesAPI";
import { auth } from "../lib/firebase"


async function authHeader() {
  const idToken = await auth.currentUser?.getIdToken(true);
  if (!idToken) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${idToken}` };
}


export async function fetchSchedulesForTeacher(month: string): Promise<Schedule[]> {
    try {
        const schedules = await fetch(`${BASE_URL}/schedules?month=${month}`, {
            method: "GET",
            headers: {
            "Content-Type": "application/json",
            ...(await authHeader()),
          }
        });
        
        return schedules.json();
  } catch (e: any) {
    throw e;
  }
}