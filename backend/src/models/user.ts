export enum UserRole {
    Admin = 'admin',
    Teacher = 'teacher',
    Parent = 'parent',
}

export interface UserClaims {
    role: UserRole;
    daycareId?: string; // Optional for multi-tenancy
    locationId?: string; // Optional for multi-tenancy
    classroomId?: string; // Optional for teachers
    childrenId?: string; // Optional for parents
}

export type UserProfile = {
  role?: string;
  email?: string;
  daycareId?: string;
  locationId?: string;
};

export type AdminScope =
  | { kind: "all" }
  | { kind: "location"; id: string }
  | { kind: "daycare"; daycareId: string };