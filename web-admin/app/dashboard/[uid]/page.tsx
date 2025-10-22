// web-admin/app/dashboard/[uid]/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo, useTransition } from "react";
import AppHeader from "@/components/AppHeader";
import SidebarNav from "@/components/dashboard/SidebarNav";
import Overview from "@/components/dashboard/Overview";
import ParentsTab from "@/components/dashboard/ParentsTab";
import ClassesTab from "@/components/dashboard/ClassesTab";
import SchedulerLabsTab from "@/components/dashboard/SchedulerLabsTab";
import ChildrenTab, { type NewChildInput as ChildFormInput } from "@/components/dashboard/ChildrenTab";
import { dash } from "@/styles/dashboard";
import { useAuth } from "@/lib/auth";
import * as Types from "../../../../shared/types/type";
import type { Tab, NewParentInput, NewClassInput, NewTeacherInput } from "@/types/forms";
import swal from "sweetalert2";
import { fetchTeachers, addTeacher } from "@/services/useTeachersAPI";
import { fetchClasses } from "@/services/useClassesAPI";
import { fetchLocationsLite, type LocationLite } from "@/services/useLocationsAPI";
import {
  fetchChildren as fetchChildrenAPI,
  addChild as addChildAPI,
  updateChild as updateChildAPI,
  deleteChildById as deleteChildAPI,
  assignChildToClass,
  unassignChildFromClass,
  linkParentToChildByEmail,
  unlinkParentFromChild,
  fetchParentsLiteByIds,
  type NewChildInput as APIChildInput,
} from "@/services/useChildrenAPI";
import TeachersTab from "@/components/dashboard/TeachersTab";
import { addParent, fetchParents } from "@/services/useParentsAPI";

/* ---------------- utils ---------------- */

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

type AdminScope =
  | { mode: "select"; daycareId?: string; fixedLocationId?: undefined }
  | { mode: "fixed"; daycareId?: string; fixedLocationId: string }
  | { mode: "none"; daycareId?: string; fixedLocationId?: undefined };

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
function getAdminScopeFromUser(u: unknown): AdminScope {
  const daycareId = readDaycareId(u);
  const locs = new Set(collectLocationIds(u));
  if (locs.has("*")) return { mode: "select", daycareId };
  if (locs.size === 1) return { mode: "fixed", daycareId, fixedLocationId: Array.from(locs)[0] };
  if (locs.size > 1) return { mode: "select", daycareId };
  return { mode: "none", daycareId };
}

function computeStatus(parentIds?: string[], classId?: string): Types.EnrollmentStatus {
  const hasParent = Array.isArray(parentIds) && parentIds.length > 0;
  const hasClass = Boolean(classId);
  if (hasParent && hasClass) return Types.EnrollmentStatus.Active;
  if (hasParent || hasClass) return Types.EnrollmentStatus.Waitlist;
  return Types.EnrollmentStatus.New;
}

function getErrorMessage(e: unknown, fallback: string): string {
  if (typeof e === "object" && e !== null && "message" in e && typeof (e as { message?: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return fallback;
}

/* ---------------- page ---------------- */

export default function AdminDashboard() {
  const { signOutUser, currentUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [teachers, setTeachers] = useState<Types.Teacher[]>([]);
  const [classes, setClasses] = useState<Types.Class[]>([]);
  const [locations, setLocations] = useState<LocationLite[]>([]);
  const [children, setChildren] = useState<Types.Child[]>([]);
  const [parents, setParents] = useState<Types.Parent[]>([]);
  const [parentLites, setParentLites] = useState<Array<{ id: string; firstName?: string; lastName?: string; email?: string }>>([]);

  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [, startTransition] = useTransition();

  /* forms */
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

  const [newChild, setNewChild] = useState<ChildFormInput>({
    firstName: "",
    lastName: "",
    birthDate: "",
    parentId: [],
    classId: "",
    locationId: "",
    notes: "",
    enrollmentStatus: Types.EnrollmentStatus.New,
  });
  const [newParent, setNewParent] = useState<NewParentInput>({
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
    maritalStatus: "",
    relationshipToChild: ""
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

  const scope = useMemo<AdminScope>(() => getAdminScopeFromUser(currentUser), [currentUser]);

  /* ---------- initial fetch ---------- */

  const initialFetchAll = useCallback(async () => {
    setInitialLoading(true);
    try {
      const childrenQuery =
        scope.mode === "fixed"
          ? { locationId: scope.fixedLocationId }
          : scope.daycareId
            ? { daycareId: scope.daycareId }
            : {};

      const [tchs, clss, locs, kids, prnts] = await Promise.all([
        fetchTeachers(),
        fetchClasses(),
        fetchLocationsLite(),
        fetchChildrenAPI(childrenQuery),
        fetchParents(),
      ]);

      const filteredLocs =
        scope.mode === "fixed"
          ? (locs ?? []).filter((l) => l.id === scope.fixedLocationId)
          : (locs ?? []);

      setTeachers(tchs ?? []);
      setClasses(clss ?? []);
      setLocations(filteredLocs);
      setChildren(kids ?? []);

      const parentIds = Array.from(new Set((kids ?? []).flatMap((c) => (Array.isArray(c.parentId) ? c.parentId : []))));
      const lites = await fetchParentsLiteByIds(parentIds);
      setParentLites(lites);
    } catch (e) {
      console.error(e);
      await swal.fire({ icon: "error", title: "Failed to load", text: "Could not fetch teachers/classes/locations/children." });
    } finally {
      setInitialLoading(false);
    }
  }, [scope.mode, scope.fixedLocationId, scope.daycareId]);

  useEffect(() => {
    if (authLoading || !currentUser) return;
    initialFetchAll();
  }, [authLoading, currentUser, initialFetchAll]);

  /* ---------- lightweight background refreshers ---------- */

  const refetchChildrenLite = useCallback(async () => {
    try {
      const childrenQuery =
        scope.mode === "fixed"
          ? { locationId: scope.fixedLocationId }
          : scope.daycareId
            ? { daycareId: scope.daycareId }
            : {};
      const fresh = await fetchChildrenAPI(childrenQuery);
      setChildren(fresh ?? []);

      const parentIds = Array.from(new Set((fresh ?? []).flatMap((c) => (Array.isArray(c.parentId) ? c.parentId : []))));
      const lites = await fetchParentsLiteByIds(parentIds);
      setParentLites(lites);
    } catch (e) {
      console.error("Background children refresh failed", e);
    }
  }, [scope.mode, scope.fixedLocationId, scope.daycareId]);

  const refetchClassesLite = useCallback(async () => {
    try {
      const clss = await fetchClasses();
      setClasses(clss ?? []);
    } catch (e) {
      console.error("Background classes refresh failed", e);
    }
  }, []);

  /* ---------- helpers ---------- */

  const hasDaycareId = (l: LocationLite): l is LocationLite & { daycareId: string } => typeof (l as { daycareId?: unknown }).daycareId === "string";

  const filteredLocations = useMemo<LocationLite[]>(() => {
    if (scope.mode === "fixed") return locations.filter((l) => l.id === scope.fixedLocationId);
    if (scope.mode === "select") {
      if (scope.daycareId) return locations.filter((l) => hasDaycareId(l) && l.daycareId === scope.daycareId);
      return locations;
    }
    return locations;
  }, [locations, scope]);

  useEffect(() => {
    if (scope.mode === "fixed") {
      setNewClass((p) => ({ ...p, locationId: scope.fixedLocationId }));
    }
  }, [scope.mode, scope.fixedLocationId]);

  /* ---------- teachers ---------- */

  const handleAddTeacher = async () => {
    await addTeacher(newTeacher);
    startTransition(() => {
      initialFetchAll();
    });
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
  };

  /* ---------- children (optimistic) ---------- */

  const createChild = async (input: ChildFormInput): Promise<Types.Child | null> => {
    const payload: APIChildInput = {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      birthDate: input.birthDate,
      parentId: Array.isArray(input.parentId) ? input.parentId : [],
      classId: input.classId?.trim() || undefined,
      locationId: scope.mode === "fixed" ? scope.fixedLocationId : input.locationId?.trim(),
      daycareId: scope.daycareId,
      notes: input.notes?.trim() || undefined,
      enrollmentStatus: input.enrollmentStatus ?? computeStatus(input.parentId, input.classId),
    };

    try {
      const created = await addChildAPI(payload);

      if (created) {
        setChildren((prev) => [created, ...prev]);
        if (created.classId) {
          setClasses((prev) =>
            prev.map((c) => (c.id === created.classId ? { ...c, volume: Math.max(0, (c.volume ?? 0) + 1) } : c))
          );
        }
      } else {
        startTransition(() => {
          refetchChildrenLite();
          refetchClassesLite();
        });
      }
    } finally {
      setNewChild({
        firstName: "",
        lastName: "",
        birthDate: "",
        parentId: [],
        classId: "",
        locationId: "",
        notes: "",
        enrollmentStatus: Types.EnrollmentStatus.New,
      });
    }

    startTransition(() => {
      refetchChildrenLite();
      refetchClassesLite();
    });

    return null;
  };

  const updateChild = async (id: string, patch: Partial<ChildFormInput>): Promise<Types.Child | null> => {
    try {
      const res = await updateChildAPI(id, {
        firstName: patch.firstName?.trim(),
        lastName: patch.lastName?.trim(),
        birthDate: patch.birthDate,
        parentId: Array.isArray(patch.parentId) ? patch.parentId : undefined,
        locationId: scope.mode === "fixed" ? scope.fixedLocationId : patch.locationId?.trim(),
        notes: patch.notes?.trim(),
        enrollmentStatus: patch.enrollmentStatus,
        classId: patch.classId,
      });

      if (res && typeof res === "object") {
        const updated = res as Types.Child;

        const prevChild = children.find(c => c.id === id);
        const prevClassId = prevChild?.classId;
        const nextClassId = updated.classId;

        setChildren(prev => prev.map(c => (c.id === id ? { ...c, ...updated } : c)));

        if (prevClassId !== nextClassId) {
          if (prevClassId) {
            setClasses(prev =>
              prev.map(cls =>
                cls.id === prevClassId ? { ...cls, volume: Math.max(0, (cls.volume ?? 0) - 1) } : cls
              )
            );
          }
          if (nextClassId) {
            setClasses(prev =>
              prev.map(cls =>
                cls.id === nextClassId ? { ...cls, volume: Math.max(0, (cls.volume ?? 0) + 1) } : cls
              )
            );
          }
        }
      } else {
        startTransition(() => {
          refetchChildrenLite();
          refetchClassesLite();
        });
      }
    } catch (e) {
      const msg = getErrorMessage(e, "Failed to update child.");
      alert(msg);
      return null;
    }

    startTransition(() => {
      refetchChildrenLite();
    });

    return null;
  };

  const deleteChild = async (id: string): Promise<boolean> => {
    try {
      const target = children.find((c) => c.id === id);
      await deleteChildAPI(id);

      setChildren((prev) => prev.filter((c) => c.id !== id));
      if (target?.classId) {
        setClasses((prev) =>
          prev.map((cls) => (cls.id === target.classId ? { ...cls, volume: Math.max(0, (cls.volume ?? 0) - 1) } : cls))
        );
      }

      startTransition(() => {
        refetchChildrenLite();
        refetchClassesLite();
      });

      return true;
    } catch (e) {
      const msg = getErrorMessage(e, "Failed to delete child.");
      alert(msg);
      return false;
    }
  };

  const onAssignChild = async (childId: string, classId: string) => {
    try {
      await assignChildToClass(childId, classId);

      const prevChild = children.find((c) => c.id === childId);
      const hadParent = (prevChild?.parentId?.length ?? 0) > 0;

      setChildren((prev) =>
        prev.map((c) =>
          c.id === childId
            ? {
              ...c,
              classId,
              enrollmentStatus: hadParent ? Types.EnrollmentStatus.Active : Types.EnrollmentStatus.Waitlist,
            }
            : c
        )
      );

      setClasses((prev) => prev.map((cls) => (cls.id === classId ? { ...cls, volume: Math.max(0, (cls.volume ?? 0) + 1) } : cls)));

      startTransition(() => {
        refetchChildrenLite();
        refetchClassesLite();
      });

      return true;
    } catch (e: unknown) {
      const msg = getErrorMessage(e, "Failed to assign child. Please try again.");
      alert(msg);
      return false;
    }
  };

  const onUnassignChild = async (childId: string) => {
    try {
      const prevChild = children.find((c) => c.id === childId);
      const prevClassId = prevChild?.classId;

      await unassignChildFromClass(childId);

      setChildren((prev) =>
        prev.map((c) =>
          c.id === childId
            ? {
              ...c,
              classId: undefined,
              enrollmentStatus: (c.parentId?.length ?? 0) > 0 ? Types.EnrollmentStatus.Waitlist : Types.EnrollmentStatus.New,
            }
            : c
        )
      );

      if (prevClassId) {
        setClasses((prev) =>
          prev.map((cls) => (cls.id === prevClassId ? { ...cls, volume: Math.max(0, (cls.volume ?? 0) - 1) } : cls))
        );
      }

      startTransition(() => {
        refetchChildrenLite();
        refetchClassesLite();
      });

      return true;
    } catch {
      alert("Failed to unassign child. Please try again.");
      return false;
    }
  };

  const onLinkParentByEmail = async (childId: string, email: string) => {
    try {
      await linkParentToChildByEmail(childId, email);

      const foundParent = parentLites.find((p) => (p.email ?? "").toLowerCase() === email.toLowerCase());
      if (foundParent) {
        setChildren((prev) =>
          prev.map((c) =>
            c.id === childId
              ? {
                ...c,
                parentId: Array.from(new Set([...(c.parentId ?? []), foundParent.id])),
                enrollmentStatus: c.classId ? Types.EnrollmentStatus.Active : Types.EnrollmentStatus.Waitlist,
              }
              : c
          )
        );
      } else {
        startTransition(() => {
          refetchChildrenLite();
        });
      }

      startTransition(() => {
        refetchChildrenLite();
      });

      return true;
    } catch (e: unknown) {
      const msg = getErrorMessage(e, "Failed to link parent by email.");
      alert(msg);
      return false;
    }
  };

  const onUnlinkParent = async (childId: string, parentUserId: string) => {
    try {
      await unlinkParentFromChild(childId, parentUserId);

      setChildren((prev) =>
        prev.map((c) => {
          if (c.id !== childId) return c;
          const nextParentIds = (c.parentId ?? []).filter((pid) => pid !== parentUserId);
          const nextStatus = c.classId
            ? nextParentIds.length > 0
              ? Types.EnrollmentStatus.Active
              : Types.EnrollmentStatus.Waitlist
            : nextParentIds.length > 0
              ? Types.EnrollmentStatus.Waitlist
              : Types.EnrollmentStatus.New;
          return { ...c, parentId: nextParentIds, enrollmentStatus: nextStatus };
        })
      );

      startTransition(() => {
        refetchChildrenLite();
      });

      return true;
    } catch {
      alert("Failed to unlink parent.");
      return false;
    }
  };

  const handleAddParent = async () => {
    await addParent(newParent);
    // Refresh from server to get latest data,in the background
    await initialFetchAll();
    // Reset form
    setNewParent({
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
      maritalStatus: "",
      relationshipToChild: ""
    });
  };

  /* ---------- classes passthrough ---------- */

  const onClassCreated = (created: Types.Class) => setClasses((prev) => [created, ...prev]);
  const onClassUpdated = (updated: Types.Class) => setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  const onClassDeleted = (id: string) => setClasses((prev) => prev.filter((c) => c.id !== id));
  const onClassAssigned = async () => {
    startTransition(() => {
      refetchClassesLite();
    });
  };

  /* ---------- render ---------- */

  if (authLoading || initialLoading) {
    return <div>Loading</div>;
  }

  return (
    <>
      <div style={dash.container}>
        <header style={dash.header}>
          <AppHeader />
          <h1 style={dash.headerTitle}>Admin Dashboard</h1>
          <div style={dash.headerActions}>
            <span style={dash.welcome}>Welcome, {currentUser?.displayName}</span>
            <button onClick={signOutUser} style={dash.logoutButton}>
              Logout
            </button>
          </div>
        </header>

        <div style={dash.content}>
          <SidebarNav active={activeTab} onChange={setActiveTab} />
          <main style={dash.main}>
            {activeTab === "overview" && (
              <Overview teacherCount={teachers.length} childCount={children.length} parentCount={parents.length} classCount={classes.length} />
            )}

            {activeTab === "teachers" && (
              <TeachersTab
                teachers={teachers}
                newTeacher={newTeacher}
                setNewTeacher={setNewTeacher}
                onAdd={handleAddTeacher}
                locations={filteredLocations}
              />
            )}

            {activeTab === "children" && (
              <ChildrenTab
                childrenData={children}
                classes={classes}
                parents={parentLites}
                locations={filteredLocations}
                newChild={newChild}
                setNewChild={setNewChild}
                createChild={createChild}
                updateChild={updateChild}
                deleteChild={deleteChild}
                onAssign={onAssignChild}
                onUnassign={onUnassignChild}
                onLinkParentByEmail={onLinkParentByEmail}
                onUnlinkParent={onUnlinkParent}
                onCreated={(c) => console.log("created child", c?.id)}
                onUpdated={(c) => console.log("updated child", c?.id)}
                onDeleted={(id) => console.log("deleted child", id)}
              />
            )}

            {
              activeTab === "parents" && (
                <ParentsTab
                  parents={parents}
                  newParent={newParent}
                  setNewParent={setNewParent}
                  onAdd={handleAddParent}
                />
              )
            }

            {
              activeTab === "classes" && (
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
              )
            }

            {activeTab === "scheduler-labs" && <SchedulerLabsTab />}
          </main >
        </div >
      </div >
    </>
  );
}
