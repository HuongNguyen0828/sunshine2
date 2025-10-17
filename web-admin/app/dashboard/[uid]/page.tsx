"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectRoute";
import AppHeader from "@/components/AppHeader";
import SidebarNav from "@/components/dashboard/SidebarNav";
import Overview from "@/components/dashboard/Overview";
import TeachersTab from "@/components/dashboard/TeachersTab";
import ParentsTab from "@/components/dashboard/ParentsTab";
import ClassesTab from "@/components/dashboard/ClassesTab";
import SchedulerLabsTab from "@/components/dashboard/SchedulerLabsTab";
import ChildrenTab, { type NewChildInput as ChildFormInput } from "@/components/dashboard/ChildrenTab";
import { dash } from "@/styles/dashboard";

import { useAuth } from "@/lib/auth";
import * as Types from "../../../../shared/types/type";
import type { Tab, NewTeacherInput, NewParentInput, NewClassInput } from "@/types/forms";

import swal from "sweetalert2";
import { fetchTeachers, addTeacher } from "@/services/useTeachersAPI";
import { fetchClasses } from "@/services/useClassesAPI";
import { fetchLocationsLite, type LocationLite } from "@/services/useLocationsAPI";

/* ---------------- helpers ---------------- */

function getErrMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try { return JSON.stringify(e); } catch { return String(e); }
}

/** Helpers to safely read daycare/location from a loosely-typed user object (no any) */

/** Narrower: generic "object-ish" record */
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/** Convert unknown string or string[] into trimmed string[] */
function toStrArray(x: unknown): string[] {
  if (typeof x === "string") {
    const t = x.trim();
    return t ? [t] : [];
  }
  if (Array.isArray(x)) {
    const out: string[] = [];
    for (const v of x) {
      if (typeof v === "string") {
        const t = v.trim();
        if (t) out.push(t);
      }
    }
    return out;
  }
  return [];
}



/** Admin scope modes for Location UX */
type AdminScope =
  | { mode: "select"; daycareId?: string; fixedLocationId?: undefined } // "*" or multiple
  | { mode: "fixed";  daycareId?: string; fixedLocationId: string }     // exactly one
  | { mode: "none";   daycareId?: string; fixedLocationId?: undefined };

/** Safely get daycareId from user or user.profile */
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

/** Collect all possible location ids from user and profile */
function collectLocationIds(u: unknown): string[] {
  if (!isRecord(u)) return [];
  const locs: string[] = [];

  // top-level
  locs.push(...toStrArray(u["locationId"]));
  locs.push(...toStrArray(u["locationIds"]));

  // under profile
  const prof = u["profile"];
  if (isRecord(prof)) {
    locs.push(...toStrArray(prof["locationId"]));
    locs.push(...toStrArray(prof["locationIds"]));
  }

  // unique + trimmed already
  return Array.from(new Set(locs));
}

/** Decide admin scope using robust readers above */
function getAdminScopeFromUser(u: unknown): AdminScope {
  const daycareId = readDaycareId(u);
  const locs = new Set(collectLocationIds(u));

  if (locs.has("*")) return { mode: "select", daycareId };
  if (locs.size === 1) {
    const only = Array.from(locs)[0];
    return { mode: "fixed", daycareId, fixedLocationId: only };
  }
  if (locs.size > 1) return { mode: "select", daycareId };

  return { mode: "none", daycareId };
}


/** Location options mapper (optionally filter by daycare) */
type LocationOption = { id: string; name?: string };
function toLocationOptions(locs: LocationLite[], daycareId?: string): LocationOption[] {
  return locs
    .filter((l) => {
      if (!daycareId) return true;
      return "daycareId" in l && typeof (l as { daycareId?: string }).daycareId === "string"
        ? (l as { daycareId: string }).daycareId === daycareId
        : true;
    })
    .map((l) => ({
      id: l.id,
      ...(("name" in l && typeof (l as { name?: string }).name === "string") ? { name: (l as { name: string }).name } : {})
    }));
}

/** Local-only status compute (frontend demo) */
function computeStatus(parentIds?: string[], classId?: string): Types.EnrollmentStatus {
  const hasParent = Array.isArray(parentIds) && parentIds.length > 0;
  const hasClass = Boolean(classId);
  if (hasParent && hasClass) return Types.EnrollmentStatus.Active;
  if (hasParent || hasClass) return Types.EnrollmentStatus.Waitlist;
  return Types.EnrollmentStatus.New;
}

/* ---------------- component ---------------- */

export default function AdminDashboard() {
  const { signOutUser, currentUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // server-backed lists
  const [teachers, setTeachers] = useState<Types.Teacher[]>([]);
  const [classes, setClasses] = useState<Types.Class[]>([]);
  const [locations, setLocations] = useState<LocationLite[]>([]);
  // local demo lists
  const [children, setChildren] = useState<Types.Child[]>([]);
  const [parents, setParents] = useState<Types.Parent[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  // forms
  const [newTeacher, setNewTeacher] = useState<NewTeacherInput>({
    firstName: "", lastName: "", email: "", phone: "",
    address1: "", address2: "", city: "", province: "", country: "", postalcode: "",
    classIds: [], locationId: "", startDate: "", endDate: undefined,
  });

  const [newChild, setNewChild] = useState<ChildFormInput>({
    firstName: "", lastName: "", birthDate: "", parentId: [],
    classId: "", locationId: "", notes: "",
  });

  const [newParent, setNewParent] = useState<NewParentInput>({
    firstName: "", lastName: "", email: "", phone: "", passwordHash: "",
    childIds: [], street: "", city: "", province: "", country: "",
    emergencyContact: "", updatedAt: "", preferredLanguage: "",
  });

  const [newClass, setNewClass] = useState<NewClassInput>({
    name: "", locationId: "", capacity: 0, volume: 0, ageStart: 0, ageEnd: 0, classroom: "",
  });

  /* ---- scope & location options ---- */
  const scope = useMemo<AdminScope>(() => getAdminScopeFromUser(currentUser), [currentUser]);

  /* ---- load lists ---- */
  const refreshAll = useCallback(async () => {
  setDataLoading(true);
  try {
    const [tchs, clss, locs] = await Promise.all([
      fetchTeachers(),
      fetchClasses(),
      fetchLocationsLite()
    ]);

    // Filter locations by current admin scope (show only their location)
    const filtered =
      scope.mode === "fixed"
        ? (locs ?? []).filter(l => l.id === scope.fixedLocationId)
        : (locs ?? []);

    setTeachers(tchs ?? []);
    setClasses(clss ?? []);
    setLocations(filtered); //  only admin's location
  } catch (e) {

      console.error(e);
      await swal.fire({ icon: "error", title: "Failed to load", text: "Could not fetch teachers/classes/locations." });
    } finally {
      setDataLoading(false);
    }
  }, [scope.mode, scope.fixedLocationId]);

  useEffect(() => {
    if (authLoading || !currentUser) return;
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      try {
        const [tchs, clss, locs] = await Promise.all([fetchTeachers(), fetchClasses(), fetchLocationsLite()]);
        if (!cancelled) {
          setTeachers(tchs ?? []);
          setClasses(clss ?? []);
          setLocations(locs ?? []);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          await swal.fire({ icon: "error", title: "Failed to load", text: "Could not fetch teachers/classes/locations." });
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, currentUser, refreshAll]);

  // type guard for daycareId on LocationLite
  const hasDaycareId = (l: LocationLite): l is LocationLite & { daycareId: string } =>
    typeof (l as { daycareId?: unknown }).daycareId === "string";

  // Locations filtered by scope (fixed → only one, select → daycare's, none → ALL LOCATIONS)
  const filteredLocations = useMemo<LocationLite[]>(() => {
    if (scope.mode === "fixed") {
      return locations.filter((l) => l.id === scope.fixedLocationId);
    }
    if (scope.mode === "select") {
      if (scope.daycareId) {
        return locations.filter((l) => hasDaycareId(l) && l.daycareId === scope.daycareId);
      }
      return locations;
    }
    // IMPORTANT: previously returned [], which disabled the Add Class button.
    return locations;
  }, [locations, scope]);

  // Prefill new class location if fixed
  useEffect(() => {
    if (scope.mode === "fixed") {
      setNewClass((p) => ({ ...p, locationId: scope.fixedLocationId }));
    }
  }, [scope.mode, scope.fixedLocationId]);

  /* ---- teachers ---- */
  const handleAddTeacher = async () => {
    const optimistic: Types.Teacher = {
      id: `tmp-${Date.now()}`,
      firstName: newTeacher.firstName, lastName: newTeacher.lastName,
      email: newTeacher.email, phone: newTeacher.phone,
      address1: newTeacher.address1, address2: newTeacher.address2 || "",
      city: newTeacher.city, province: newTeacher.province, country: newTeacher.country,
      postalcode: newTeacher.postalcode || "", classIds: newTeacher.classIds ?? [],
      locationId: newTeacher.locationId || "", startDate: newTeacher.startDate, endDate: newTeacher.endDate,
    };
    setTeachers((prev) => [optimistic, ...prev]);
    try {
      await addTeacher(newTeacher);
      setNewTeacher({
        firstName: "", lastName: "", email: "", phone: "",
        address1: "", address2: "", city: "", province: "", country: "", postalcode: "",
        classIds: [], locationId: "", startDate: "", endDate: undefined,
      });
      await refreshAll();
    } catch (err) {
      await swal.fire({ icon: "error", title: "Failed to add", text: getErrMsg(err) });
      await refreshAll();
    }
  };

  /* ---- children (demo-local) ---- */
  const createChildLocal = async (input: ChildFormInput): Promise<Types.Child | null> => {
    const locationId =
      scope.mode === "fixed" ? scope.fixedLocationId :
      scope.mode === "select" ? (input.locationId?.trim() || undefined) :
      (input.locationId?.trim() || undefined);

    const parentId = Array.isArray(input.parentId) ? input.parentId : [];
    const classId = input.classId?.trim() || undefined;

    const child: Types.Child = {
      id: `child-${Date.now()}`,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      birthDate: input.birthDate,
      parentId,
      classId,
      locationId,
      daycareId: scope.daycareId ?? "",
      enrollmentStatus: computeStatus(parentId, classId),
      notes: input.notes?.trim() || undefined,
    };
    setChildren((prev) => [child, ...prev]);

    setNewChild({ firstName: "", lastName: "", birthDate: "", parentId: [], classId: "", locationId: "", notes: "" });
    return child;
  };

  const updateChildLocal = async (
    id: string,
    patch: Partial<ChildFormInput>
  ): Promise<Types.Child | null> => {
    let updated: Types.Child | null = null;
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const nextParent = Array.isArray(patch.parentId) ? patch.parentId : c.parentId ?? [];
        const nextClassId = c.classId;
        const nextLoc = scope.mode === "fixed" ? scope.fixedLocationId : patch.locationId?.trim() ?? c.locationId;

        updated = {
          ...c,
          firstName: patch.firstName?.trim() ?? c.firstName,
          lastName: patch.lastName?.trim() ?? c.lastName,
          birthDate: patch.birthDate ?? c.birthDate,
          parentId: nextParent,
          locationId: nextLoc,
          notes: patch.notes?.trim() ?? c.notes,
          enrollmentStatus: computeStatus(nextParent, nextClassId),
        };
        return updated!;
      })
    );
    return updated;
  };

  const deleteChildLocal = async (id: string): Promise<boolean> => {
    setChildren((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  /* ---- parents (demo-local) ---- */
  const addParent = () => {
    const parent: Types.Parent = {
      id: String(parents.length + 1),
      role: "parent",
      createdAt: new Date().toISOString(),
      ...newParent,
    };
    setParents((p) => [parent, ...p]);
    setNewParent({
      firstName: "", lastName: "", email: "", phone: "", passwordHash: "",
      childIds: [], street: "", city: "", province: "", country: "",
      emergencyContact: "", updatedAt: "", preferredLanguage: "",
    });
  };

  /* ---- classes sync ---- */
  const onClassCreated = (created: Types.Class) => setClasses((prev) => [created, ...prev]);
  const onClassUpdated = (updated: Types.Class) => setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  const onClassDeleted = (id: string) => setClasses((prev) => prev.filter((c) => c.id !== id));
  const onClassAssigned = async () => { await refreshAll(); };

  if (authLoading || dataLoading) {
    return (
      <ProtectedRoute>
        <div>Loading...</div>
      </ProtectedRoute>
    );
  }

  // Build location control prop for ChildrenTab
  const locationControlProp =
    scope.mode === "fixed"
      ? ({ mode: "fixed", fixedLocationId: scope.fixedLocationId } as const)
      : scope.mode === "select"
      ? ({ mode: "select", options: toLocationOptions(filteredLocations, scope.daycareId) } as const)
      : ({ mode: "none" } as const);

  return (
    <ProtectedRoute>
      <div style={dash.container}>
        {/* Header */}
        <header style={dash.header}>
          <AppHeader />
          <h1 style={dash.headerTitle}>Admin Dashboard</h1>
          <div style={dash.headerActions}>
            <span style={dash.welcome}>Welcome, Admin</span>
            <button onClick={signOutUser} style={dash.logoutButton}>Logout</button>
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
                childrenData={children}
                classes={classes}
                parents={parents.map((p) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, email: p.email }))}
                locationControl={locationControlProp}
                daycareIdForInfo={scope.daycareId}
                newChild={newChild}
                setNewChild={setNewChild}
                createChild={createChildLocal}
                updateChild={updateChildLocal}
                deleteChild={deleteChildLocal}
                onCreated={(c) => console.log("created child", c.id)}
                onUpdated={(c) => console.log("updated child", c.id)}
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
