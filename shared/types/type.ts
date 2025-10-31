//shared/types/type.ts
export type EntryType = 
  "Attendance" | "Schedule_note" | "Food" | "Photo" | "Sleep" | "Toilet" | "Supply Request";

export type AttendanceSubtype = "Check in" | "Check out";
export type FoodSubtype = "Breakfast" | "Lunch" | "Snack";

export type AttendanceSubtype = "Check in" | "Check out";
export type FoodSubtype = "Breakfast" | "Lunch" | "Snack";
export type SleepSubtype = "Started" | "Woke up";

/** Unified subtype helper used by forms and API payloads */
export type EntrySubtype =
  | AttendanceSubtype
  | FoodSubtype
  | SleepSubtype
  | undefined;

/** Optional UI metadata for cards (client only) */
export type EntryTypeMeta = {
  id: EntryType;
  label: string;
  color?: string;
  bgColor?: string;
  iconName?: string;
  subtypes?: string[]; // e.g., ["Check in","Check out"] for Attendance
};

/** Form params passed via router */
export type EntryFormParams = {
  type: EntryType;
  subtype?: EntrySubtype;
  classId?: string | null;
  childIds: string[];
  note?: string;         // free text used by Activity / Note / Health
  photoUrl?: string;     // used by Photo
  applyToAllInClass?: boolean; // server may expand by classId
  occurredAt?: string;   // ISO datetime (UI may default to now)
};

/* =============================
 * Teacher status
 * ============================= */
export enum TeacherStatus {
  New = "🆕 New",
  Active = "✅ Active",
  Inactive = "🚫 Inactive",
}

/* =============================
 * Admin (kept as-is)
 * ============================= */
export type Admin = {
  daycareId: string;      // referencing Daycare Provider
  locationId?: string[];  // ['*'] means all locations; optional for now
  firstName: string;
  lastName: string;
  email: string;
};

/* =======================================================================
 * Legacy Entry shape (kept for backward compatibility in existing screens)
 * NOTE: New Firestore writes should prefer EntryDoc (see below).
 * ======================================================================= */
export type Entry = {
  id: string;
  childId: string;
  staffId: string;
  type: EntryType;
  subtype?: AttendanceSubtype | FoodSubtype | SleepSubtype | ToiletSubtype;
  detail?: string;
  photoUrl?: string;
  createdAt: string; // ISO
};

/* ===== Teacher Dashboard – minimal additions ===== */

export type SleepSubtype = "Started" | "Woke up";
export type ToiletSubtype = "Wet" | "BM" | "Dry";

export type EntrySubtype =
  | AttendanceSubtype
  | FoodSubtype
  | SleepSubtype
  | ToiletSubtype
  | undefined;

export type EntryTypeMeta = {
  id: EntryType;
  label: string;
  color?: string;
  bgColor?: string;
  iconName?: string;
  subtypes?: string[];
};

export type EntryFormParams = {
  type: EntryType;
  subtype?: EntrySubtype;
  classId?: string | null;
  childIds: string[];
  note?: string;
  photoUrl?: string;
};

export type EntryCreateInput =
  | {
      type: "Attendance";
      subtype: AttendanceSubtype;
      childIds: string[];
      classId?: string | null;
      detail?: string;
    }
  | {
      type: "Food";
      subtype: FoodSubtype;
      childIds: string[];
      classId?: string | null;
      detail?: string;
    }
  | {
      type: "Sleep";
      subtype: SleepSubtype;
      childIds: string[];
      classId?: string | null;
      detail?: string;
    }
  | {
      type: "Toilet";
      subtype: ToiletSubtype;
      childIds: string[];
      classId?: string | null;
      detail?: string;
    }
  | {
      type: "Photo";
      childIds: string[];
      classId?: string | null;
      detail?: string;
      photoUrl: string;
    }
  | {
      type: "Schedule_note";
      childIds: string[];
      classId?: string | null;
      detail: string;
    }
  | {
      type: "Supply Request";
      childIds: string[];
      classId?: string | null;
      detail: string;
    };

export type BulkEntryCreateRequest = {
  items: EntryCreateInput[];
};

export type BulkEntryCreateResult = {
  created: { id: string; type: EntryType }[];
  failed: { index: number; reason: string }[];
};

export type SelectedTarget = {
  classId?: string | null;
  childIds: string[];
};

export type EntryFilter = {
  childId?: string;
  classId?: string;
  type?: EntryType;
  dateFrom?: string;
  dateTo?: string;
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

// Location type intentionally omitted for now

/* =============================
 * Classes
 * ============================= */
export type Class = {
  id: string;
  name: string;
  // Keep this required to avoid scope bugs when querying by location
  locationId: string;
  capacity: number;
  volume: number; // volume <= capacity
  ageStart: number;
  ageEnd: number; // >= ageStart
  classroom?: string;
  teacherIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type ClassCreate = Pick<
  Class,
  "name" | "locationId" | "capacity" | "volume" | "ageStart" | "ageEnd" | "classroom"
>;

export type ClassUpdate = Partial<
  Pick<Class, "name" | "locationId" | "capacity" | "volume" | "ageStart" | "ageEnd" | "classroom">
>;

export type ClassAssignTeachers = {
  classId: string;
  teacherIds: string[];
};

/* =============================
 * Common API shapes
 * ============================= */
export type ApiListResponse<T> = T[];
export type ApiItemResponse<T> = T;

export type ApiError = {
  message: string;
  error?: string;
  code?: string | number;
};

/* =============================
 * User
 * ============================= */
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

/* =============================
 * Schedule
 * ============================= */
export type Schedule = {
  id: string;
  classId: string;
  dayOfWeek: number;       // 0 (Sunday) to 6 (Saturday)
  startTime: string;       // "HH:MM" format
  endTime: string;         // "HH:MM" format
  morningAfternoon: "Morning" | "Afternoon" | "Full day";
}

/* =============================
 * Teacher
 * ============================= */
export type Teacher = {
  id: string;
  role?: "teacher";
  firstName: string;
  lastName: string;
  email: string; // username for login
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  postalcode?: string;
  classIds?: string[];
  locationId?: string;
  startDate: string;
  endDate?: string;
  status?: TeacherStatus; // Default "New"
  isRegistered?: boolean; // Default false
};

/* =============================
 * Monthly report
 * ============================= */
export type monthlyReport = {
  id: string;
  childId?: string;
  classId?: string;
  locationId?: string;
  month: string; // "YYYY-MM"
  attendanceCount: number;
  creatAt: string;
  updatedAt?: string;
};

/* =============================
 * Enrollment status
 * ============================= */
export enum EnrollmentStatus {
  New = "New",
  Waitlist = "Waitlist",
  Active = "Active",
  Withdraw = "Withdraw",
}

/* =============================
 * Child + DTOs
 * ============================= */
export type Child = {
  /** Firestore document id */
  id: string;

  /** Basic profile */
  firstName: string;
  lastName: string;
  birthDate: string; // ISO date (yyyy-mm-dd)
  gender: string;

  /** Parent linkage (users with role="parent") */
  parentId: string[];

  /** Placement info */
  classId?: string; // assigned class id
  locationId?: string;
  daycareId?: string;

  /** Enrollment lifecycle (computed) */
  enrollmentStatus: EnrollmentStatus;

  /** Additional notes (allergies, etc.) */
  notes?: string;
  startDate: string;

  /** Audit fields (ISO) */
  createdAt?: string;
  updatedAt?: string;
};

export type CreateChildInput = {
  firstName: string;
  lastName: string;
  birthDate: string;
  parentId?: string[];
  classId?: string;
  locationId?: string;
  notes?: string;
};

export type UpdateChildProfileInput = Partial<
  Pick<Child, "firstName" | "lastName" | "birthDate" | "locationId" | "notes">
>;

export type ChildDTO = Child;

/* =============================
 * Parent
 * ============================= */
type ParentChildRelationship = {
  childId: string;
  relationship: string; // e.g., "mother", "father", "guardian"
};

export type Parent = {
  id: string;
  docId: string; // document id to match parentID in child
  firstName: string;
  lastName: string;
  email: string;
  role?: "parent";
  phone: string;
  childRelationships: ParentChildRelationship[];
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  postalcode?: string;
  maritalStatus: string;
  locationId?: string;
};

/* =============================
 * Daily report (legacy container)
 * ============================= */
export type DailyReport = {
  id: string;
  childId: string;
  date: string;   // ISO date
  entries: Entry[]; // legacy usage in reports; ok to keep
  createdAt: string; // ISO date
};
