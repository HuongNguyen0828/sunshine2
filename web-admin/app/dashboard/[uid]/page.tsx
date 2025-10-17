// web-admin/app/(whatever)/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectRoute";
import AppHeader from "@/components/AppHeader";
import SidebarNav from "@/components/dashboard/SidebarNav";
import Overview from "@/components/dashboard/Overview";
import ParentsTab from "@/components/dashboard/ParentsTab";
import ClassesTab from "@/components/dashboard/ClassesTab";
import SchedulerLabsTab from "@/components/dashboard/SchedulerLabsTab";
import ChildrenTab, {
  type NewChildInput as ChildFormInput,
} from "@/components/dashboard/ChildrenTab";
import { dash } from "@/styles/dashboard";

import { useAuth } from "@/lib/auth";
import * as Types from "../../../../shared/types/type";
import type { Tab, NewParentInput, NewClassInput } from "@/types/forms";

import swal from "sweetalert2";
import { fetchTeachers } from "@/services/useTeachersAPI";
import { fetchClasses } from "@/services/useClassesAPI";
import {
  fetchLocationsLite,
  type LocationLite,
} from "@/services/useLocationsAPI";

// Firestore Children API (client-side)
import {
  fetchChildren as fetchChildrenAPI,
  addChild as addChildAPI,
  updateChild as updateChildAPI,
  deleteChildById as deleteChildAPI,
  assignChildToClass,
  unassignChildFromClass,
  type NewChildInput as APIChildInput,
} from "@/services/useChildrenAPI";

/* ------------------------------------------------------------------ */
/* Helpers to read admin scope from a loosely typed currentUser object */
/* ------------------------------------------------------------------ */

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function toStrArray(x: unknown): string[] {
  if (typeof x === "string") return x.trim() ? [x.trim()] : [];
  if (Array.isArray(x))
    return Array.from(
      new Set(
        x
          .filter((v): v is string => typeof v === "string")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
  return [];
}

/** Admin scope modes for location UX */
type AdminScope =
  | { mode: "select"; daycareId?: string; fixedLocationId?: undefined } // multiple or "*"
  | { mode: "fixed"; daycareId?: string; fixedLocationId: string } // exactly one location
  | { mode: "none"; daycareId?: string; fixedLocationId?: undefined };

/** Try to read daycareId from user object or its profile */
function readDaycareId(u: unknown): string | undefined {
  if (!isRecord(u)) return undefined;
  const top = u["daycareId"];
  if (typeof top === "string" && top.trim()) return top.trim();
  const prof = u["profile"];
  if (isRecord(prof)) {
    const p = prof["daycareId"];
    if (typeof p === "string" && p.trim()) return p.trim();
  }
  return undefined;
}

/** Collect location ids from user object or its profile */
function collectLocationIds(u: unknown): string[] {
  if (!isRecord(u)) return [];
  const locs = new Set<string>();
  toStrArray(u["locationId"]).forEach((v) => locs.add(v));
  toStrArray(u["locationIds"]).forEach((v) => locs.add(v));
  const prof = u["profile"];
  if (isRecord(prof)) {
    toStrArray(prof["locationId"]).forEach((v) => locs.add(v));
    toStrArray(prof["locationIds"]).forEach((v) => locs.add(v));
  }
  return Array.from(locs);
}

/** Decide admin scope:
 *  - if exactly one location -> fixed
 *  - if multiple or "*" -> select
 *  - else -> none
 */
function getAdminScopeFromUser(u: unknown): AdminScope {
  const daycareId = readDaycareId(u);
  const locs = new Set(collectLocationIds(u));
  if (locs.has("*")) return { mode: "select", daycareId };
  if (locs.size === 1) return { mode: "fixed", daycareId, fixedLocationId: Array.from(locs)[0] };
  if (locs.size > 1) return { mode: "select", daycareId };
  return { mode: "none", daycareId };
}

/** Local-only status calculator (UI fallback if server field is missing) */
function computeStatus(
  parentIds?: string[],
  classId?: string
): Types.EnrollmentStatus {
  const hasParent = Array.isArray(parentIds) && parentIds.length > 0;
  const hasClass = Boolean(classId);
  if (hasParent && hasClass) return Types.EnrollmentStatus.Active;
  if (hasParent || hasClass) return Types.EnrollmentStatus.Waitlist;
  return Types.EnrollmentStatus.New;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function AdminDashboard() {
  const { signOutUser, currentUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // server-backed lists
  const [teachers, setTeachers] = useState<Types.Teacher[]>([]);
  const [classes, setClasses] = useState<Types.Class[]>([]);
  const [locations, setLocations] = useState<LocationLite[]>([]);
  const [children, setChildren] = useState<Types.Child[]>([]);
  // demo/local
  const [parents, setParents] = useState<Types.Parent[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  // form states
  const [newChild, setNewChild] = useState<ChildFormInput>({
    firstName: "",
    lastName: "",
    birthDate: "",
    parentId: [],
    classId: "",
    locationId: "",
    notes: "",
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

  /** Resolve admin scope from currentUser */
  const scope = useMemo<AdminScope>(() => getAdminScopeFromUser(currentUser), [currentUser]);

  /** Fetch everything with scope-aware children query */
  const refreshAll = useCallback(async () => {
    setDataLoading(true);
    try {
      // Children query decision:
      // - admin has exactly one location -> query by that locationId
      // - otherwise -> query by daycareId when available
      const childrenQuery =
        scope.mode === "fixed"
          ? { locationId: scope.fixedLocationId }
          : scope.daycareId
          ? { daycareId: scope.daycareId }
          : {};

      const [tchs, clss, locs, kids] = await Promise.all([
        fetchTeachers(),
        fetchClasses(),
        fetchLocationsLite(),
        fetchChildrenAPI(childrenQuery),
      ]);

      // Narrow visible locations if scope is fixed
      const filteredLocs =
        scope.mode === "fixed"
          ? (locs ?? []).filter((l) => l.id === scope.fixedLocationId)
          : (locs ?? []);

      setTeachers(tchs ?? []);
      setClasses(clss ?? []);
      setLocations(filteredLocs);
      setChildren(kids ?? []);
    } catch (e) {
      console.error(e);
      await swal.fire({
        icon: "error",
        title: "Failed to load",
        text: "Could not fetch teachers/classes/locations/children.",
      });
    } finally {
      setDataLoading(false);
    }
  }, [scope.mode, scope.fixedLocationId, scope.daycareId]);

  /** First load (after auth resolved) */
  useEffect(() => {
    if (authLoading || !currentUser) return;
    refreshAll();
  }, [authLoading, currentUser, refreshAll]);

  /** Type guard for locations that carry daycareId */
  const hasDaycareId = (l: LocationLite): l is LocationLite & { daycareId: string } =>
    typeof (l as { daycareId?: unknown }).daycareId === "string";

  /** Limit location options shown in UI by admin scope (same as ClassesTab) */
  const filteredLocations = useMemo<LocationLite[]>(() => {
    if (scope.mode === "fixed") return locations.filter((l) => l.id === scope.fixedLocationId);
    if (scope.mode === "select") {
      if (scope.daycareId) return locations.filter((l) => hasDaycareId(l) && l.daycareId === scope.daycareId);
      return locations;
    }
    return locations;
  }, [locations, scope]);

  /** Pre-fill new class location when admin is fixed to one location */
  useEffect(() => {
    if (scope.mode === "fixed") {
      setNewClass((p) => ({ ...p, locationId: scope.fixedLocationId }));
    }
  }, [scope.mode, scope.fixedLocationId]);

  /* ------------------------ Children ops (Firestore) ------------------------ */

  /** Create child -> Firestore -> refresh */
  const createChild = async (input: ChildFormInput): Promise<Types.Child | null> => {
    const payload: APIChildInput = {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      birthDate: input.birthDate,
      parentId: Array.isArray(input.parentId) ? input.parentId : [],
      classId: input.classId?.trim() || undefined,
      locationId: scope.mode === "fixed" ? scope.fixedLocationId : input.locationId?.trim(),
      daycareId: scope.daycareId, // ownership for filtering
      notes: input.notes?.trim() || undefined,
    };
    await addChildAPI(payload);
    await refreshAll();
    setNewChild({
      firstName: "",
      lastName: "",
      birthDate: "",
      parentId: [],
      classId: "",
      locationId: "",
      notes: "",
    });
    return null;
  };

  /** Update child -> Firestore -> refresh (return null for now) */
  const updateChild = async (
    id: string,
    patch: Partial<ChildFormInput>
  ): Promise<Types.Child | null> => {
    await updateChildAPI(id, {
      firstName: patch.firstName?.trim(),
      lastName: patch.lastName?.trim(),
      birthDate: patch.birthDate,
      parentId: Array.isArray(patch.parentId) ? patch.parentId : undefined,
      locationId:
        scope.mode === "fixed" ? scope.fixedLocationId : patch.locationId?.trim(),
      notes: patch.notes?.trim(),
    });
    await refreshAll();
    return null;
  };

  /** Delete child -> Firestore -> refresh */
  const deleteChild = async (id: string): Promise<boolean> => {
    await deleteChildAPI(id);
    await refreshAll();
    return true;
  };

  /** Assign to class -> Firestore -> refresh */
  const onAssignChild = async (childId: string, classId: string) => {
    try {
      await assignChildToClass(childId, classId);
      await refreshAll();
      return true;
    } catch (e) {
      console.error(e);
      alert("Failed to assign child. Please try again.");
      return false;
    }
  };

  /** Unassign -> Firestore -> refresh */
  const onUnassignChild = async (childId: string) => {
    try {
      await unassignChildFromClass(childId);
      await refreshAll();
      return true;
    } catch (e) {
      console.error(e);
      alert("Failed to unassign child. Please try again.");
      return false;
    }
  };

  /* ------------------------ Parents (demo/local) ------------------------ */

  const addParent = () => {
    const parent: Types.Parent = {
      id: String(parents.length + 1),
      role: "parent",
      createdAt: new Date().toISOString(),
      ...newParent,
    };
    setParents((p) => [parent, ...p]);
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

  /* ------------------------ Classes sync (unchanged) ------------------------ */

  const onClassCreated = (created: Types.Class) =>
    setClasses((prev) => [created, ...prev]);
  const onClassUpdated = (updated: Types.Class) =>
    setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  const onClassDeleted = (id: string) =>
    setClasses((prev) => prev.filter((c) => c.id !== id));
  const onClassAssigned = async () => {
    await refreshAll();
  };

  if (authLoading || dataLoading) {
    return (
      <ProtectedRoute>
        <div>Loading...</div>
      </ProtectedRoute>
    );
  }

  /* ------------------------ Render ------------------------ */

  return (
    <ProtectedRoute>
      <div style={dash.container}>
        {/* Header */}
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
            {activeTab === "overview" && (
              <Overview
                teacherCount={teachers.length}
                childCount={children.length}
                parentCount={parents.length}
                classCount={classes.length}
              />
            )}

            {activeTab === "children" && (
              <ChildrenTab
                childrenData={children}
                classes={classes}
                parents={parents.map((p) => ({
                  id: p.id,
                  firstName: p.firstName,
                  lastName: p.lastName,
                  email: p.email,
                }))}
                /* Admin-scoped location options */
                locations={filteredLocations}
                newChild={newChild}
                setNewChild={setNewChild}
                createChild={createChild}
                updateChild={updateChild}
                deleteChild={deleteChild}
                /* Enable Assign / Unassign actions */
                onAssign={onAssignChild}
                onUnassign={onUnassignChild}
                onCreated={(c) => console.log("created child", c?.id)}
                onUpdated={(c) => console.log("updated child", c?.id)}
                onDeleted={(id) => console.log("deleted child", id)}
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
                locations={filteredLocations}
                newClass={newClass}
                setNewClass={setNewClass}
                onCreated={onClassCreated}
                onUpdated={onClassUpdated}
                onDeleted={onClassDeleted}
                onAssigned={onClassAssigned}
              />
            )}

            {activeTab === "scheduler-labs" && <SchedulerLabsTab />}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
