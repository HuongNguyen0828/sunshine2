'use client';

import * as Types from '../../../shared/types/type';
import { sharedStyles } from '@/styles/sharedStyle';
import type { NewClassInput } from '@/types/forms';

export default function ClassesTab({
  classes,
  teachers,
  newClass,
  setNewClass,
  onAdd,
}: {
  classes: Types.Class[];
  teachers: Types.Teacher[];
  newClass: NewClassInput;
  setNewClass: React.Dispatch<React.SetStateAction<NewClassInput>>;
  onAdd: () => void;
}) {
  return (
    <div>
      <h2>Manage Classes</h2>

      {/* Class create form */}
      <form onSubmit={(e) => { e.preventDefault(); onAdd(); }} style={sharedStyles.form}>
        <h3>Add New Class</h3>
        <input style={sharedStyles.input} placeholder="Class Name" value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} required />
        <input style={sharedStyles.input} placeholder="Location ID" value={newClass.locationId} onChange={(e) => setNewClass({ ...newClass, locationId: e.target.value })} required />
        {/* Keep `capcity` to align with current Types.Class */}
        <input type="number" style={sharedStyles.input} placeholder="Capacity" value={newClass.capcity} onChange={(e) => setNewClass({ ...newClass, capcity: Number(e.target.value) })} required />
        <input type="number" style={sharedStyles.input} placeholder="Volume" value={newClass.volume} onChange={(e) => setNewClass({ ...newClass, volume: Number(e.target.value) })} required />
        <input type="number" style={sharedStyles.input} placeholder="Age Start" value={newClass.ageStart} onChange={(e) => setNewClass({ ...newClass, ageStart: Number(e.target.value) })} required />
        <input type="number" style={sharedStyles.input} placeholder="Age End" value={newClass.ageEnd} onChange={(e) => setNewClass({ ...newClass, ageEnd: Number(e.target.value) })} required />
        <button type="submit" style={sharedStyles.button}>Add Class</button>
      </form>

      {/* Class list */}
      <div style={sharedStyles.list}>
        <h3>All Classes</h3>
        {classes.map((cls) => {
          const assignedTeachers = teachers.filter((t) => t.classIds.includes(cls.id));
          return (
            <div key={cls.id} style={sharedStyles.listItem}>
              <div><strong>{cls.name}</strong> (Location: {cls.locationId})</div>
              <div>
                Ages: {cls.ageStart}–{cls.ageEnd} | Capacity: {cls.capcity} | Volume: {cls.volume}
              </div>
              <div>
                Teachers: {assignedTeachers.length
                  ? assignedTeachers.map((t) => `${t.firstName} ${t.lastName}`).join(', ')
                  : 'Unassigned'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
