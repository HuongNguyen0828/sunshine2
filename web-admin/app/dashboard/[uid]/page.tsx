// web-admin/app/dashboard/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectRoute";
import AppHeader from "@/components/AppHeader";
import SidebarNav from "@/components/dashboard/SidebarNav";
import Overview from "@/components/dashboard/Overview";
import TeachersTab from "@/components/dashboard/TeachersTab";
import ChildrenTab from "@/components/dashboard/ChildrenTab";
import ParentsTab from "@/components/dashboard/ParentsTab";
import ClassesTab from "@/components/dashboard/ClassesTab";
import SchedulerLabsTab from "@/components/dashboard/SchedulerLabsTab";
import { dash } from "@/styles/dashboard";

import { useAuth } from "@/lib/auth";
import * as Types from "../../../../shared/types/type";
import type {
  Tab,
  NewTeacherInput,
  NewChildInput,
  NewParentInput,
  NewClassInput,
} from "@/types/forms";

import swal from "sweetalert2";
import { fetchTeachers, addTeacher } from "@/services/useTeachersAPI";
import { fetchClasses } from "@/services/useClassesAPI";
import { fetchLocationsLite, type LocationLite } from "@/services/useLocationsAPI";

export default function AdminDashboard() {
  const { signOutUser, currentUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Server-backed data (teachers/classes/locations)
  const [teachers, setTeachers] = useState<Types.Teacher[]>([]);
  const [classes, setClasses] = useState<Types.Class[]>([]);
  const [locations, setLocations] = useState<LocationLite[]>([]);

  // Local demo data (children/parents) — not persisted to backend
  const [children, setChildren] = useState<Types.Child[]>([]);
  const [parents, setParents] = useState<Types.Parent[]>([]);

  // Forms state (lifted to parent so tabs can read/write)
  const [newTeacher, setNewTeacher] = useState<NewTeacherInput>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    country: "",
    postalcode: "",
    classIds: [],
    locationId: "",
    startDate: "",
    endDate: undefined,
  });

  const [newChild, setNewChild] = useState<NewChildInput>({
    firstName: "",
    lastName: "",
    birthDate: "",
    parentIdsCsv: "",
    classId: "",
    allergies: "",
    specialNeeds: "",
    subsidyStatus: "",
    enrollmentDate: "",
    enrollmentStatus: "New",
    endDate: "",
  });

  const [newParent, setNewParent] = useState<NewParentInput>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    passwordHash: "",
    childIds: [],
    street: "",
    city: "",
    province: "",
    country: "",
    emergencyContact: "",
    updatedAt: "",
    preferredLanguage: "",
  });

  const [newClass, setNewClass] = useState<NewClassInput>({
    name: "",
    locationId: "",
    capacity: 0,
    volume: 0,
    ageStart: 0,
    ageEnd: 0,
    classroom: "",
  });

  // Global loading for initial and manual refreshes
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  // Fetch teachers/classes/locations (used both on mount and after updates)
  const refreshAll = useCallback(async () => {
    setDataLoading(true);
    try {
      const [tchs, clss, locs] = await Promise.all([
        fetchTeachers(),
        fetchClasses(),
        fetchLocationsLite(),
      ]);
      setTeachers(tchs ?? []);
      setClasses(clss ?? []);
      setLocations(locs ?? []);
    } catch (e) {
      console.error(e);
      await swal.fire({
        icon: "error",
        title: "Failed to load",
        text: "Could not fetch teachers/classes/locations.",
      });
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Initial load after auth is ready
  useEffect(() => {
    if (authLoading || !currentUser) return;

    let cancelled = false;
    (async () => {
      setDataLoading(true);
      try {
        const [tchs, clss, locs] = await Promise.all([
          fetchTeachers(),
          fetchClasses(),
          fetchLocationsLite(),
        ]);
        if (!cancelled) {
          setTeachers(tchs ?? []);
          setClasses(clss ?? []);
          setLocations(locs ?? []);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          await swal.fire({
            icon: "error",
            title: "Failed to load",
            text: "Could not fetch teachers/classes/locations.",
          });
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, currentUser]);

  // Create teacher (optimistic UI)
  const handleAddTeacher = async () => {
    const optimistic: Types.Teacher = {
      id: `tmp-${Date.now()}`,
      firstName: newTeacher.firstName,
      lastName: newTeacher.lastName,
      email: newTeacher.email,
      phone: newTeacher.phone,
      address1: newTeacher.address1,
      address2: newTeacher.address2 || "",
      city: newTeacher.city,
      province: newTeacher.province,
      country: newTeacher.country,
      postalcode: newTeacher.postalcode || "",
      classIds: newTeacher.classIds ?? [],
      locationId: newTeacher.locationId || "",
      startDate: newTeacher.startDate,
      endDate: newTeacher.endDate,
    };

    setTeachers((prev) => [optimistic, ...prev]);

    try {
      const created = await addTeacher(newTeacher);
      if (created) {
        setTeachers((prev) => [created, ...prev.filter((t) => t.id !== optimistic.id)]);
        setNewTeacher({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          address1: "",
          address2: "",
          city: "",
          province: "",
          country: "",
          postalcode: "",
          classIds: [],
          locationId: "",
          startDate: "",
          endDate: undefined,
        });
        await swal.fire({
          icon: "success",
          title: "New Teacher",
          text: `Successfully added: ${created.firstName} ${created.lastName}`,
        });
      } else {
        setTeachers((prev) => prev.filter((t) => t.id !== optimistic.id));
        await swal.fire({ icon: "error", title: "Add Teacher", text: "Failed to add teacher." });
      }
    } catch (err) {
      console.error(err);
      setTeachers((prev) => prev.filter((t) => t.id !== optimistic.id));
      await swal.fire({ icon: "error", title: "Add Teacher", text: "Failed to add teacher." });
    }
  };

  // Demo-only local adds (children/parents)
  const addChild = () => {
    const child: Types.Child = {
      id: String(children.length + 1),
      firstName: newChild.firstName,
      lastName: newChild.lastName,
      birthDate: newChild.birthDate,
      parentId: newChild.parentIdsCsv
        .split(",")
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
      firstName: "",
      lastName: "",
      birthDate: "",
      parentIdsCsv: "",
      classId: "",
      allergies: "",
      specialNeeds: "",
      subsidyStatus: "",
      enrollmentDate: "",
      enrollmentStatus: "New",
      endDate: "",
    });
  };

  const addParent = () => {
    const parent: Types.Parent = {
      id: String(parents.length + 1),
      role: "parent",
      createdAt: new Date().toISOString(),
      ...newParent,
    };
    setParents((p) => [...p, parent]);
    setNewParent({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      passwordHash: "",
      childIds: [],
      street: "",
      city: "",
      province: "",
      country: "",
      emergencyContact: "",
      updatedAt: "",
      preferredLanguage: "",
    });
  };

  // Classes callbacks: keep local list in sync after CRUD
  const onClassCreated = (created: Types.Class) => {
    setClasses((prev) => [created, ...prev]);
  };
  const onClassUpdated = (updated: Types.Class) => {
    setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };
  const onClassDeleted = (id: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
  };

  // NEW: after teacher assignment, refresh classes/teachers/locations immediately
  const onClassAssigned = async () => {
    await refreshAll();
  };

  // Show a simple loader while fetching initial data
  if (authLoading || dataLoading) {
    return (
      <ProtectedRoute>
        <div>Loading...</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div style={dash.container}>
        {/* App header */}
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

        {/* Main content with sidebar + active tab */}
        <div style={dash.content}>
          <SidebarNav active={activeTab} onChange={setActiveTab} />
          <main style={dash.main}>
            {activeTab === "overview" && (
              <Overview
                teacherCount={teachers.length}
                childCount={children.length}
                parentCount={parents.length}
                classCount={classes.length}
              />
            )}

            {activeTab === "teachers" && (
              <TeachersTab
                teachers={teachers}
                newTeacher={newTeacher}
                setNewTeacher={setNewTeacher}
                onAdd={handleAddTeacher}
              />
            )}

            {activeTab === "children" && (
              <ChildrenTab
                classes={classes}
                parents={parents}
                childList={children}
                newChild={newChild}
                setNewChild={setNewChild}
                onAdd={addChild}
              />
            )}

            {activeTab === "parents" && (
              <ParentsTab
                parents={parents}
                newParent={newParent}
                setNewParent={setNewParent}
                onAdd={addParent}
              />
            )}

            {activeTab === "classes" && (
              <ClassesTab
                classes={classes}
                teachers={teachers}
                locations={locations}
                newClass={newClass}
                setNewClass={setNewClass}
                onCreated={onClassCreated}
                onUpdated={onClassUpdated}
                onDeleted={onClassDeleted}
                onAssigned={onClassAssigned} // Trigger immediate refetch after assignment
              />
            )}

            {activeTab === "scheduler-labs" && <SchedulerLabsTab />}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
