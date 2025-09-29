
import {useState, useEffect } from "react"
import * as Types from "../../shared/types/type"; // Type definitions
import { sharedStyles } from "@/styles/sharedStyle"; // import styles sharing 
import { assignRoleToUser } from "@/app/helpers"; // assigning role

interface TeachersProps {
  teachers: Types.Teacher[];
}

export default function Teachers( {teachers}: TeachersProps) {

    const [newTeacher, setNewTeacher] = useState<Partial<Types.Teacher>>({});
    
   

    // Handle form submissions add teacher
    const addTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher: Types.Teacher = {
        id: String(teachers.length + 1),
        firstName: newTeacher.firstName || "",
        lastName: newTeacher.lastName || "",
        role: "teacher",
        email: newTeacher.email || "",
        phone: newTeacher.phone || "",
        street: newTeacher.street || "",
        city: newTeacher.city || "",
        province: newTeacher.province || "",
        country: newTeacher.country || "CA",
        startDate: new Date().toISOString(),
        classIds: newTeacher.classIds || [],
        locationId: newTeacher.locationId || "",
    };
    setNewTeacher({ firstName: "", lastName: "",  email: "", phone: "" });
    };

    
     return (
        <div>
            <h2>Manage Teachers</h2>
            <form onSubmit={addTeacher} style={sharedStyles.form}>
            <h3>Add New Teacher</h3>
            <input
                type="text"
                placeholder="First Name"
                value={newTeacher.firstName}
                onChange={(e) => setNewTeacher({...newTeacher, firstName: e.target.value})}
                style={sharedStyles.input}
                required
            />
            <input
                type="text"
                placeholder="Last Name"
                value={newTeacher.lastName}
                onChange={(e) => setNewTeacher({...newTeacher, lastName: e.target.value})}
                style={sharedStyles.input}
                required
            />
            <input
                type="email"
                placeholder="Email"
                value={newTeacher.email}
                onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})}
                style={sharedStyles.input}
                required
            />
            <input
                type="text"
                placeholder="Phonet"
                value={newTeacher.phone}
                onChange={(e) => setNewTeacher({...newTeacher, phone: e.target.value})}
                style={sharedStyles.input}
                required
            />


            <button type="submit" style={sharedStyles.button}>
                Add Teacher
            </button>
            </form>

            <div style={sharedStyles.list}>
            <h3>All Teachers</h3>
            {teachers.map(teacher => (
                <div key={teacher.id} style={sharedStyles.listItem}>
                <div>
                    <strong>{teacher.firstName} {teacher.lastName}</strong> - {teacher.classIds?.join(", ") || "No classes assigned"}
                </div>
                <div><strong>Email:</strong> {teacher.email} <strong>Phone:</strong> {teacher.phone}</div>
            
                <div><strong>Start date:</strong> {teacher.startDate} - {teacher.endDate}</div>
                {/* Add role for teacher */}

                <button
                    style={{ ...sharedStyles.button, marginTop: "0.5rem" }}
                    onClick={() => assignRoleToUser(teacher.id, "admin", true)}
                >
                    Make Admin
                </button>
                </div>

            ))}
            </div>
        </div>
     ) 
}


