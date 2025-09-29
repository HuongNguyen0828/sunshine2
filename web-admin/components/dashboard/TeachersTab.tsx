"use client";

import * as Types from "../../../shared/types/type";
import { useCallback } from "react";
import { sharedStyles } from "@/styles/sharedStyle";
import type { NewTeacherInput } from "@/types/forms";
import AutoCompleteAdress from "@/components/AutoCompleteAddress";
import {Address} from "@/components/AutoCompleteAddress"

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

  const handleAddressChange = useCallback((a: Address) => {
    setNewTeacher((prev) => ({
        ...prev, 
        address1: a.address1, 
        address2: a.address2, 
        city: a.city, 
        province: a.province, 
        country: a.country, 
        postalcode: a.postalcode
    }));
}, []);


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
          
        {/* Adding Teacher's */}
        <AutoCompleteAdress onAddressChanged={handleAddressChange} />


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
        <h3>All Teachers - {teachers.length}</h3>
        {teachers.length !== 0 ? (
          teachers.map((t) => (
          <div key={t.id} style={sharedStyles.listItem}>
            <div>
              <div>
                <strong>
                  {t.firstName} {t.lastName}
                </strong>{" "}
                ({t.email})
              </div>
              <div>Phone: {t.phone}</div>
              <div>Address: {t.address2} {t.address1} {t.city} {t.province} {t.country} {t.postalcode} </div>
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
          ))
        ) : (
        <div> No teacher to show </div>
    )}
         </div>
    </div>     
  );
}
