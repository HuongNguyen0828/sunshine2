import api from "@/api/client";

export interface ScheduleData {
  weekStart: string;
  dayOfWeek: string;
  timeSlot: string;
  activityTitle: string;
  activityDescription: string;
  activityMaterials: string;
  classId: string;
}

export interface Schedule extends ScheduleData {
  id: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export async function fetchSchedules(weekStart: string, classId?: string): Promise<Schedule[]> {
  const params = new URLSearchParams({ weekStart });
  if (classId && classId !== "all") params.append("classId", classId);

  return await api.get<Schedule[]>(`/api/schedules?${params}`);
}

export async function createSchedule(data: ScheduleData): Promise<Schedule> {
  return await api.post<Schedule>("/api/schedules", data);
}

export async function deleteSchedule(id: string): Promise<void> {
  return await api.delete<void>(`/api/schedules/${id}`);
}
