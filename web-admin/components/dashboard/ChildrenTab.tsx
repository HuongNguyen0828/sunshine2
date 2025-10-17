// web-admin/components/dashboard/ChildrenTab.tsx
"use client";

import * as Types from "../../../shared/types/type";
import { useEffect, useMemo, useState } from "react";

/** UI form input for create/update (server가 daycareId를 주입) */
export type NewChildInput = {
  firstName: string;
  lastName: string;
  birthDate: string;   // YYYY-MM-DD
  parentId: string[];
  classId?: string;
  locationId?: string;
  notes?: string;
};

type ParentLite = { id: string; firstName?: string; lastName?: string; email?: string };

/** Admin scope에 따른 Location UI 제어 */
type LocationControl =
  | { mode: "fixed"; fixedLocationId?: string; options?: Array<{ id: string; name?: string }> }
  | { mode: "select"; fixedLocationId?: undefined; options: Array<{ id: string; name?: string }> }
  | { mode: "none"; fixedLocationId?: undefined; options?: Array<{ id: string; name?: string }> };

type Props = {
  childrenData: Types.Child[];
  classes: Types.Class[];
  parents: ParentLite[];

  locationControl: LocationControl;
  daycareIdForInfo?: string;

  newChild: NewChildInput;
  setNewChild: React.Dispatch<React.SetStateAction<NewChildInput>>;

  createChild: (input: NewChildInput) => Promise<Types.Child | null>;
  updateChild: (id: string, patch: Partial<NewChildInput>) => Promise<Types.Child | null>;
  deleteChild: (id: string) => Promise<boolean>;

  onAssign?: (childId: string, classId: string) => Promise<boolean> | boolean;
  onUnassign?: (childId: string) => Promise<boolean> | boolean;

  onLinkParent?: (childId: string, parentUserId: string) => Promise<boolean> | boolean;
  onUnlinkParent?: (childId: string, parentUserId: string) => Promise<boolean> | boolean;
  onLinkParentByEmail?: (childId: string, email: string) => Promise<boolean> | boolean;

  onCreated?: (c: Types.Child) => void;
  onUpdated?: (c: Types.Child) => void;
  onDeleted?: (id: string) => void;
};

/* ---------- helpers ---------- */

function formatAge(birthISO: string): string {
  const dob = new Date(birthISO);
  if (Number.isNaN(dob.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years -= 1;
  if (years < 1) {
    const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    return `${Math.max(0, months)} mo`;
  }
  return `${years} yr`;
}

function classLabel(classes: Types.Class[], classId?: string): string {
  if (!classId) return "—";
  const found = classes.find((c) => c.id === classId);
  return found ? found.name : classId;
}

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

function computeStatus(parentIds?: string[], classId?: string): Types.EnrollmentStatus {
  const hasParent = Array.isArray(parentIds) && parentIds.length > 0;
  const hasClass = Boolean(classId);
  if (hasParent && hasClass) return Types.EnrollmentStatus.Active;
  if (hasParent || hasClass) return Types.EnrollmentStatus.Waitlist;
  return Types.EnrollmentStatus.New;
}

/* ---------- component ---------- */

export default function ChildrenTab(props: Props) {
  const {
    childrenData,
    classes,
    parents,
    locationControl,
    daycareIdForInfo,
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
  } = props;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Types.Child | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Types.EnrollmentStatus | "all">("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [assignChildId, setAssignChildId] = useState<string | null>(null);
  const [assignClassId, setAssignClassId] = useState<string>("");

  const [linkChildId, setLinkChildId] = useState<string | null>(null);
  const [parentEmail, setParentEmail] = useState<string>("");
  const [unlinkParentId, setUnlinkParentId] = useState<string>("");

  /* Prefill location when opening Add modal */
  useEffect(() => {
    if (!isFormOpen || editingChild) return;
    setNewChild((p) => {
      if (locationControl.mode === "fixed") {
        return { ...p, locationId: locationControl.fixedLocationId ?? "" };
      }
      if (locationControl.mode === "select") {
        // 의도적으로 ""로 시작해서 사용자가 고르게 한다
        return { ...p, locationId: "" };
      }
      return { ...p, locationId: "" };
    });
  }, [isFormOpen, editingChild, locationControl, setNewChild]);

  /* filters + pagination */
  const filtered = useMemo(() => {
    return childrenData.filter((c) => {
      const q = searchTerm.trim().toLowerCase();
      const okSearch =
        q.length === 0 ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q);
      if (!okSearch) return false;

      if (statusFilter !== "all" && c.enrollmentStatus !== statusFilter) return false;

      if (classFilter !== "all") {
        if (classFilter === "unassigned") return !c.classId;
        return c.classId === classFilter;
      }
      return true;
    });
  }, [childrenData, searchTerm, statusFilter, classFilter]);

  const perPage = 9;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, (page - 1) * perPage + perPage);

  /* openers */
  function openAdd() {
    setEditingChild(null);
    setNewChild({
      firstName: "",
      lastName: "",
      birthDate: "",
      parentId: [],
      classId: "",
      locationId: "",
      notes: "",
    });
    setIsFormOpen(true);
  }

  function openEdit(c: Types.Child) {
    setEditingChild(c);
    setNewChild({
      firstName: c.firstName,
      lastName: c.lastName,
      birthDate: c.birthDate,
      parentId: c.parentId ?? [],
      classId: c.classId ?? "",
      locationId: c.locationId ?? "",
      notes: c.notes ?? "",
    });
    setIsFormOpen(true);
  }

  /* submit */
  async function submitForm(e: React.FormEvent) {
    e.preventDefault();

    const payload: NewChildInput = {
      ...newChild,
      firstName: (newChild.firstName ?? "").trim(),
      lastName: (newChild.lastName ?? "").trim(),
      birthDate: newChild.birthDate,
      parentId: Array.isArray(newChild.parentId) ? newChild.parentId : [],
      classId: newChild.classId?.trim() || undefined,
      locationId:
        locationControl.mode === "fixed"
          ? (locationControl.fixedLocationId ?? undefined)
          : (newChild.locationId?.trim() || undefined),
      notes: newChild.notes?.trim() || undefined,
    };

    if (editingChild) {
      const patch: Partial<NewChildInput> = {
        firstName: payload.firstName,
        lastName: payload.lastName,
        birthDate: payload.birthDate,
        parentId: payload.parentId,
        locationId: payload.locationId,
        notes: payload.notes,
      };
      const up = await updateChild(editingChild.id, patch);
      if (up && onUpdated) onUpdated(up);
      setEditingChild(null);
    } else {
      const created = await createChild(payload);
      if (created && onCreated) onCreated(created);
    }
    setIsFormOpen(false);
  }

  async function removeChild(c: Types.Child) {
    if (!confirm(`Delete ${c.firstName} ${c.lastName}?`)) return;
    const ok = await deleteChild(c.id);
    if (ok && onDeleted) onDeleted(c.id);
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

  /* ---------- render ---------- */

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-3xl font-bold text-gray-800">Children</h2>
          <button
            onClick={openAdd}
            className="bg-gray-800 hover:bg-gray-900 text-white font-medium px-4 py-2 rounded-lg shadow-sm text-sm"
          >
            + Add Child
          </button>
        </div>
        {daycareIdForInfo && (
          <div className="text-xs text-gray-500 mb-3">
            Daycare scope: <span className="font-medium">{daycareIdForInfo}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by name…"
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

      {/* Grid */}
      {pageItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {pageItems.map((child) => {
            const cls = classes.find((c) => c.id === child.classId);
            const cap = classCapacityBadge(cls);
            const status = computeStatus(child.parentId, child.classId);

            return (
              <div
                key={child.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5 flex flex-col"
              >
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

                <div className="space-y-2 mb-4">
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

                  {/* Parents */}
                  {child.parentId && child.parentId.length > 0 ? (
                    <div className="text-xs text-gray-600">
                      Parents:{" "}
                      {child.parentId.map((pid, idx) => {
                        const p = parents.find((pp) => pp.id === pid);
                        const name = p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() : pid;
                        return (
                          <span key={pid} className="mr-2">
                            {name}
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

                {/* Actions */}
                <div className="mt-auto pt-4 border-t border-gray-200 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openEdit(child)}
                    className="px-3 py-2 rounded-lg text-xs border border-gray-200 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeChild(child)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              page === 1 ? "bg-gray-200 text-gray-400" : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
            }`}
          >
            ← Previous
          </button>
          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-10 h-10 rounded-lg font-medium transition ${
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
            className={`px-4 py-2 rounded-lg font-medium transition ${
              page === totalPages
                ? "bg-gray-200 text-gray-400"
                : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
            }`}
          >
            Next →
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <div
          className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => {
            setIsFormOpen(false);
            setEditingChild(null);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100"
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

            <form onSubmit={submitForm} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">First Name *</span>
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={newChild.firstName}
                    onChange={(e) => setNewChild((p) => ({ ...p, firstName: e.target.value }))}
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Last Name *</span>
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={newChild.lastName}
                    onChange={(e) => setNewChild((p) => ({ ...p, lastName: e.target.value }))}
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Birth Date *</span>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={newChild.birthDate}
                    onChange={(e) => setNewChild((p) => ({ ...p, birthDate: e.target.value }))}
                    required
                  />
                </label>

                {/* Location */}
                {locationControl.mode === "fixed" ? (
                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Location</span>
                    <input
                      value={locationControl.fixedLocationId ?? ""}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                    />
                    <div className="text-xs text-gray-400 mt-1">Fixed by your admin scope.</div>
                  </label>
                ) : locationControl.mode === "select" ? (
                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Location *</span>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={newChild.locationId ?? ""}
                      onChange={(e) => setNewChild((p) => ({ ...p, locationId: e.target.value }))}
                      required
                    >
                      <option value="" disabled>
                        Select a location
                      </option>
                      {locationControl.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name ?? o.id}
                        </option>
                      ))}
                    </select>
                    {daycareIdForInfo && (
                      <div className="text-xs text-gray-400 mt-1">
                        Locations under daycare: <b>{daycareIdForInfo}</b>
                      </div>
                    )}
                  </label>
                ) : (
                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Location ID (optional)</span>
                    <input
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={newChild.locationId ?? ""}
                      onChange={(e) => setNewChild((p) => ({ ...p, locationId: e.target.value }))}
                      placeholder="locationId"
                    />
                  </label>
                )}

                <label className="block md:col-span-2">
                  <span className="text-gray-700 font-medium mb-1 block">Notes</span>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={newChild.notes ?? ""}
                    onChange={(e) => setNewChild((p) => ({ ...p, notes: e.target.value }))}
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
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-6 py-3 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-3 rounded-lg transition"
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
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} — {cap.text}
                    </option>
                  );
                })}
              </select>
              <div className="text-xs text-gray-500">
                If capacity is full, the child will remain in <b>Waitlist</b> until a seat opens.
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
