export type EntryType = "Attendance" | "Schedule_note" |  "Food" | "Photo" | "Sleep" | "Toilet" | "Supply Request";
export type AttendanceSubtype = "Check in" | "Check out";
export type FoodSubtype = "Breakfast" | "Lunch" | "Snack"

export type Entry = {
  id: string;
  childId: string;
  staffId: string;
  type: EntryType;
  subtype?: AttendanceSubtype | FoodSubtype;
  detail?: string;
  photoUrl?: string;
  createdAt: string;
};
