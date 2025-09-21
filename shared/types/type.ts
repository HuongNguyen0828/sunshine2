

type EntryType = "Attendance" | "Schedule_note" |  "Food" | "Photo" | "Sleep" | "Toilet" | "Supply Request";
type AttendanceSubtype = "Check in" | "Check out";
type FoodSubtype = "Breakfast" | "Lunch" | "Snack"


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

export type DaycareProvider = {
  id: string;
  name: string;
  website: string;
  address: string;
  phone: string;
  email: string;
  contactName: string;
}

export type Location = {
  id: string;
  name: string;
  phone: string;
  email: string;
  providerId: string;
  street: string;
  city: string;
  provine: string;
  zip: string;
  country: string;
  creditCardInfo?: string; 
}

export type Class = {
  id: string;
  name: string;
  locationId: string; 
  capcity: number;
  volume: number;
  ageStart: number;
  ageEnd: number;
}

export type Schedule = {
  id: string;
  classId: string;
  dayOfWeek: number; // 0 (Sunday) to 6 (Saturday)
  startTime: string; // "HH:MM" format
  endTime: string;   // "HH:MM" format
  morningAfernoon: "Morning" | "Afternoon" | "Full day";
}

export type Teacher = {
  id: string;
  firstName: string;
  lastName: string;
  email: string; // username for login
  phone: string;
  role: "teacher"; // Teacher role
  classIds: string[]; // Classes assigned to this staff
  locationId: string; // Location assigned to this staff
  startDate: string;
  endDate?: string; // Optional end date for staff

}
export type monthlyReport = {
  id: string;
  childId?: string; // Optional, if not provided, means all children under the parent
  classId?: string; // Optional, if not provided, means all classes under the location
  locationId?: string; // Optional, if not provided, means all locations under the provider
  month: string; // "YYYY-MM" format
  attendanceCount: number;
  creatAt: string;
  updatedAt?: string;
}

export type Child = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string; // ISO date string
  parentId: string[];
  classId: string;
  allergies?: string;
  specialNeeds?: string;
  subsidyStatus?: string;
  enrollmentDate: string; // ISO date string
  enrollmentStatus: "Active" | "Withdraw" | "New" | "Waitlist";
  endDate?: string; // ISO date string
}
export type Parent = {
  id: string;
  firstName: string;
  lastName: string;
  email: string; // username for login
  role: "parent"; // Fixed as Parent
  phone: string;
  passwordHash: string; // For simplicity, storing hash directly
  childIds: string[]; // Children associated with this parent
  street: string;
  city: string;
  province: string;
  country: string;
  emergencyContact?: string;
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string  
  preferredLanguage?: string; // e.g., "en", "fr"
}
export type DailyReport ={
  id: string;
  childId: string;
  date: string; // ISO date string
  entries: Entry[];
  createdAt: string; // ISO date string // report created right after kid is checked out
}
export type Photo = {
  id: string;
  entryId: string;
  url: string;
  uploadedAt: string; // ISO date string  
  
}
