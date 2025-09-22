'use client';


import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';
import SidebarNav from '@/components/dashboard/SidebarNav';
import Overview from '@/components/dashboard/Overview';
import TeachersTab from '@/components/dashboard/TeachersTab';
import ChildrenTab from '@/components/dashboard/ChildrenTab';
import ParentsTab from '@/components/dashboard/ParentsTab';
import ClassesTab from '@/components/dashboard/ClassesTab';
import { dash } from '@/styles/dashboard';
import * as Types from '../../../shared/types/type';
import type {
  Tab,
  NewTeacherInput,
  NewChildInput,
  NewParentInput,
  NewClassInput,
} from '@/types/forms';

// Firestore (client SDK)
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function AdminDashboard() {
  const { signOutUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // --- Entity states (Teachers from Firestore; others local for now)
  const [teachers, setTeachers] = useState<Types.Teacher[]>([]);
  const [children, setChildren] = useState<Types.Child[]>([
    {
      id: '1',
      firstName: 'Emma',
      lastName: 'Wilson',
      birthDate: '2017-03-12',
      parentId: ['1'],
      classId: '1',
      enrollmentDate: '2024-09-01',
      enrollmentStatus: 'Active',
    },
    {
      id: '2',
      firstName: 'Noah',
      lastName: 'Smith',
      birthDate: '2016-11-05',
      parentId: ['2'],
      classId: '1',
      enrollmentDate: '2024-09-01',
      enrollmentStatus: 'Active',
    },
  ]);
  const [parents, setParents] = useState<Types.Parent[]>([
    {
      id: '1',
      firstName: 'Jennifer',
      lastName: 'Wilson',
      email: 'jennifer@email.com',
      role: 'parent',
      phone: '555-1234',
      passwordHash: '****',
      childIds: ['1'],
      street: '123 Main St',
      city: 'Calgary',
      province: 'AB',
      country: 'CA',
      createdAt: '2025-09-01',
    },
    {
      id: '2',
      firstName: 'Robert',
      lastName: 'Smith',
      email: 'robert@email.com',
      role: 'parent',
      phone: '555-5678',
      passwordHash: '****',
      childIds: ['2'],
      street: '45 Oak Ave',
      city: 'Calgary',
      province: 'AB',
      country: 'CA',
      createdAt: '2025-09-01',
    },
  ]);
  const [classes, setClasses] = useState<Types.Class[]>([
    { id: '1', name: 'Class 3A', locationId: 'loc-1', capcity: 20, volume: 20, ageStart: 7, ageEnd: 9 },
    { id: '2', name: 'Class 4B', locationId: 'loc-1', capcity: 20, volume: 18, ageStart: 8, ageEnd: 10 },

  ]);


  // --- Controlled form states (type-safe; no `any`)
  const [newTeacher, setNewTeacher] = useState<NewTeacherInput>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    classIds: [],
    locationId: '',
    startDate: '',
    endDate: undefined,
  });

  const [newChild, setNewChild] = useState<NewChildInput>({
    firstName: '',
    lastName: '',
    birthDate: '',
    parentIdsCsv: '',
    classId: '',
    allergies: '',
    specialNeeds: '',
    subsidyStatus: '',
    enrollmentDate: '',
    enrollmentStatus: 'New',
    endDate: '',
  });

  const [newParent, setNewParent] = useState<NewParentInput>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    passwordHash: '',
    childIds: [],
    street: '',
    city: '',
    province: '',
    country: '',
    emergencyContact: '',
    updatedAt: '',
    preferredLanguage: '',
  });

  const [newClass, setNewClass] = useState<NewClassInput>({
    name: '',
    locationId: '',
    capcity: 0,
    volume: 0,
    ageStart: 0,
    ageEnd: 0,
  });

  // // --- Firestore subscription: Teachers
  // useEffect(() => {
  //   // Build a query for stable ordering (optional)
  //   const q = query(collection(db, 'teachers'), orderBy('firstName'));

  //   // Subscribe to Firestore in real-time
  //   const unsubscribe = onSnapshot(q, (snap) => {
  //     const rows: Types.Teacher[] = snap.docs.map((doc) => {
  //       const d = doc.data() as Omit<Types.Teacher, 'id'>;
  //       return {
  //         id: doc.id, // use doc id as primary key
  //         role: 'teacher',
  //         firstName: d.firstName ?? '',
  //         lastName: d.lastName ?? '',
  //         email: d.email ?? '',
  //         phone: d.phone ?? '',
  //         classIds: Array.isArray(d.classIds) ? (d.classIds as string[]) : [],
  //         locationId: d.locationId ?? '',
  //         startDate: d.startDate ?? '',
  //         endDate: d.endDate ?? undefined,
  //       };
  //     });
  //     setTeachers(rows);
  //   });

  //   // Cleanup subscription on unmount
  //   return () => unsubscribe();
  // }, []);

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
  }, [newTeacher]) // changes depend on newTeacher

  // --- Actions
  const addTeacher = async () => {
    try {
      // Persist to Firestore; id doc is generated by server
      await addDoc(collection(db, 'teachers'), {
        role: 'teacher',
        ...newTeacher, 
        endDate: newTeacher.endDate || null // 
      });
      // setTeachers([...teachers, {...newTeacher, role: "teacher", id: ""}]); this teachers should is from Firebase fetching 

      // Reset form; list updates automatically via onSnapshot
      setNewTeacher({ 
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        classIds: [],
        locationId: '',
        startDate: '',
        endDate: undefined,
      });
      // Success Alert
      alert(`New teacher added: ${newTeacher.firstName} ${newTeacher.lastName}`);
    } catch (e) {
      console.error(e);
      alert('Failed to add teacher. Please try again.');
    }
  };

  const addChild = () => {
    // Local-only example; can be migrated to Firestore with same pattern

    const child: Types.Child = {
      id: String(children.length + 1),
      firstName: newChild.firstName,
      lastName: newChild.lastName,
      birthDate: newChild.birthDate,
      parentId: newChild.parentIdsCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      classId: newChild.classId,
      allergies: newChild.allergies || undefined,
      specialNeeds: newChild.specialNeeds || undefined,
      subsidyStatus: newChild.subsidyStatus || undefined,
      enrollmentDate: newChild.enrollmentDate,
      enrollmentStatus: newChild.enrollmentStatus,
      endDate: newChild.endDate || undefined,
    };
    setChildren((p) => [...p, child]);
    setNewChild({
      firstName: '',
      lastName: '',
      birthDate: '',
      parentIdsCsv: '',
      classId: '',
      allergies: '',
      specialNeeds: '',
      subsidyStatus: '',
      enrollmentDate: '',
      enrollmentStatus: 'New',
      endDate: '',
    });
  };


  const addParent = () => {
    // Local-only example; can be migrated to Firestore

    const parent: Types.Parent = {
      id: String(parents.length + 1),
      role: 'parent',
      createdAt: new Date().toISOString(),
      ...newParent,
    };
    setParents((p) => [...p, parent]);

    setNewParent({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      passwordHash: '',
      childIds: [],
      street: '',
      city: '',
      province: '',
      country: '',
      emergencyContact: '',
      updatedAt: '',
      preferredLanguage: '',
    });
  };


  const addClass = () => {
    // Local-only example; can be migrated to Firestore
    const cls: Types.Class = { id: String(classes.length + 1), ...newClass };
    setClasses((p) => [...p, cls]);
    setNewClass({
      name: '',
      locationId: '',
      capcity: 0,
      volume: 0,
      ageStart: 0,
      ageEnd: 0,
    });

  };

  return (
    <div style={dash.container}>
      <header style={dash.header}>
        <AppHeader />
        <h1 style={dash.headerTitle}>Admin Dashboard</h1>
        <div style={dash.headerActions}>
          <span style={dash.welcome}>Welcome, Admin</span>
          <button onClick={signOutUser} style={dash.logoutButton}>
            Logout
          </button>
        </div>
      </header>

      <div style={dash.content}>
        <SidebarNav active={activeTab} onChange={setActiveTab} />
        <main style={dash.main}>
          {activeTab === 'overview' && (
            <Overview
              teacherCount={teachers.length}
              childCount={children.length}
              parentCount={parents.length}
              classCount={classes.length}
            />
          )}

          {activeTab === 'teachers' && (
            <TeachersTab
              teachers={teachers}
              newTeacher={newTeacher}
              setNewTeacher={setNewTeacher}
              onAdd={addTeacher}
            />

         
          )}

          {activeTab === 'children' && (
            <ChildrenTab
              classes={classes}
              parents={parents}
              childList={children} // avoid reserved prop "children"
              newChild={newChild}
              setNewChild={setNewChild}
              onAdd={addChild}
            />
          )}

          {activeTab === 'parents' && (
            <ParentsTab
              parents={parents}
              newParent={newParent}
              setNewParent={setNewParent}
              onAdd={addParent}
            />
          )}

          {activeTab === 'classes' && (
            <ClassesTab
              classes={classes}
              teachers={teachers}
              newClass={newClass}
              setNewClass={setNewClass}
              onAdd={addClass}
            />
          )}
        </main>
      </div>
    </div>
  );
}
