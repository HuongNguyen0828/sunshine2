import api from "@/api/client";
import { EventTypeForm } from "@/components/scheduler/ActivityForm";

export interface ScheduleData {
  type: EventTypeForm; // limited to dailyActivity, childActivity, meeting
  weekStart: string;
  dayOfWeek: string;
  timeSlot: string;
  activityTitle: string;
  activityDescription: string;
  activityMaterials: string;
  locationId: string; // location scope of the schedule if classId is null
  classId: string | null; // null = applies to all classes within the location
  color: string; // hex color code for activity pill
  order: number; // order within the time slot (0 = first, 1 = second, etc.)
}

export interface Schedule extends ScheduleData {
  id: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export async function fetchSchedules(weekStart: string, classId: string): Promise<Schedule[]> {
  const params = new URLSearchParams({ weekStart });
  if (classId) params.append("classId", classId);

  return await api.get<Schedule[]>(`/api/schedules?${params}`);
}

export async function createSchedule(data: ScheduleData): Promise<Schedule> {
  return await api.post<Schedule>("/api/schedules", data);
}

export async function deleteSchedule(scheduleid: string): Promise<void> {
  return await api.delete<void>(`/api/schedules/${scheduleid}`);
}
