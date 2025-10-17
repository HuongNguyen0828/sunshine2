// web-admin/components/dashboard/ChildrenTab.tsx
"use client";

import React, { useMemo, useState } from "react";
import * as Types from "../../../shared/types/type";
import type { LocationLite } from "@/services/useLocationsAPI";

/** UI form input used when creating/updating a child */
export type NewChildInput = {
  firstName: string;
  lastName: string;
  birthDate: string;         // YYYY-MM-DD
  parentId: string[];        // list of parent user ids
  classId?: string;
  locationId?: string;       // selected location id
  notes?: string;
};

type ParentLite = { id: string; firstName?: string; lastName?: string; email?: string };

type Props = {
  /** lists */
  childrenData: Types.Child[];
  classes: Types.Class[];
  parents: ParentLite[];

  /** admin-scoped locations (filtered in page.tsx like ClassesTab) */
  locations: LocationLite[];

  /** form state controlled by page.tsx */
  newChild: NewChildInput;
  setNewChild: React.Dispatch<React.SetStateAction<NewChildInput>>;

  /** data ops (local or api) */
  createChild: (input: NewChildInput) => Promise<Types.Child | null>;
  updateChild: (id: string, patch: Partial<NewChildInput>) => Promise<Types.Child | null>;
  deleteChild: (id: string) => Promise<boolean>;

  /** optional callbacks (enable the card actions) */
  onAssign?: (childId: string, classId: string) => Promise<boolean> | boolean;
  onUnassign?: (childId: string) => Promise<boolean> | boolean;

  onLinkParent?: (childId: string, parentUserId: string) => Promise<boolean> | boolean;
  onUnlinkParent?: (childId: string, parentUserId: string) => Promise<boolean> | boolean;
  onLinkParentByEmail?: (childId: string, email: string) => Promise<boolean> | boolean;

  onCreated?: (c: Types.Child) => void;
  onUpdated?: (c: Types.Child) => void;
  onDeleted?: (id: string) => void;
};

/* ---------------- helpers ---------------- */

/** Format age text from ISO birth date */
function formatAge(birthISO: string): string {
  const dob = new Date(birthISO);
  if (Number.isNaN(dob.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years -= 1;
  if (years < 1) {
    const months =
      (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    return `${Math.max(0, months)} mo`;
  }
  return `${years} yr`;
}

/** Find class name by id */
function classLabel(classes: Types.Class[], classId?: string): string {
  if (!classId) return "—";
  const found = classes.find((c) => c.id === classId);
  return found?.name ?? classId;
}

/** Get location name by id (fallback to id) */
function getLocationLabel(locs: LocationLite[], id?: string): string {
  if (!id) return "—";
  const found = (locs ?? []).find((l) => l.id === id);
  return found?.name || id;
}

/** Local fallback: compute status if the server field is absent */
function computeStatus(parentIds?: string[], classId?: string): Types.EnrollmentStatus {
  const hasParent = Array.isArray(parentIds) && parentIds.length > 0;
  const hasClass = Boolean(classId);
  if (hasParent && hasClass) return Types.EnrollmentStatus.Active;
  if (hasParent || hasClass) return Types.EnrollmentStatus.Waitlist;
  return Types.EnrollmentStatus.New;
}

/** Derive capacity text + bar level from a class */
function classCapacityBadge(
  cls?: Types.Class
): { text: string; pct: number; level: "ok" | "warn" | "full" } {
  if (!cls) return { text: "—", pct: 0, level: "ok" };
  const cap = Math.max(1, cls.capacity ?? 0);
  const v = cls.volume ?? 0;
  const pct = Math.round((v / cap) * 100);
  if (pct >= 95 || v >= cap) return { text: `${v}/${cls.capacity} (Full)`, pct, level: "full" };
  if (pct >= 70) return { text: `${v}/${cls.capacity} (High)`, pct, level: "warn" };
  return { text: `${v}/${cls.capacity}`, pct, level: "ok" };
}

/** Is a class full by capacity? */
function isClassFull(cls?: Types.Class): boolean {
  if (!cls) return false;
  const cap = Math.max(0, cls.capacity ?? 0);
  const v = Math.max(0, cls.volume ?? 0);
  return cap > 0 && v >= cap;
}

/* ---------------- component ---------------- */

export default function ChildrenTab({
  childrenData,
  classes,
  parents,
  locations,
  newChild,
  setNewChild,
  createChild,
  updateChild,
  deleteChild,
  onAssign,
  onUnassign,
  onLinkParent,
  onUnlinkParent,
  onLinkParentByEmail,
  onCreated,
  onUpdated,
  onDeleted,
}: Props) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Types.Child | null>(null);

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<Types.EnrollmentStatus | "all">("all");
  const [classFilter, setClassFilter] = useState<string>("all");

  // pagination
  const [page, setPage] = useState(1);

  // assign modal
  const [assignChildId, setAssignChildId] = useState<string | null>(null);
  const [assignClassId, setAssignClassId] = useState<string>("");

  // link/unlink parent
  const [linkChildId, setLinkChildId] = useState<string | null>(null);
  const [parentEmail, setParentEmail] = useState<string>("");
  const [unlinkParentId, setUnlinkParentId] = useState<string>("");

  /* -------- openers -------- */

  // Open "Add" modal – mirror ClassesTab UX for location select
  function handleAddClick() {
    if ((locations ?? []).length === 0) {
      alert("No locations available. Please create a location first.");
      return;
    }
    setEditingChild(null);
    setNewChild({
      firstName: "",
      lastName: "",
      birthDate: "",
      parentId: [],
      classId: "",
      locationId: locations[0]?.id ?? "",
      notes: "",
    });
    setIsFormOpen(true);
  }

  // Open "Edit" modal
  function handleEditClick(child: Types.Child) {
    setEditingChild(child);
    setNewChild({
      firstName: child.firstName,
      lastName: child.lastName,
      birthDate: child.birthDate,
      parentId: child.parentId ?? [],
      classId: child.classId ?? "",
      locationId: child.locationId ?? (locations[0]?.id ?? ""),
      notes: child.notes ?? "",
    });
    setIsFormOpen(true);
  }

  /* -------- CRUD submit -------- */

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedLoc = (newChild.locationId ?? "").trim();
    if ((locations ?? []).length > 0 && !trimmedLoc) {
      alert("Please select a location.");
      return;
    }

    if (editingChild) {
      const updated = await updateChild(editingChild.id, {
        firstName: newChild.firstName.trim(),
        lastName: newChild.lastName.trim(),
        birthDate: newChild.birthDate,
        parentId: Array.isArray(newChild.parentId) ? newChild.parentId : [],
        classId: newChild.classId?.trim() || undefined,
        locationId: trimmedLoc || undefined,
        notes: newChild.notes?.trim() || undefined,
      });
      if (updated) onUpdated?.(updated);
      setEditingChild(null);
    } else {
      const created = await createChild({
        firstName: newChild.firstName.trim(),
        lastName: newChild.lastName.trim(),
        birthDate: newChild.birthDate,
        parentId: Array.isArray(newChild.parentId) ? newChild.parentId : [],
        classId: newChild.classId?.trim() || undefined,
        locationId: trimmedLoc || undefined,
        notes: newChild.notes?.trim() || undefined,
      });
      if (created) onCreated?.(created);
    }

    setNewChild({
      firstName: "",
      lastName: "",
      birthDate: "",
      parentId: [],
      classId: "",
      locationId: "",
      notes: "",
    });
    setIsFormOpen(false);
  }

  async function handleDeleteClick(child: Types.Child) {
    const ok = window.confirm(`Delete "${child.firstName} ${child.lastName}"?`);
    if (!ok) return;
    const success = await deleteChild(child.id);
    if (success) onDeleted?.(child.id);
  }

  async function linkParentByEmail(childId: string, email: string): Promise<boolean> {
    if (onLinkParentByEmail) return !!(await onLinkParentByEmail(childId, email));
    const parent = parents.find(
      (p) => (p.email ?? "").toLowerCase() === email.trim().toLowerCase()
    );
    if (!parent) {
      alert("Parent not found by that email.");
      return false;
    }
    return !!(await onLinkParent?.(childId, parent.id));
  }

  /* -------- list + filters + pagination -------- */

  const filtered = useMemo(() => {
    return childrenData.filter((c) => {
      const q = searchTerm.trim().toLowerCase();
      const okSearch =
        q.length === 0 ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        getLocationLabel(locations, c.locationId).toLowerCase().includes(q);
      if (!okSearch) return false;

      if (statusFilter !== "all" && (c.enrollmentStatus ?? computeStatus(c.parentId, c.classId)) !== statusFilter)
        return false;

      if (classFilter !== "all") {
        if (classFilter === "unassigned") return !c.classId;
        return c.classId === classFilter;
      }
      return true;
    });
  }, [childrenData, locations, searchTerm, statusFilter, classFilter]);

  const perPage = 6;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);

  /* ---------------- render ---------------- */

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header + search + filters */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-gray-800">Children</h2>
          <button
            onClick={handleAddClick}
            className="bg-gray-700 hover:bg-gray-800 text-white font-medium px-4 py-2 rounded-lg transition duration-200 flex items-center gap-2 text-sm shadow-sm"
            title={(locations ?? []).length === 0 ? "No locations available" : "Add child"}
          >
            <span className="text-lg">+</span>
            Add Child
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by name or location..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setPage(1);
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg"
            >
              <option value="all">All Status</option>
              <option value={Types.EnrollmentStatus.New}>New</option>
              <option value={Types.EnrollmentStatus.Waitlist}>Waitlist</option>
              <option value={Types.EnrollmentStatus.Active}>Active</option>
            </select>

            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg"
            >
              <option value="all">All Classes</option>
              <option value="unassigned">Unassigned</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="text-gray-500 text-xs whitespace-nowrap">
              {filtered.length} of {childrenData.length}
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      {pageItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {pageItems.map((child) => {
            const cls = classes.find((c) => c.id === child.classId);
            const cap = classCapacityBadge(cls);

            // Prefer server-provided status; compute as fallback
            const status = child.enrollmentStatus ?? computeStatus(child.parentId, child.classId);

            return (
              <div
                key={child.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5 flex flex-col"
              >
                {/* header */}
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 truncate">
                      {child.firstName} {child.lastName}
                    </h3>
                    <span className="text-xs text-gray-500">{formatAge(child.birthDate)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Status:{" "}
                    <span
                      className={
                        status === Types.EnrollmentStatus.Active
                          ? "text-green-600"
                          : status === Types.EnrollmentStatus.Waitlist
                          ? "text-yellow-600"
                          : "text-gray-600"
                      }
                    >
                      {status}
                    </span>
                  </div>
                </div>

                {/* body */}
                <div className="space-y-2 mb-4">
                  <div className="text-xs text-gray-500">📍 {getLocationLabel(locations, child.locationId)}</div>

                  <div className="text-sm text-gray-600">
                    Class: <span className="font-medium">{classLabel(classes, child.classId)}</span>
                  </div>

                  {cls && (
                    <div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Capacity</span>
                        <span>{cap.text}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 ${
                            cap.level === "full"
                              ? "bg-red-500"
                              : cap.level === "warn"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${cap.pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* parents */}
                  {child.parentId && child.parentId.length > 0 ? (
                    <div className="text-xs text-gray-600">
                      Parents:{" "}
                      {child.parentId.map((pid, idx) => {
                        const p = parents.find((pp) => pp.id === pid);
                        const label =
                          (p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() : "") ||
                          p?.email ||
                          pid;
                        return (
                          <span key={pid} className="mr-2">
                            {label}
                            {idx < child.parentId.length - 1 ? "," : ""}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">No parent linked</div>
                  )}

                  {child.notes && (
                    <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded p-2">
                      {child.notes}
                    </div>
                  )}
                </div>

                {/* actions */}
                <div className="mt-auto pt-4 border-t border-gray-200 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleEditClick(child)}
                    className="px-3 py-2 rounded-lg text-xs border border-gray-200 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(child)}
                    className="px-3 py-2 rounded-lg text-xs border border-gray-200 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                  >
                    Delete
                  </button>

                  <button
                    onClick={() => setLinkChildId(child.id)}
                    className="px-3 py-2 rounded-lg text-xs border border-gray-200 hover:bg-gray-50"
                  >
                    Link Parent
                  </button>

                  {child.classId ? (
                    <button
                      onClick={() => onUnassign?.(child.id)}
                      className="px-3 py-2 rounded-lg text-xs bg-gray-700 text-white hover:bg-gray-800"
                    >
                      Unassign
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setAssignChildId(child.id);
                        setAssignClassId("");
                      }}
                      className="px-3 py-2 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700"
                    >
                      Assign
                    </button>
                  )}

                  {/* quick unlink */}
                  {child.parentId && child.parentId.length > 0 && (
                    <div className="col-span-2 flex items-center gap-2">
                      <select
                        value={unlinkParentId}
                        onChange={(e) => setUnlinkParentId(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs"
                      >
                        <option value="">Select parent to unlink</option>
                        {child.parentId.map((pid) => {
                          const p = parents.find((pp) => pp.id === pid);
                          const label =
                            (p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() : "") ||
                            p?.email ||
                            pid;
                          return (
                            <option key={pid} value={pid}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        onClick={() => unlinkParentId && onUnlinkParent?.(child.id, unlinkParentId)}
                        disabled={!unlinkParentId}
                        className={`px-3 py-2 rounded-lg text-xs ${
                          unlinkParentId
                            ? "bg-white border border-gray-200 hover:bg-gray-50"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        Unlink
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">🧒</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No children found</h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== "all" || classFilter !== "all"
              ? "Try adjusting your search or filter settings"
              : "Get started by adding your first child"}
          </p>
        </div>
      )}

      {/* pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${
              page === 1
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
            }`}
          >
            ← Previous
          </button>
          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-10 h-10 rounded-lg font-medium transition duration-200 ${
                  page === n ? "bg-gray-800 text-white" : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${
              page === totalPages
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
            }`}
          >
            Next →
          </button>
        </div>
      )}

      {/* Add / Edit modal */}
      {isFormOpen && (
        <div
          className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => {
            setIsFormOpen(false);
            setEditingChild(null);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-height-[90vh] overflow-y-auto border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-800">
                {editingChild ? "Edit Child" : "Add New Child"}
              </h3>
              <button
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingChild(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">First Name *</span>
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={newChild.firstName}
                    onChange={(e) => setNewChild({ ...newChild, firstName: e.target.value })}
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Last Name *</span>
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={newChild.lastName}
                    onChange={(e) => setNewChild({ ...newChild, lastName: e.target.value })}
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">
                    Birth Date *
                  </span>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={newChild.birthDate}
                    onChange={(e) => setNewChild({ ...newChild, birthDate: e.target.value })}
                    required
                  />
                </label>

                {/* Location — identical UX to ClassesTab */}
                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Location *</span>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={newChild.locationId ?? ""}
                    onChange={(e) => setNewChild({ ...newChild, locationId: e.target.value })}
                    required
                    disabled={(locations ?? []).length <= 1}
                  >
                    {(locations ?? []).length > 1 && (
                      <option value="" disabled>
                        Select a location
                      </option>
                    )}
                    {(locations ?? []).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name || l.id}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block md:col-span-2">
                  <span className="text-gray-700 font-medium mb-1 block">Notes</span>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={newChild.notes ?? ""}
                    onChange={(e) => setNewChild({ ...newChild, notes: e.target.value })}
                    placeholder="Allergies / Special needs / Subsidy status / Remarks"
                  />
                </label>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingChild(null);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-6 py-3 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                {!editingChild && (
                  <button
                    type="button"
                    onClick={clearDraft}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-6 py-3 rounded-lg transition duration-200 text-sm"
                  >
                    Clear Draft
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-3 rounded-lg transition duration-200"
                  title={(locations ?? []).length === 0 ? "No locations available" : "Submit"}
                >
                  {editingChild ? "Update Child" : "Add Child"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignChildId && (
        <div
          className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => {
            setAssignChildId(null);
            setAssignClassId("");
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Select Class</h3>
              <button
                onClick={() => {
                  setAssignChildId(null);
                  setAssignClassId("");
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={assignClassId}
                onChange={(e) => setAssignClassId(e.target.value)}
              >
                <option value="">— Choose class —</option>
                {classes.map((c) => {
                  const cap = classCapacityBadge(c);
                  const full = isClassFull(c);
                  return (
                    <option key={c.id} value={c.id} disabled={full}>
                      {c.name} — {cap.text}
                    </option>
                  );
                })}
              </select>
              <div className="text-xs text-gray-500">
                Full classes are disabled. If a class is full, the child should remain on <b>Waitlist</b>.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setAssignChildId(null);
                  setAssignClassId("");
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!assignChildId || !assignClassId) return;
                  const targetClass = classes.find((c) => c.id === assignClassId);
                  if (isClassFull(targetClass)) {
                    alert("This class is full. Please choose another class.");
                    return;
                  }
                  const ok = await onAssign?.(assignChildId, assignClassId);
                  if (ok) {
                    setAssignChildId(null);
                    setAssignClassId("");
                  }
                }}
                disabled={!assignClassId}
                className={`flex-1 ${
                  assignClassId ? "bg-green-600 hover:bg-green-700" : "bg-green-400 cursor-not-allowed"
                } text-white font-medium px-4 py-2 rounded-lg`}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Parent by Email Modal */}
      {linkChildId && (
        <div
          className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => {
            setLinkChildId(null);
            setParentEmail("");
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Link Parent by Email</h3>
              <button
                onClick={() => {
                  setLinkChildId(null);
                  setParentEmail("");
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <input
                type="email"
                placeholder="parent@example.com"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <div className="text-xs text-gray-500 mt-2">
                Enter the parent&apos;s email to link their account.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setLinkChildId(null);
                  setParentEmail("");
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!linkChildId || !parentEmail.trim()) return;
                  const ok = await linkParentByEmail(linkChildId, parentEmail.trim());
                  if (ok) {
                    setLinkChildId(null);
                    setParentEmail("");
                  }
                }}
                disabled={!parentEmail.trim()}
                className={`flex-1 ${
                  parentEmail.trim()
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-blue-400 cursor-not-allowed"
                } text-white font-medium px-4 py-2 rounded-lg`}
              >
                Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
