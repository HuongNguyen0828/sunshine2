// import { Schedule } from "../../shared/types/type";
import { BASE_URL } from "./useEntriesAPI";
import { auth } from "../lib/firebase"
import { ScheduleDate } from "@/app/(teacher)/(tabs)/calendar";


async function authHeader() {
  const idToken = await auth.currentUser?.getIdToken(true);
  if (!idToken) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${idToken}` };
}


export async function fetchSchedulesForTeacher(month: string): Promise<ScheduleDate[]> {
    try {
        const result = await fetch(`${BASE_URL}/schedules?month=${month}`, {
            method: "GET",
            headers: {
            "Content-Type": "application/json",
            ...(await authHeader()),
          }
        });

        const  json = await result.json();
        const data = json.data;
        return data;
  } catch (e: any) {
    throw e;
  }
}