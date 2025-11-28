// import { Schedule } from "../../shared/types/type";
import { BASE_URL } from "./useEntriesAPI";
import { auth } from "../lib/firebase"
import { ScheduleDate } from "@/app/(teacher)/(tabs)/calendar";
import { EventByMonth, Event } from "@/app/(teacher)/(tabs)/calendar";
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


// Helper function fetching holiday
export async function fetchingPublicHolidayAlberta(classes: ClassRow[]): Promise<EventByMonth> {
 try {
  const response = await fetch("https://canada-holidays.ca/api/v1/holidays");
   
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();

  /*
   * Example 1 element inside holidays: {"id":1,"date":"2025-01-01","nameEn":"New Year’s Day","nameFr":"Jour de l’An","federal":1,"observedDate":"2025-01-01","provinces":[{"id":"AB","nameEn":"Alberta","nameFr":"Alberta","sourceLink":"https://www.alberta.ca/alberta-general-holidays.aspx#jumplinks-1","sourceEn":"General holidays in Alberta"},{"id":"BC","nameEn":"British Columbia","nameFr":"Colombie-Britannique","sourceLink":"https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards/statutory-holidays#body","sourceEn":"Statutory Holidays in British Columbia"}
   */
  const holidays = data.holidays; /// holidays: [{id, date, nameEn, provinces:[]}]

  // Filter for Alberta-specific holidays
  // const isAlbertaHoliday = holidays.provinces?.some((prov: any) => prov.id === "AB");
  const holidaysCleaned = holidays.map((holiday: any )=> ({
    id: holiday.id,
    date: holiday.date,
    title: holiday.nameEn,
  }));
  
  const holidayEventsByMonth = holidaysCleaned.reduce((acc: EventByMonth, holiday: any) => {
    const date = holiday.date;
    const event: Event = {
      id: holiday.id,
      type: "holiday",
      description: "Daycare closed",
      title: holiday.title,
      classes: classes.map(cls => cls.name), // Get class name
      date: holiday.date
    }

    acc[date] = [event];
    return acc;
  }, {} as Record<string, Event[]>);

   return holidayEventsByMonth;
 } catch(error: any) {
  throw new Error("Failed to fetch public holiday!") 
 }

}