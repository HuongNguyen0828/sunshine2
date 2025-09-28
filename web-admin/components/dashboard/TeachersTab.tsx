'use client';

import * as Types from '../../../shared/types/type';
import { sharedStyles } from '@/styles/sharedStyle';
import type { NewTeacherInput } from '@/types/forms';
import {useState} from "react";
import { CountryType } from '@/utils/autoCompleteAddress';
import { Autocomplete } from "@react-google-maps/api"

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
        <label>
          First name:
          <input
            style={sharedStyles.input}
            placeholder="First Name"
            value={newTeacher.firstName}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, firstName: e.target.value })
            }
            required
          />
        </label>

        <label>
          Last name
          <input
            style={sharedStyles.input}
            placeholder="Last Name"
            value={newTeacher.lastName}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, lastName: e.target.value })
            }
            required
          />
        </label>

        <label>
          Email:
          <input
            type="email"
            style={sharedStyles.input}
            placeholder="Email"
            value={newTeacher.email}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, email: e.target.value })
            }
            required
          />
        </label>

        <label>
          Phone Number:
          <input
            style={sharedStyles.input}
            placeholder="e.g. 403 111 2284"
            value={newTeacher.phone}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, phone: e.target.value })
            }
            required
          />
        </label>

        

        <label>
          Start Date:
          <input
            type="date"
            style={sharedStyles.input}
            value={newTeacher.startDate}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, startDate: e.target.value })
            }
            required
          />
        </label>

        <label>
          End Date:
          <input
            type="date"
            style={sharedStyles.input}
            placeholder="End Date (optional)"
            value={newTeacher.endDate || ""}
            onChange={(e) =>
              setNewTeacher({
                ...newTeacher,
                endDate: e.target.value || undefined,
              })
            }
          />
        </label>
        <button type="submit" style={sharedStyles.button}>
          Add Teacher
        </button>
      </form>

      {/* Teacher list */}
      <div style={sharedStyles.list}>
        <h3>All Teachers</h3>
        {teachers.map((t) => (
          <div key={t.id} style={sharedStyles.listItem}>
            <div>
              <div>
                <strong>
                  {t.firstName} {t.lastName}
                </strong>{" "}
                ({t.email})
              </div>
              <div>Phone: {t.phone}</div>
              <div>Address: {t.address}</div>
              <div>
                {/* Classes: {t.classIds?.length ? t.classIds.join(", ") : "None"} */}
              </div>
              <div>
                Tenure: {String(t.startDate)}
                {t.endDate ? ` → ${String(t.endDate)}` : ""}
              </div>
            </div>

            {/* Button section */}
            <div style={sharedStyles.secondaryButtonSection}>
              <button
                style={{ ...sharedStyles.button }}
                // onClick={() => assignRoleToUser(t.id, "admin", true)}
              >
                Assign Class
              </button>

              <button
                style={{ ...sharedStyles.button }}
                // onClick={() => assignRoleToUser(t.id, "admin", true)}
              >
                Make Admin
              </button>

              <button
                style={{
                  ...sharedStyles.secondaryButton,
                  backgroundColor: "grey",
                }}
                // onClick={() => assignRoleToUser(t.id, "admin", true)}
              >
                Edit
              </button>

              <button
                style={{
                  ...sharedStyles.secondaryButton,
                  backgroundColor: "red",
                }}
                // onClick={() => assignRoleToUser(t.id, "admin", true)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
