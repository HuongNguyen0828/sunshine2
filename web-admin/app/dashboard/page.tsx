'use client';

import React, { useState, useEffect} from "react";
import { useAuth } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";
import App from "next/app";
import { assignRoleToUser } from "../helpers"; // assigning role
import Teachers from "@/components/Teachers"
import * as Types from "@shared/types/type"; // Type definitions

interface Dashboard {
  teacherLen: number,

}
export default function AdminDashboard( {teacherLen}: Dashboard) {
  const { signOutUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [teachers, setTeachers] = useState<Types.Teacher[]>([])



   
  // Fetching teacher from database: backend domain
  useEffect(() => {
  const fetchTeachers = async () => {
      try {
      const res = await fetch("http://localhost:5000/teachers");
      if (!res.ok) throw new Error("Failed to fetch teachers ")

      const data: Types.Teacher[] = await res.json();
      setTeachers(data)

      // get teachers length
      length = teachers.length;

      } catch (err: any) {
      console.error(err)
      alert("Error fetching teachers")
      }
  }
  // call fetchTeacher
  fetchTeachers();
  console.log(teachers)
  }, [])



  const [children, setChildren] = useState<Types.Child[]>([
    { id: "1", name: "Emma Wilson", age: 8, parentId: "1", classId: "1" },
    { id: "2", name: "Noah Smith", age: 9, parentId: "2", classId: "1" },
  ]);
  
  const [parents, setParents] = useState<Types.Parent[]>([
    { id: "1", name: "Jennifer Wilson", email: "jennifer@email.com", phone: "555-1234" },
    { id: "2", name: "Robert Smith", email: "robert@email.com", phone: "555-5678" },
  ]);
  
  const [classes, setClasses] = useState<Types.Class[]>([
    { id: "1", name: "Class 3A", grade: "3rd Grade", teacherId: "1" },
    { id: "2", name: "Class 4B", grade: "4th Grade", teacherId: "2" },
  ]);
  
  // Form states
  const [newChild, setNewChild] = useState({ name: "", age: "", parentId: "", classId: "" });
  const [newParent, setNewParent] = useState({ name: "", email: "", phone: "" });
  const [newClass, setNewClass] = useState({ name: "", grade: "", teacherId: "" });



  const addChild = (e: React.FormEvent) => {
    e.preventDefault();
    const child: Types.Child = {
      id: String(children.length + 1),
      name: newChild.name,
      age: Number(newChild.age),
      parentId: newChild.parentId,
      classId: newChild.classId
    };
    setChildren([...children, child]);
    setNewChild({ name: "", age: "", parentId: "", classId: "" });
  };

  const addParent = (e: React.FormEvent) => {
    e.preventDefault();
    const parent: Types.Parent = {
      id: String(parents.length + 1),
      ...newParent
    };
    setParents([...parents, parent]);
    setNewParent({ name: "", email: "", phone: "" });
  };

  const addClass = (e: React.FormEvent) => {
    e.preventDefault();
    const cls: Types.Class = {
      id: String(classes.length + 1),
      ...newClass
    };
    setClasses([...classes, cls]);
    setNewClass({ name: "", grade: "", teacherId: "" });
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <AppHeader />
        <h1 style={styles.headerTitle}>Admin Dashboard</h1>
        <div style={styles.headerActions}>
          <span style={styles.welcome}>Welcome, Admin</span>
          <button onClick={signOutUser} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </header>

      <div style={styles.content}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <nav style={styles.nav}>
            <button 
              style={activeTab === "overview" ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button 
              style={activeTab === "teachers" ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}
              onClick={() => setActiveTab("teachers")}
            >
              Teachers
            </button>
            <button 
              style={activeTab === "children" ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}
              onClick={() => setActiveTab("children")}
            >
              Children
            </button>
            <button 
              style={activeTab === "parents" ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}
              onClick={() => setActiveTab("parents")}
            >
              Parents
            </button>
            <button 
              style={activeTab === "classes" ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}
              onClick={() => setActiveTab("classes")}
            >
              Classes
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main style={styles.main}>
          {activeTab === "overview" && (
            <div style={styles.overview}>
              <h2>Dashboard Overview</h2>
              <div style={styles.stats}>
                <div style={styles.statCard}>
                  <h3>Teachers</h3>
                  <p style={styles.statNumber}>{teachers.length}</p>
                </div>
                <div style={styles.statCard}>
                  <h3>Children</h3>
                  <p style={styles.statNumber}>{children.length}</p>
                </div>
                <div style={styles.statCard}>
                  <h3>Parents</h3>
                  <p style={styles.statNumber}>{parents.length}</p>
                </div>
                <div style={styles.statCard}>
                  <h3>Classes</h3>
                  <p style={styles.statNumber}>{classes.length}</p>
                </div>
              </div>
            </div>
          )}
          {/* Factor out Teacher component */}
          {activeTab === "teachers" && (
            <Teachers 
              teachers={teachers}
            />
          )}

          {activeTab === "children" && (
            <div>
              <h2>Manage Children</h2>
              <form onSubmit={addChild} style={styles.form}>
                <h3>Add New Child</h3>
                <input
                  type="text"
                  placeholder="Name"
                  value={newChild.name}
                  onChange={(e) => setNewChild({...newChild, name: e.target.value})}
                  style={styles.input}
                  required
                />
                <input
                  type="number"
                  placeholder="Age"
                  value={newChild.age}
                  onChange={(e) => setNewChild({...newChild, age: e.target.value})}
                  style={styles.input}
                  required
                />
                <select
                  value={newChild.parentId}
                  onChange={(e) => setNewChild({...newChild, parentId: e.target.value})}
                  style={styles.input}
                  required
                >
                  <option value="">Select Parent</option>
                  {parents.map(parent => (
                    <option key={parent.id} value={parent.id}>{parent.name}</option>
                  ))}
                </select>
                <select
                  value={newChild.classId}
                  onChange={(e) => setNewChild({...newChild, classId: e.target.value})}
                  style={styles.input}
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
                <button type="submit" style={styles.button}>
                  Add Child
                </button>
              </form>

              <div style={styles.list}>
                <h3>All Children</h3>
                {children.map(child => {
                  const parent = parents.find(p => p.id === child.parentId);
                  const cls = classes.find(c => c.id === child.classId);
                  return (
                    <div key={child.id} style={styles.listItem}>
                      <div>
                        <strong>{child.name}</strong> (Age: {child.age})
                      </div>
                      <div>Parent: {parent?.name || "Unknown"}</div>
                      <div>Class: {cls?.name || "Unknown"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "parents" && (
            <div>
              <h2>Manage Parents</h2>
              <form onSubmit={addParent} style={styles.form}>
                <h3>Add New Parent</h3>
                <input
                  type="text"
                  placeholder="Name"
                  value={newParent.name}
                  onChange={(e) => setNewParent({...newParent, name: e.target.value})}
                  style={styles.input}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newParent.email}
                  onChange={(e) => setNewParent({...newParent, email: e.target.value})}
                  style={styles.input}
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={newParent.phone}
                  onChange={(e) => setNewParent({...newParent, phone: e.target.value})}
                  style={styles.input}
                  required
                />
                <button type="submit" style={styles.button}>
                  Add Parent
                </button>
              </form>

              <div style={styles.list}>
                <h3>All Parents</h3>
                {parents.map(parent => (
                  <div key={parent.id} style={styles.listItem}>
                    <div>
                      <strong>{parent.name}</strong>
                    </div>
                    <div>{parent.email}</div>
                    <div>{parent.phone}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "classes" && (
            <div>
              <h2>Manage Classes</h2>
              <form onSubmit={addClass} style={styles.form}>
                <h3>Add New Class</h3>
                <input
                  type="text"
                  placeholder="Class Name"
                  value={newClass.name}
                  onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                  style={styles.input}
                  required
                />
                <input
                  type="text"
                  placeholder="Grade"
                  value={newClass.grade}
                  onChange={(e) => setNewClass({...newClass, grade: e.target.value})}
                  style={styles.input}
                  required
                />
                <select
                  value={newClass.teacherId}
                  onChange={(e) => setNewClass({...newClass, teacherId: e.target.value})}
                  style={styles.input}
                  required
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
                <button type="submit" style={styles.button}>
                  Add Class
                </button>
              </form>

              <div style={styles.list}>
                <h3>All Classes</h3>
                {classes.map(cls => {
                  const teacher = teachers.find(t => t.id === cls.teacherId);
                  return (
                    <div key={cls.id} style={styles.listItem}>
                      <div>
                        <strong>{cls.name}</strong> - {cls.grade}
                      </div>
                      <div>Teacher: {teacher?.name || "Unassigned"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#1e90ff",
    color: "white",
    padding: "1rem 2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    margin: 0,
    fontSize: "1.5rem",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  welcome: {
    fontSize: "1rem",
  },
  logoutButton: {
    backgroundColor: "transparent",
    border: "1px solid white",
    color: "white",
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    cursor: "pointer",
  },
  content: {
    display: "flex",
    minHeight: "calc(100vh - 80px)",
  },
  sidebar: {
    width: "250px",
    backgroundColor: "#2c3e50",
    color: "white",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    padding: "1rem 0",
  },
  navButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "white",
    textAlign: "left",
    padding: "1rem 2rem",
    cursor: "pointer",
    fontSize: "1rem",
  },
  navButtonActive: {
    backgroundColor: "#1e90ff",
  },
  main: {
    flex: 1,
    padding: "2rem",
    overflowY: "auto",
  },
  overview: {
    marginBottom: "2rem",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
    marginTop: "1rem",
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "1.5rem",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  statNumber: {
    fontSize: "2rem",
    fontWeight: "bold",
    margin: "0.5rem 0 0 0",
    color: "#1e90ff",
  },
  form: {
    backgroundColor: "white",
    padding: "1.5rem",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    marginBottom: "2rem",
  },
  input: {
    display: "block",
    width: "100%",
    padding: "0.75rem",
    marginBottom: "1rem",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "1rem",
  },
  button: {
    backgroundColor: "#1e90ff",
    color: "white",
    border: "none",
    padding: "0.75rem 1.5rem",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "1rem",
  },
  list: {
    backgroundColor: "white",
    padding: "1.5rem",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  listItem: {
    padding: "1rem",
    borderBottom: "1px solid #eee",
  },
};