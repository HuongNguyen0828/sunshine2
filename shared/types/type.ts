//shared/types/type.ts
type EntryType = 
  "Attendance" | "Schedule_note" | "Food" | "Photo" | "Sleep" | "Toilet" | "Supply Request";

type AttendanceSubtype = "Check in" | "Check out";
type FoodSubtype = "Breakfast" | "Lunch" | "Snack";


export enum TeacherStatus {
  New = "🆕 New",
  Active = "✅ Active",
  Inactive = "🚫 Inactive"
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
}

// ////// Remove Location for now for simplicity
// export type Location = { 
//   id: string;
//   name: string;
//   phone: string;
//   email: string;
//   providerId: string;
//   street: string;
//   city: string;
//   province: string;
//   zip: string;
//   country: string;
//   creditCardInfo?: string; 
// }

// ---------- Class DTOs (client/server-safe) ----------
// Use plain primitives only. Do NOT import firebase-admin types here.

export type Class = {
  id: string;
  name: string;
  // Keep this required to avoid scope bugs when querying by location
  locationId: string;
  capacity: number;   // expected integer >= 0
  volume: number;     // current occupied seats. Volume <= capicity
  ageStart: number;   // expected integer (years)
  ageEnd: number;     // expected integer (years), >= ageStart
  classroom?: string;
  teacherIds: string[];       // present in API responses
  createdAt: string;          // ISO string
  updatedAt: string;          // ISO string
};

// Payload to create a class (no id/teacherIds/timestamps)
export type ClassCreate = Pick<
  Class,
  "name" | "locationId" | "capacity" | "volume" | "ageStart" | "ageEnd" | "classroom"
>;

// General update payload (excluding teacher assignment)
export type ClassUpdate = Partial<
  Pick<Class, "name" | "locationId" | "capacity" | "volume" | "ageStart" | "ageEnd" | "classroom">
>;

// Teacher assignment is handled separately for clarity and access control
export type ClassAssignTeachers = {
  classId: string;
  teacherIds: string[];
};

// ---------- Optional: common API shapes ----------

export type ApiListResponse<T> = T[];
export type ApiItemResponse<T> = T;

// Standard error shape from the API
export type ApiError = {
  message: string;
  error?: string;
  code?: string | number;
};
export type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: "admin" | "teacher" | "parent" | string;
  status?: "New" | "Active" | string;
  locationId?: string[];
  daycareId?: string;
  classIds?: string[];
};

export type Schedule = {
  id: string;
  classId: string;
  dayOfWeek: number;       // 0 (Sunday) to 6 (Saturday)
  startTime: string;       // "HH:MM" format
  endTime: string;         // "HH:MM" format
  morningAfernoon: "Morning" | "Afternoon" | "Full day";
}

export type Teacher = {
  id: string;
  role?: "teacher"; 
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
  status?: TeacherStatus; // Default "New"
  isRegistered?: boolean; // Default false, true once new Teacher is added
}

export type monthlyReport = {
  id: string;
  childId?: string;        // optional, if not provided → all children under the parent
  classId?: string;        // optional, if not provided → all classes under the location
  locationId?: string;     // optional, if not provided → all locations under the provider
  month: string;           // "YYYY-MM" format
  attendanceCount: number;
  creatAt: string;
  updatedAt?: string;
}

/** 
 * Possible enrollment status — automatically derived by server 
 * EnrollmentStatus enum applires to Child and Parent
 * The default type when add a children, or parent is "New"
 * In parent -child: many - to many relationship:
 * If all children are “Withdraw,” you can automatically mark the parent as “Withdraw.”
 * If at least one child is “Active,” the parent stays “Active.”
*/
export enum EnrollmentStatus {
  New = "New",         
  Waitlist = "Waitlist",
  Active = "Active",
  Withdraw = "Withdraw",   
}

/** Minimal structure stored in Firestore and used across UI */
export type Child = {
  /** Firestore document id */
  id: string;

  /** Basic profile */
  firstName: string;
  lastName: string;
  birthDate: string; // ISO date (yyyy-mm-dd)

  /** Parent linkage (user ids from users collection with role="parent") */
  parentId: string[];

  /** Placement info */
  classId?: string;    // assigned class id (optional)
  locationId?: string; // location scope id
  daycareId: string;   // always required, injected from current admin

  /** Enrollment lifecycle (computed) */
  enrollmentStatus: EnrollmentStatus; // computed by backend
  enrollmentDate?: string; // assigned automatically when class or parent linked

  /** Additional notes (allergies, special needs, subsidy, etc.) */
  notes?: string;

  /** Audit fields (ISO) */
  createdAt?: string;
  updatedAt?: string;
};

/** Request shape when creating a new child */
export type CreateChildInput = {
  firstName: string;
  lastName: string;
  birthDate: string;
  parentId?: string[];
  classId?: string;
  locationId?: string;
  notes?: string;
};

/** Request shape when updating an existing child (profile only) */
export type UpdateChildProfileInput = Partial<Pick<
  Child,
  "firstName" | "lastName" | "birthDate" | "locationId" | "notes"
>>;

/** Response DTO from server after any mutation */
export type ChildDTO = Child;

export type Parent = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;           // username for login
  role: "parent";          // fixed as Parent
  phone: string;
  childIds: string[];      // children associated with this parent
  street: string;
  city: string;
  province: string;
  country: string;
  emergencyContact?: string;
  createdAt: string;       // ISO date string
  updatedAt?: string;      // ISO date string  
  preferredLanguage?: string; // e.g., "en", "fr"
}

export type DailyReport = {
  id: string;
  childId: string;
  date: string;            // ISO date string
  entries: Entry[];
  createdAt: string;       // ISO date string; report created after kid is checked out
}

export type Photo = {
  id: string;
  entryId: string;
  url: string;
  uploadedAt: string;      // ISO date string  
}
