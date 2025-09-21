'use client';

import * as Types from '../../../shared/types/type';
import { sharedStyles } from '@/styles/sharedStyle';
import type { NewParentInput } from '@/types/forms';

export default function ParentsTab({
  parents,
  newParent,
  setNewParent,
  onAdd,
}: {
  parents: Types.Parent[];
  newParent: NewParentInput;
  setNewParent: React.Dispatch<React.SetStateAction<NewParentInput>>;
  onAdd: () => void;
}) {
  return (
    <div>
      <h2>Manage Parents</h2>

      {/* Parent create form */}
      <form onSubmit={(e) => { e.preventDefault(); onAdd(); }} style={sharedStyles.form}>
        <h3>Add New Parent</h3>
        <input style={sharedStyles.input} placeholder="First Name" value={newParent.firstName} onChange={(e) => setNewParent({ ...newParent, firstName: e.target.value })} required />
        <input style={sharedStyles.input} placeholder="Last Name" value={newParent.lastName} onChange={(e) => setNewParent({ ...newParent, lastName: e.target.value })} required />
        <input type="email" style={sharedStyles.input} placeholder="Email" value={newParent.email} onChange={(e) => setNewParent({ ...newParent, email: e.target.value })} required />
        <input style={sharedStyles.input} placeholder="Phone" value={newParent.phone} onChange={(e) => setNewParent({ ...newParent, phone: e.target.value })} required />
        <input style={sharedStyles.input} placeholder="Password Hash" value={newParent.passwordHash} onChange={(e) => setNewParent({ ...newParent, passwordHash: e.target.value })} required />
        <input
          style={sharedStyles.input}
          placeholder="Child IDs (comma separated)"
          onChange={(e) =>
            setNewParent({
              ...newParent,
              childIds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            })
          }
        />
        <input style={sharedStyles.input} placeholder="Street" value={newParent.street} onChange={(e) => setNewParent({ ...newParent, street: e.target.value })} required />
        <input style={sharedStyles.input} placeholder="City" value={newParent.city} onChange={(e) => setNewParent({ ...newParent, city: e.target.value })} required />
        <input style={sharedStyles.input} placeholder="Province" value={newParent.province} onChange={(e) => setNewParent({ ...newParent, province: e.target.value })} required />
        <input style={sharedStyles.input} placeholder="Country" value={newParent.country} onChange={(e) => setNewParent({ ...newParent, country: e.target.value })} required />
        <input style={sharedStyles.input} placeholder="Emergency Contact (optional)" value={newParent.emergencyContact ?? ''} onChange={(e) => setNewParent({ ...newParent, emergencyContact: e.target.value })} />
        <input type="datetime-local" style={sharedStyles.input} placeholder="Updated At (optional)" value={newParent.updatedAt ?? ''} onChange={(e) => setNewParent({ ...newParent, updatedAt: e.target.value })} />
        <input style={sharedStyles.input} placeholder="Preferred Language (e.g., en, fr)" value={newParent.preferredLanguage ?? ''} onChange={(e) => setNewParent({ ...newParent, preferredLanguage: e.target.value })} />
        <button type="submit" style={sharedStyles.button}>Add Parent</button>
      </form>

      {/* Parent list */}
      <div style={sharedStyles.list}>
        <h3>All Parents</h3>
        {parents.map((p) => (
          <div key={p.id} style={sharedStyles.listItem}>
            <div><strong>{p.firstName} {p.lastName}</strong></div>
            <div>{p.email}</div>
            <div>{p.phone}</div>
            <div>Children: {p.childIds.join(', ') || 'None'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
