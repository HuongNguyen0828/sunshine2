type EntryType =
  | "Attendance"
  | "Schedule_note"
  | "Food"
  | "Photo"
  | "Sleep"
  | "Toilet"
  | "Supply Request";
type AttendanceSubtype = "Check in" | "Check out";
type FoodSubtype = "Breakfast" | "Lunch" | "Snack";
export enum TeacherStatus {
  New = "New",
  Active = "Active",
  Inactive = "Inactive"
};


export type Admin = {
  daycareId: string,             // referencing Daycare Provider 
  locationId?: string[],         // referencing location id, ['*'] means all locations; optional for now
  firstName: string,
  lastName: string, 
  email: string,
}

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
};
// Remove Location for now for purpose of simplicity
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
};

export type Admin = {
  daycareId: string; // referencing Daycare Provider , ['*'] means all daycare, only for Sunshine admin
  locationId: string[]; // referencing location id, ['*'] for all location
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
};
// Upper, For Sunshine admin only read/ write access ====================================================================
// The rest if for admin of daycare/ daycare location having read and write access. Sunshine admin just have read access

export type Class = {
  id: string;
  name: string;
  locationId: string;
  capacity: number;
  volume: number;
  ageStart: number;
  ageEnd: number;
  classroom: string;
};

export type Teacher = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;           // username for login
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  postalcode?: string;
  classIds?: string[];     // classes assigned to this staff
  locationId?: string;     // optional for now
  startDate: string;
  endDate?: string;        // optional end date for staff
  status: TeacherStatus; // Default "New"
  isRegistered: boolean; // Default false, true once new Teacher is added
}

export type Schedule = {
  id: string;
  classId: string;
  dayOfWeek: number; // 0 (Sunday) to 6 (Saturday)
  startTime: string; // "HH:MM" format
  endTime: string; // "HH:MM" format
  morningAfernoon: "Morning" | "Afternoon" | "Full day";
};

export type Child = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;       // ISO date string
  parentId: string[];
  classId: string;
  allergies?: string;
  specialNeeds?: string;
  subsidyStatus?: string;
  enrollmentDate: string;  // ISO date string
  enrollmentStatus: "Active" | "Withdraw" | "New" | "Waitlist";
  endDate?: string; // ISO date string
};

export type Parent = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;           // username for login
  role: "parent";          // fixed as Parent
  phone: string;
  passwordHash: string;    // storing hash directly for simplicity
  childIds: string[];      // children associated with this parent
  street: string;
  city: string;
  province: string;
  country: string;
  emergencyContact?: string;
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
  preferredLanguage?: string; // e.g., "en", "fr"
};

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
export type Photo = {
  id: string;
  entryId: string;
  url: string;
  uploadedAt: string; // ISO date string
};
export type DailyReport = {
  id: string;
  childId: string;
  date: string;            // ISO date string
  entries: Entry[];
  createdAt: string; // ISO date string // report created right after kid is checked out
};

export type monthlyReport = {
  id: string;
  childId?: string; // Optional, if not provided, means all children under the parent
  classId?: string; // Optional, if not provided, means all classes under the location
  locationId?: string; // Optional, if not provided, means all locations under the provider
  month: string; // "YYYY-MM" format
  attendanceCount: number;
  creatAt: string;
  updatedAt?: string;
};
