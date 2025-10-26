// types/forms.ts
import * as Types from '../../shared/types/type';

// Tabs used in the dashboard
export type Tab = 'overview' | 'teachers' | 'children' | 'parents' | 'classes' | 'scheduler-labs';

// New item input shapes for controlled forms (no `any`)
export type NewTeacherInput = Omit<Types.Teacher, 'id' | 'role'>;



export type NewParentInput = {
  firstName: string;
  lastName: string;
  email: string;           // username for login
  phone: string;
  newChildRelationship: string; // Changed from childIds  address1: string;
  address1: string,
  address2?: string;
  city: string;
  province: string;
  country: string;
  postalcode?: string;
  maritalStatus: string;
  locationId?: string;
}

// NOTE: Keep `capcity` to match your current Types.Class (typo in schema)
export interface NewClassInput {
  name: string;
  locationId?: string;
  capacity: number;
  volume: number;
  ageStart: number;
  ageEnd: number;
  classroom: string,
}

/** UI form input used when creating/updating a child */
export type NewChildInput = {
  firstName: string;
  lastName: string; // YYYY-MM-DD
  gender: string;
  birthDate: string;
  parentId: string[];
  classId?: string;
  locationId?: string;
  notes?: string;
  enrollmentStatus?: Types.EnrollmentStatus;
  startDate: string,
};