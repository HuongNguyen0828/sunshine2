// Scheduler types - decoupled from Convex backend
// These mirror the original Convex schema but exist independently

export interface Activity {
  id: string;
  title: string;
  description: string;
  materials: string;
  color: string; // hex color code for activity pill
  userId?: string; // Optional for local state
  _creationTime?: number; // Optional timestamp
}

export interface Schedule {
  id: string;
  userId?: string;
  weekStart: string; // ISO date string for Monday of the week
  dayOfWeek: string; // "monday", "tuesday", etc.
  timeSlot: string; // "morning", "mid-morning", "afternoon"
  activityId: string;
  activity?: Activity | null; // Populated activity reference
  order: number; // order within the time slot (0 = first, 1 = second, etc.)
}

// UI-specific types for the scheduler
export interface TimeSlotConfig {
  key: string;
  label: string;
  time: string;
}

export interface SlotInfo {
  day: string;
  timeSlot: string;
}

// Constants
export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

export const TIME_SLOTS: TimeSlotConfig[] = [
  { key: 'morning', label: 'Morning', time: '9:00 AM' },
  { key: 'mid-morning', label: 'Mid-Morning', time: '10:30 AM' },
  { key: 'afternoon', label: 'Afternoon', time: '2:00 PM' },
] as const;

export type WeekDay = typeof WEEKDAYS[number];
export type TimeSlotKey = typeof TIME_SLOTS[number]['key'];