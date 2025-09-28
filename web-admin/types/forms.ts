// types/forms.ts
import * as Types from '../../shared/types/type';

// Tabs used in the dashboard
export type Tab = 'overview' | 'teachers' | 'children' | 'parents' | 'classes' | 'schedule' | 'report';

// New item input shapes for controlled forms (no `any`)
export type NewTeacherInput = Omit<Types.Teacher, 'id' | 'role'>;

export interface NewChildInput {
  firstName: string;
  lastName: string;
  birthDate: string;
  parentIdsCsv: string;
  classId: string;
  allergies?: string;
  specialNeeds?: string;
  subsidyStatus?: string;
  enrollmentDate: string;
  enrollmentStatus: Types.Child['enrollmentStatus'];
  endDate?: string;
}

export type NewParentInput = Omit<Types.Parent, 'id' | 'role' | 'createdAt'>;

// NOTE: Keep `capcity` to match your current Types.Class (typo in schema)
export interface NewClassInput {
  name: string;
  locationId: string;
  capacity: number;
  volume: number;
  ageStart: number;
  ageEnd: number;
  classroom: string,
}
