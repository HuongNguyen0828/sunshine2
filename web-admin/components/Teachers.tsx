
import {useState, useEffect } from "react"
import * as Types from "@shared/types/type"; // Type definitions
import { sharedStyles } from "@/styles/sharedStyle"; // import styles sharing 
import { assignRoleToUser } from "@/app/helpers"; // assigning role


export default function Teachers() {

    const [teachers, setTeachers] = useState<Types.Teacher[]>([])
    const [newTeacher, setNewTeacher] = useState<Types.Teacher>({});
    
    
    // Fetching teacher from database: backend domain
    useEffect(() => {
    const fetchTeachers = async () => {
        try {
        const res = await fetch("http://localhost:5000/teachers");
        if (!res.ok) throw new Error("Failed to fetch teachers ")

        const data: Types.Teacher[] = await res.json();
        setTeachers(data)
        } catch (err: any) {
        console.error(err)
        alert("Error fetching teachers")
        }
    }
    // call fetchTeacher
    fetchTeachers();
    console.log(teachers)
    }, [])

    // Handle form submissions add teacher
    const addTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher: Types.Teacher = {
        id: String(teachers.length + 1),
        ...newTeacher
    };
    setTeachers([...teachers, teacher]);
    setNewTeacher({ name: "", email: "", subject: "" });
    };

    
     return (
        <div>
            <h2>Manage Teachers</h2>
            <form onSubmit={addTeacher} style={sharedStyles.form}>
            <h3>Add New Teacher</h3>
            <input
                type="text"
                placeholder="Name"
                value={newTeacher.name}
                onChange={(e) => setNewTeacher({...newTeacher, name: e.target.value})}
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
                placeholder="Subject"
                value={newTeacher.subject}
                onChange={(e) => setNewTeacher({...newTeacher, subject: e.target.value})}
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
                    <strong>{teacher.firstName} {teacher.lastName}</strong> - {teacher.classId}
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


