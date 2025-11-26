// import { Schedule } from "../../shared/types/type";
import { BASE_URL } from "./useEntriesAPI";
import { auth } from "../lib/firebase"
import { ScheduleDate } from "@/app/(teacher)/(tabs)/calendar";
import { EventByMonth,  } from "@/app/(teacher)/(tabs)/calendar";
import { ClassRow } from "@/app/(teacher)/(tabs)/dashboard";


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
};

// Helper function to process and split schedules; REUSABLE inside of layout, canlendar and Activity tabs for loading Events
export function processAndSplitSchedules(schedules: ScheduleDate[], classes:ClassRow[] ) {
    const numberInWeek = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const dailyActivities: EventByMonth = {};; // Array for dashboard
    const allCalendarEvents: EventByMonth = {}; // Object for calendar

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    schedules.forEach((activity) => {
      const baseDate = new Date(activity.weekStart);
      const dayIndex = numberInWeek.indexOf(activity.dayOfWeek);
      baseDate.setDate(baseDate.getDate() + dayIndex);
      const date = baseDate.toISOString().split('T')[0];

      // Create event object
      const event = {
        id: activity.id,
        title: activity.activityTitle,
        time: activity.timeSlot,
        classes: activity.classId !== "*"
          ? [(classes as ClassRow[]).find(cls => cls.id === activity.classId)?.name].filter(Boolean)
          : (classes as ClassRow[]).map((cls: any) => cls.name),
        type: activity.type,
        description: activity.activityDescription,
        materialsRequired: activity.activityMaterials,
        date: date
      };

      if (activity.type === "dailyActivity") {
        // I want just take Acitive from Today forward => furture (NOT IN THE PAST)
        const todayString = today.toISOString().split('T')[0];
        if (date >= todayString) {
          dailyActivities[date] = [...(dailyActivities[date] || []), event];
        }
          
      } else {
        // Add to all calendar events (for calendar tab)
        allCalendarEvents[date] = [...(allCalendarEvents[date] || []), event];
      }
    });

    // console.log("DEBUG: Check other from layout", allCalendarEvents);
    return { dailyActivities, allCalendarEvents };
  };
