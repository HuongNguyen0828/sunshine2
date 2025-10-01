'use client';

import * as Types from '../../../shared/types/type';
import { sharedStyles } from '@/styles/sharedStyle';
import type { NewChildInput } from '@/types/forms';

export default function ChildrenTab({
  classes,
  parents,
  childList, // avoid the reserved prop name "children"
  newChild,
  setNewChild,
  onAdd,
}: {
  classes: Types.Class[];
  parents: Types.Parent[];
  childList: Types.Child[];
  newChild: NewChildInput;
  setNewChild: React.Dispatch<React.SetStateAction<NewChildInput>>;
  onAdd: () => void;
}) {
  return (
    <div>
      <h2>Manage Children</h2>

      {/* Create child */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd();
        }}
        style={sharedStyles.form}
      >
        <h3>Add New Child</h3>
        <input
          style={sharedStyles.input}
          placeholder="First Name"
          value={newChild.firstName}
          onChange={(e) => setNewChild({ ...newChild, firstName: e.target.value })}
          required
        />
        <input
          style={sharedStyles.input}
          placeholder="Last Name"
          value={newChild.lastName}
          onChange={(e) => setNewChild({ ...newChild, lastName: e.target.value })}
          required
        />
        <input
          type="date"
          style={sharedStyles.input}
          placeholder="Birth Date"
          value={newChild.birthDate}
          onChange={(e) => setNewChild({ ...newChild, birthDate: e.target.value })}
          required
        />
        <input
          style={sharedStyles.input}
          placeholder="Parent IDs (comma separated)"
          value={newChild.parentIdsCsv}
          onChange={(e) => setNewChild({ ...newChild, parentIdsCsv: e.target.value })}
          required
        />
        <select
          style={sharedStyles.input}
          value={newChild.classId}
          onChange={(e) => setNewChild({ ...newChild, classId: e.target.value })}
          required
        >
          <option value="">Select Class</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
        <input
          style={sharedStyles.input}
          placeholder="Allergies (optional)"
          value={newChild.allergies ?? ''}
          onChange={(e) => setNewChild({ ...newChild, allergies: e.target.value })}
        />
        <input
          style={sharedStyles.input}
          placeholder="Special Needs (optional)"
          value={newChild.specialNeeds ?? ''}
          onChange={(e) => setNewChild({ ...newChild, specialNeeds: e.target.value })}
        />
        <input
          style={sharedStyles.input}
          placeholder="Subsidy Status (optional)"
          value={newChild.subsidyStatus ?? ''}
          onChange={(e) => setNewChild({ ...newChild, subsidyStatus: e.target.value })}
        />
        <input
          type="date"
          style={sharedStyles.input}
          placeholder="Enrollment Date"
          value={newChild.enrollmentDate}
          onChange={(e) => setNewChild({ ...newChild, enrollmentDate: e.target.value })}
          required
        />
        <select
          style={sharedStyles.input}
          value={newChild.enrollmentStatus}
          onChange={(e) =>
            setNewChild({
              ...newChild,
              enrollmentStatus: e.target.value as Types.Child['enrollmentStatus'],
            })
          }
          required
        >
          <option value="New">New</option>
          <option value="Active">Active</option>
          <option value="Withdraw">Withdraw</option>
          <option value="Waitlist">Waitlist</option>
        </select>
        <input
          type="date"
          style={sharedStyles.input}
          placeholder="End Date (optional)"
          value={newChild.endDate ?? ''}
          onChange={(e) => setNewChild({ ...newChild, endDate: e.target.value })}
        />
        <button type="submit" style={sharedStyles.button}>
          Add Child
        </button>
      </form>

      {/* Child list */}
      <div style={sharedStyles.list}>
        <h3>All Children</h3>
        {childList.map((c) => {
          // Resolve class name
          const cls = classes.find((x) => x.id === c.classId);
          // Resolve parent names from IDs
          const parentNames = parents
            .filter((p) => c.parentId.includes(p.id))
            .map((p) => `${p.firstName} ${p.lastName}`)
            .join(', ');

          return (
            <div key={c.id} style={sharedStyles.listItem}>
              <div>
                <strong>
                  {c.firstName} {c.lastName}
                </strong>{' '}
                (Class: {cls?.name || 'Unknown'})
              </div>
              <div>Parents: {parentNames || 'Unknown'}</div>
              <div>Status: {c.enrollmentStatus}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
