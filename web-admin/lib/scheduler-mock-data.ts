// Mock data for scheduler components - enabling interaction without backend
import type { Activity, Schedule } from '@/types/scheduler';

export const mockActivities: Activity[] = [
  {
    id: '1',
    title: 'Story Time',
    description: 'Interactive storytelling with picture books to develop language and listening skills',
    materials: 'Picture books, story props, cushions',
    userId: 'dev-user',
    _creationTime: Date.now() - 86400000,
  },
  {
    id: '2', 
    title: 'Art & Crafts',
    description: 'Creative expression through painting, drawing, and simple craft projects',
    materials: 'Crayons, paper, glue sticks, safety scissors, construction paper',
    userId: 'dev-user',
    _creationTime: Date.now() - 172800000,
  },
  {
    id: '3',
    title: 'Music & Movement',
    description: 'Songs, dancing, and rhythm activities to develop motor skills and musicality',
    materials: 'Musical instruments, scarves, rhythm sticks',
    userId: 'dev-user', 
    _creationTime: Date.now() - 259200000,
  },
  {
    id: '4',
    title: 'Nature Discovery',
    description: 'Outdoor exploration and nature-based learning activities',
    materials: 'Magnifying glasses, collection bags, field guides',
    userId: 'dev-user',
    _creationTime: Date.now() - 345600000,
  },
  {
    id: '5',
    title: 'Building Blocks',
    description: 'Construction play to develop spatial reasoning and fine motor skills',
    materials: 'Various building blocks, LEGO, wooden blocks',
    userId: 'dev-user',
    _creationTime: Date.now() - 432000000,
  },
];

// Helper to get current week start (Monday)
function getCurrentWeekStart(): string {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  return monday.toISOString().split('T')[0];
}

export const mockSchedules: Schedule[] = [
  {
    id: 'sched1',
    userId: 'dev-user',
    weekStart: getCurrentWeekStart(),
    dayOfWeek: 'monday',
    timeSlot: 'morning',
    activityId: '1',
    activity: mockActivities[0],
  },
  {
    id: 'sched2', 
    userId: 'dev-user',
    weekStart: getCurrentWeekStart(),
    dayOfWeek: 'tuesday',
    timeSlot: 'mid-morning', 
    activityId: '2',
    activity: mockActivities[1],
  },
  {
    id: 'sched3',
    userId: 'dev-user',
    weekStart: getCurrentWeekStart(),
    dayOfWeek: 'wednesday',
    timeSlot: 'afternoon',
    activityId: '3', 
    activity: mockActivities[2],
  },
  {
    id: 'sched4',
    userId: 'dev-user',
    weekStart: getCurrentWeekStart(),
    dayOfWeek: 'friday',
    timeSlot: 'morning',
    activityId: '4',
    activity: mockActivities[3],
  },
];

// Mock API functions that simulate the Convex operations
export class MockSchedulerAPI {
  private static activities: Activity[] = [...mockActivities];
  private static schedules: Schedule[] = [...mockSchedules];
  private static nextActivityId = mockActivities.length + 1;
  private static nextScheduleId = mockSchedules.length + 1;

  static async listActivities(): Promise<Activity[]> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...this.activities];
  }

  static async createActivity(params: Omit<Activity, 'id' | '_creationTime' | 'userId'>): Promise<Activity> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const activity: Activity = {
      id: String(this.nextActivityId++),
      ...params,
      userId: 'dev-user',
      _creationTime: Date.now(),
    };
    
    this.activities.unshift(activity); // Add to beginning like Convex order("desc")
    return activity;
  }

  static async removeActivity(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Remove from activities
    this.activities = this.activities.filter(a => a.id !== id);
    
    // Remove from schedules
    this.schedules = this.schedules.filter(s => s.activityId !== id);
  }

  static async getWeekSchedule(weekStart: string): Promise<Schedule[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return this.schedules
      .filter(s => s.weekStart === weekStart)
      .map(s => ({
        ...s,
        activity: this.activities.find(a => a.id === s.activityId) || null
      }));
  }

  static async assignActivity(params: {
    weekStart: string;
    dayOfWeek: string;
    timeSlot: string;
    activityId: string;
  }): Promise<Schedule> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Remove existing schedule for this slot if any
    this.schedules = this.schedules.filter(s => 
      !(s.weekStart === params.weekStart && 
        s.dayOfWeek === params.dayOfWeek && 
        s.timeSlot === params.timeSlot)
    );
    
    // Add new schedule
    const schedule: Schedule = {
      id: String(this.nextScheduleId++),
      userId: 'dev-user',
      ...params,
      activity: this.activities.find(a => a.id === params.activityId) || null
    };
    
    this.schedules.push(schedule);
    return schedule;
  }

  static async removeFromSchedule(params: {
    weekStart: string;
    dayOfWeek: string;
    timeSlot: string;
  }): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.schedules = this.schedules.filter(s => 
      !(s.weekStart === params.weekStart && 
        s.dayOfWeek === params.dayOfWeek && 
        s.timeSlot === params.timeSlot)
    );
  }
}