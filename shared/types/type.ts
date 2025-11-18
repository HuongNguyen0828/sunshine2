// shared/types/type.ts

/* =============================
 * Entry types & subtypes (8 types)
 * ============================= */
export type EntryType =
  | "Attendance"
  | "Food"
  | "Sleep"
  | "Toilet"
  | "Activity"
  | "Photo"
  | "Note"
  | "Health";

export type AttendanceSubtype = "Check in" | "Check out";
export type FoodSubtype = "Breakfast" | "Lunch" | "Snack";
export type SleepSubtype = "Started" | "Woke up";

/** Toilet entries use a kind instead of a subtype */
export type ToiletKind = "urine" | "bm";

/** Unified subtype helper used by forms and API payloads (Toilet excluded) */
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
  subtypes?: string[]; // e.g. ["Check in", "Check out"] for Attendance
};

/** Form params passed via router (mobile) */
export type EntryFormParams = {
  type: EntryType;
  subtype?: EntrySubtype;          // Attendance / Food / Sleep only
  classId?: string | null;
  childIds: string[];
  note?: string;                   // free text for Activity / Note / Health
  photoUrl?: string;               // used by Photo
  applyToAllInClass?: boolean;     // server may expand by classId
  occurredAt?: string;             // ISO datetime (UI can default to now)
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
  subtype?: AttendanceSubtype | FoodSubtype | SleepSubtype;
  detail?: string;
  photoUrl?: string;
  createdAt: string; // ISO
};

/* =======================================================================
 * Unified Firestore schema for teacher dashboard records (entries)
 * Single top-level `entries` collection.
 * ======================================================================= */

/** Flexible payload bucket per type; all fields are optional by design. */
export type EntryData = {
  // attendance
  status?: "check_in" | "check_out";

  // food
  items?: string[];
  amount?: "few" | "normal" | "much";

  // sleep
  start?: string; // ISO datetime
  end?: string;   // ISO datetime
  durationMin?: number;

  // toilet (single visit: kind + time only)
  toiletTime?: string;     // ISO datetime for the visit
  toiletKind?: ToiletKind; // "urine" | "bm"

  // activity / note / health (free text only)
  text?: string;

  // photo (storage / public url handling is app-specific)
  storagePath?: string;
  thumbPath?: string;
};

/** Canonical entry document persisted in Firestore `entries/{id}`. */
export type EntryDoc = {
  id: string;

  // scope & denormalization
  daycareId: string;       // can be "" if teacher has no daycare scope
  locationId: string;      // can be "" if teacher has no location scope
  classId?: string | null;
  childId: string;

  // authorship
  createdByUserId: string; // users document id (teacher)
  createdByRole: "teacher";
  createdAt: string;       // ISO created time
  updatedAt?: string;      // ISO updated time

  // occurrence time used by feeds (parents board)
  occurredAt: string;      // ISO datetime; for Sleep usually equals data.start

  // type info
  type: EntryType;
  subtype?: EntrySubtype;  // not used by Toilet

  // flexible payload
  data?: EntryData;

  // convenience mirrors for fast UI (optional)
  detail?: string;         // short free text (can mirror data.text)
  photoUrl?: string;       // public URL if available
  childName?: string;
  className?: string;

  // parent feed visibility
  visibleToParents?: boolean;
  publishedAt?: string;    // ISO when it became visible to parents
};

/* =============================
 * Create / bulk-create payloads
 * - `occurredAt` required
 * - `applyToAllInClass` optional (server expands childIds by classId)
 * ============================= */
export type EntryCreateInput =
  | {
      type: "Attendance";
      subtype: AttendanceSubtype;
      childIds: string[];
      classId?: string | null;
      detail?: string;
      occurredAt: string;      // ISO datetime
      applyToAllInClass?: boolean;
    }
  | {
      type: "Food";
      subtype: FoodSubtype;
      childIds: string[];
      classId?: string | null;
      detail?: string;         // e.g. "Rice & soup"
      occurredAt: string;      // ISO datetime
      applyToAllInClass?: boolean;
    }
  | {
      type: "Sleep";
      subtype: SleepSubtype;
      childIds: string[];
      classId?: string | null;
      detail?: string;
      occurredAt: string;      // ISO datetime (usually equals data.start)
      applyToAllInClass?: boolean;
    }
  | {
      type: "Toilet";
      childIds: string[];
      classId?: string | null;
      detail?: string;
      occurredAt: string;      // ISO datetime (maps to data.toiletTime)
      toiletKind: ToiletKind;  // required
      applyToAllInClass?: boolean;
    }
  | {
      type: "Activity";        // free text only
      childIds: string[];
      classId?: string | null;
      detail: string;          // required short text
      occurredAt: string;      // ISO datetime
      applyToAllInClass?: boolean;
    }
  | {
      type: "Photo";           // photo upload only
      childIds: string[];
      classId?: string | null;
      photoUrl: string;        // required (mobile uploads → gets URL → sends here)
      detail?: string;         // optional caption
      occurredAt: string;      // ISO datetime
      applyToAllInClass?: boolean;
    }
  | {
      type: "Note";            // free text only
      childIds: string[];
      classId?: string | null;
      detail: string;          // required short text
      occurredAt: string;      // ISO datetime
      applyToAllInClass?: boolean;
    }
  | {
      type: "Health";          // free text only (for incidents/symptoms)
      childIds: string[];
      classId?: string | null;
      detail: string;          // required short text
      occurredAt: string;      // ISO datetime
      applyToAllInClass?: boolean;
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

/** Filter used by list APIs and feeds */
export type EntryFilter = {
  childId?: string;
  classId?: string;
  type?: EntryType;
  dateFrom?: string; // ISO date (inclusive)
  dateTo?: string;   // ISO date (exclusive or inclusive based on API)
};

/* =============================
 * Daycare provider
 * ============================= */
export type DaycareProvider = {
  id: string;
  name: string;
  website: string;
  address: string;
  phone: string;
  email: string;
  contactName: string;
};

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
  date: string;    // ISO date
  entries: Entry[]; // legacy usage in reports; ok to keep
  createdAt: string; // ISO date
};

/* =============================
 * Parent feed (mobile)
 * - lightweight view sent to parent app
 * ============================= */
export type ParentFeedEntry = {
  id: string;
  type: EntryType | string; // keep flexible for old data
  subtype?: string;
  detail?: any;
  childId: string;
  occurredAt?: string;      // ISO (preferred)
  createdAt?: string;       // ISO (fallback)
  photoUrl?: string;
  classId?: string;
  teacherName?: string;
  childName?: string;
};
 /* ===========================
 For Calendar events
 * ============================= */
export type EventType = "dailyActivity" | "childActivity" | "birthday" | "meeting" | "holiday";
export type EventTypeForm = Omit<EventType, "birthday" | "holiday">; // left with dalilyActivity (every weekday), childActivity (ocational) and meeting (for Teacher)

export interface Activity {
  id: string;
  type: EventTypeForm; // limited to dailyActivity, childActivity, meeting
  title: string;
  description: string;
  materials: string;
  color: string; // hex color code for activity pill
  userId?: string; // Optional for local state
  _creationTime?: number; // Optional timestamp
}

/* =============================
 * Schedule
 * ============================= */
export interface Schedule {
  id: string;
  type: EventTypeForm; // limited to dailyActivity, childActivity, meeting
  userId?: string;
  weekStart: string; // ISO date string for Monday of the week
  dayOfWeek: string; // "monday", "tuesday", etc.
  timeSlot: string; // "morning", "mid-morning", "afternoon"
  activityId: string;
  activity?: Activity | null; // Populated activity reference
  order: number; // order within the time slot (0 = first, 1 = second, etc.)
}
