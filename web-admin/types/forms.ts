// types/forms.ts
import * as Types from '../../shared/types/type';

// Tabs used in the dashboard
export type Tab = 'overview' | 'teachers' | 'children' | 'parents' | 'classes' | 'scheduler-labs';

// New item input shapes for controlled forms (no `any`)
export type NewTeacherInput = Omit<Types.Teacher, 'id' | 'role'>;

export type NewParentInput = Omit<Types.Parent, 'id' | 'role' | 'childIds'>;

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
