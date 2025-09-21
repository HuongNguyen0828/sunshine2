'use client';

import * as Types from '../../../shared/types/type';
import { sharedStyles } from '@/styles/sharedStyle';
import type { NewTeacherInput } from '@/types/forms';

export default function TeachersTab({
  teachers,
  newTeacher,
  setNewTeacher,
  onAdd,
}: {
  teachers: Types.Teacher[];
  newTeacher: NewTeacherInput;
  setNewTeacher: React.Dispatch<React.SetStateAction<NewTeacherInput>>;
  onAdd: () => void;
}) {
  return (
    <div>
      <h2>Manage Teachers</h2>
      {/* Teacher create form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd();
        }}
        style={sharedStyles.form}
      >
        <h3>Add New Teacher</h3>
        <input
          style={sharedStyles.input}
          placeholder="First Name"
          value={newTeacher.firstName}
          onChange={(e) => setNewTeacher({ ...newTeacher, firstName: e.target.value })}
          required
        />
        <input
          style={sharedStyles.input}
          placeholder="Last Name"
          value={newTeacher.lastName}
          onChange={(e) => setNewTeacher({ ...newTeacher, lastName: e.target.value })}
          required
        />
        <input
          type="email"
          style={sharedStyles.input}
          placeholder="Email"
          value={newTeacher.email}
          onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
          required
        />
        <input
          style={sharedStyles.input}
          placeholder="Phone"
          value={newTeacher.phone}
          onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
          required
        />
        <input
          style={sharedStyles.input}
          placeholder="Location ID"
          value={newTeacher.locationId}
          onChange={(e) => setNewTeacher({ ...newTeacher, locationId: e.target.value })}
          required
        />
        <input
          style={sharedStyles.input}
          placeholder="Class IDs (comma separated)"
          onChange={(e) =>
            setNewTeacher({
              ...newTeacher,
              classIds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            })
          }
        />
        <input
          type="date"
          style={sharedStyles.input}
          placeholder="Start Date"
          value={newTeacher.startDate}
          onChange={(e) => setNewTeacher({ ...newTeacher, startDate: e.target.value })}
          required
        />
        <input
          type="date"
          style={sharedStyles.input}
          placeholder="End Date (optional)"
          value={newTeacher.endDate || ''}
          onChange={(e) => setNewTeacher({ ...newTeacher, endDate: e.target.value || undefined })}
        />
        <button type="submit" style={sharedStyles.button}>Add Teacher</button>
      </form>

      {/* Teacher list */}
      <div style={sharedStyles.list}>
        <h3>All Teachers</h3>
        {teachers.map((t) => (
          <div key={t.id} style={sharedStyles.listItem}>
            <div><strong>{t.firstName} {t.lastName}</strong> ({t.email})</div>
            <div>Phone: {t.phone}</div>
            <div>Location: {t.locationId}</div>
            <div>Classes: {t.classIds?.length ? t.classIds.join(', ') : 'None'}</div>
            <div>Tenure: {String(t.startDate)}{t.endDate ? ` → ${String(t.endDate)}` : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
