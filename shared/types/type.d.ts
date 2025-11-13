export type EntryType = "Attendance" | "Food" | "Sleep" | "Toilet" | "Activity" | "Photo" | "Note" | "Health";
export type AttendanceSubtype = "Check in" | "Check out";
export type FoodSubtype = "Breakfast" | "Lunch" | "Snack";
export type SleepSubtype = "Started" | "Woke up";
/** Toilet entries use a kind instead of a subtype */
export type ToiletKind = "urine" | "bm";
/** Unified subtype helper used by forms and API payloads (Toilet excluded) */
export type EntrySubtype = AttendanceSubtype | FoodSubtype | SleepSubtype | undefined;
/** Optional UI metadata for cards (client only) */
export type EntryTypeMeta = {
    id: EntryType;
    label: string;
    color?: string;
    bgColor?: string;
    iconName?: string;
    subtypes?: string[];
};
/** Form params passed via router (mobile) */
export type EntryFormParams = {
    type: EntryType;
    subtype?: EntrySubtype;
    classId?: string | null;
    childIds: string[];
    note?: string;
    photoUrl?: string;
    applyToAllInClass?: boolean;
    occurredAt?: string;
};
export declare enum TeacherStatus {
    New = "\uD83C\uDD95 New",
    Active = "\u2705 Active",
    Inactive = "\uD83D\uDEAB Inactive"
}
export type Admin = {
    daycareId: string;
    locationId?: string[];
    firstName: string;
    lastName: string;
    email: string;
};
export type Entry = {
    id: string;
    childId: string;
    staffId: string;
    type: EntryType;
    subtype?: AttendanceSubtype | FoodSubtype | SleepSubtype;
    detail?: string;
    photoUrl?: string;
    createdAt: string;
};
/** Flexible payload bucket per type; all fields are optional by design. */
export type EntryData = {
    status?: "check_in" | "check_out";
    items?: string[];
    amount?: "few" | "normal" | "much";
    start?: string;
    end?: string;
    durationMin?: number;
    toiletTime?: string;
    toiletKind?: ToiletKind;
    text?: string;
    storagePath?: string;
    thumbPath?: string;
};
/** Canonical entry document persisted in Firestore `entries/{id}`. */
export type EntryDoc = {
    id: string;
    daycareId: string;
    locationId: string;
    classId?: string | null;
    childId: string;
    createdByUserId: string;
    createdByRole: "teacher";
    createdAt: string;
    updatedAt?: string;
    occurredAt: string;
    type: EntryType;
    subtype?: EntrySubtype;
    data?: EntryData;
    detail?: string;
    photoUrl?: string;
    childName?: string;
    className?: string;
    visibleToParents?: boolean;
    publishedAt?: string;
};
export type EntryCreateInput = {
    type: "Attendance";
    subtype: AttendanceSubtype;
    childIds: string[];
    classId?: string | null;
    detail?: string;
    occurredAt: string;
    applyToAllInClass?: boolean;
} | {
    type: "Food";
    subtype: FoodSubtype;
    childIds: string[];
    classId?: string | null;
    detail?: string;
    occurredAt: string;
    applyToAllInClass?: boolean;
} | {
    type: "Sleep";
    subtype: SleepSubtype;
    childIds: string[];
    classId?: string | null;
    detail?: string;
    occurredAt: string;
    applyToAllInClass?: boolean;
} | {
    type: "Toilet";
    childIds: string[];
    classId?: string | null;
    detail?: string;
    occurredAt: string;
    toiletKind: ToiletKind;
    applyToAllInClass?: boolean;
} | {
    type: "Activity";
    childIds: string[];
    classId?: string | null;
    detail: string;
    occurredAt: string;
    applyToAllInClass?: boolean;
} | {
    type: "Photo";
    childIds: string[];
    classId?: string | null;
    photoUrl: string;
    detail?: string;
    occurredAt: string;
    applyToAllInClass?: boolean;
} | {
    type: "Note";
    childIds: string[];
    classId?: string | null;
    detail: string;
    occurredAt: string;
    applyToAllInClass?: boolean;
} | {
    type: "Health";
    childIds: string[];
    classId?: string | null;
    detail: string;
    occurredAt: string;
    applyToAllInClass?: boolean;
};
export type BulkEntryCreateRequest = {
    items: EntryCreateInput[];
};
export type BulkEntryCreateResult = {
    created: {
        id: string;
        type: EntryType;
    }[];
    failed: {
        index: number;
        reason: string;
    }[];
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
export type Class = {
    id: string;
    name: string;
    locationId: string;
    capacity: number;
    volume: number;
    ageStart: number;
    ageEnd: number;
    classroom?: string;
    teacherIds: string[];
    createdAt: string;
    updatedAt: string;
};
export type ClassCreate = Pick<Class, "name" | "locationId" | "capacity" | "volume" | "ageStart" | "ageEnd" | "classroom">;
export type ClassUpdate = Partial<Pick<Class, "name" | "locationId" | "capacity" | "volume" | "ageStart" | "ageEnd" | "classroom">>;
export type ClassAssignTeachers = {
    classId: string;
    teacherIds: string[];
};
export type ApiListResponse<T> = T[];
export type ApiItemResponse<T> = T;
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
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    morningAfternoon: "Morning" | "Afternoon" | "Full day";
};
export type Teacher = {
    id: string;
    role?: "teacher";
    firstName: string;
    lastName: string;
    email: string;
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
    status?: TeacherStatus;
    isRegistered?: boolean;
};
export type monthlyReport = {
    id: string;
    childId?: string;
    classId?: string;
    locationId?: string;
    month: string;
    attendanceCount: number;
    creatAt: string;
    updatedAt?: string;
};
export declare enum EnrollmentStatus {
    New = "New",
    Waitlist = "Waitlist",
    Active = "Active",
    Withdraw = "Withdraw"
}
export type Child = {
    /** Firestore document id */
    id: string;
    /** Basic profile */
    firstName: string;
    lastName: string;
    birthDate: string;
    gender: string;
    /** Parent linkage (users with role="parent") */
    parentId: string[];
    /** Placement info */
    classId?: string;
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
export type UpdateChildProfileInput = Partial<Pick<Child, "firstName" | "lastName" | "birthDate" | "locationId" | "notes">>;
export type ChildDTO = Child;
type ParentChildRelationship = {
    childId: string;
    relationship: string;
};
export type Parent = {
    id: string;
    docId: string;
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
export type DailyReport = {
    id: string;
    childId: string;
    date: string;
    entries: Entry[];
    createdAt: string;
};
export {};
//# sourceMappingURL=type.d.ts.map