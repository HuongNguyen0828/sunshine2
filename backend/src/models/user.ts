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