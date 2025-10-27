// web-admin/components/dashboard/ClassesTab.tsx
"use client";

import * as Types from "../../../shared/types/type";
import type { NewClassInput } from "@/types/forms";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { LocationLite } from "@/services/useLocationsAPI";
import {
  addClass as apiAddClass,
  updateClass as apiUpdateClass,
  deleteClass as apiDeleteClass,
  assignTeachersToClass,
  fetchTeacherCandidates,
  type TeacherCandidate,
} from "@/services/useClassesAPI";

type Props = {
  classes: Types.Class[];
  teachers: Types.Teacher[];
  locations: LocationLite[];
  newClass: NewClassInput;
  setNewClass: React.Dispatch<React.SetStateAction<NewClassInput>>;
  onCreated?: (created: Types.Class) => void;
  onUpdated?: (updated: Types.Class) => void;
  onDeleted?: (id: string) => void;
  onAssigned?: () => Promise<void> | void;
};

/** Narrowing helper for optional status. */
function hasStatus(obj: unknown): obj is { status?: string } {
  return typeof obj === "object" && obj !== null && "status" in obj;
}

/** Narrowing helper for optional locationId without using any. */
function hasLocationId(obj: unknown): obj is { locationId?: string } {
  return typeof obj === "object" && obj !== null && "locationId" in obj;
}

/** Resolve class by id. */
function getClassById(list: Types.Class[], id?: string | null): Types.Class | undefined {
  if (!id) return undefined;
  return list.find(c => c.id === id);
}

export default function ClassesTab({
  classes,
  teachers,
  locations,
  newClass,
  setNewClass,
  onCreated,
  onUpdated,
  onDeleted,
  onAssigned,
}: Props) {
  // UI state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [capacityFilter, setCapacityFilter] =
    useState<"all" | "available" | "nearly-full" | "full">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingClass, setEditingClass] = useState<Types.Class | null>(null);

  // Assign modal state
  const [showAssignTeachers, setShowAssignTeachers] = useState<string | null>(null);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<TeacherCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Draft autosave for "Add Class" form
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Restore draft when opening "Add" (not for edit)
  useEffect(() => {
    if (isFormOpen && !editingClass) {
      const draft = sessionStorage.getItem("class-form-draft");
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setNewClass(parsed);
          setIsDraftRestored(true);
        } catch {
          /* ignore */
        }
      }
    }
  }, [isFormOpen, editingClass, setNewClass]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  /** Local form updater with debounced draft save for "Add" */
  const updateClass = useCallback(
    (updates: Partial<NewClassInput>) => {
      setNewClass(prev => {
        const updated = { ...prev, ...updates };
        if (!editingClass) {
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(() => {
            sessionStorage.setItem("class-form-draft", JSON.stringify(updated));
          }, 500);
        }
        return updated;
      });
    },
    [editingClass, setNewClass]
  );

  /** Clear local draft (optionally reset fields) */
  const clearDraft = useCallback(
    (resetFields = false) => {
      sessionStorage.removeItem("class-form-draft");
      setIsDraftRestored(false);
      if (resetFields) {
        setNewClass({
          name: "",
          locationId: (locations ?? [])[0]?.id ?? "",
          capacity: 0,
          volume: 0,
          ageStart: 0,
          ageEnd: 0,
          classroom: "",
        });
      }
    },
    [locations, setNewClass]
  );

  /** Capacity helpers */
  const getCapacityStatus = (volume: number, capacity: number) => {
    if (capacity <= 0) return "available";
    const percentage = (volume / capacity) * 100;
    if (percentage < 70) return "available";
    if (percentage < 90) return "nearly-full";
    return "full";
  };
  const getCapacityColor = (status: string) =>
    status === "available" ? "bg-green-500" : status === "nearly-full" ? "bg-yellow-500" : "bg-red-500";

  /** Location label helper */
  const getLocationLabel = (locId?: string) => {
    if (!locId) return "—";
    const found = (locations ?? []).find(l => l.id === locId);
    return found?.name || locId;
  };

  /** Initials for avatars */
  const getTeacherInitials = (firstName?: string, lastName?: string) => {
    const a = (firstName?.trim()?.[0] ?? "").toUpperCase();
    const b = (lastName?.trim()?.[0] ?? "").toUpperCase();
    return (a + b) || "T";
  };

  /** Client-side search/filter */
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      const locName = (locations ?? []).find(l => l.id === cls.locationId)?.name || "";
      const matches =
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cls.locationId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        locName.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matches) return false;
      if (capacityFilter === "all") return true;
      const status = getCapacityStatus(cls.volume, cls.capacity);
      return status === capacityFilter;
    });
  }, [classes, locations, searchTerm, capacityFilter]);

  // Pagination
  const classesPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / classesPerPage));
  const startIndex = (currentPage - 1) * classesPerPage;
  const paginatedClasses = filteredClasses.slice(startIndex, startIndex + classesPerPage);

  /** Create / Update class submit */
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedLoc = (newClass.locationId ?? "").trim();
    if (!trimmedLoc) {
      alert("Please select a location.");
      return;
    }

    if (editingClass) {
      const updated = await apiUpdateClass(editingClass.id, {
        ...newClass,
        locationId: trimmedLoc,
      });
      if (updated) onUpdated?.(updated);
      setEditingClass(null);
    } else {
      const created = await apiAddClass({
        ...newClass,
        locationId: trimmedLoc,
      });
      if (created) onCreated?.(created);
    }

    setNewClass({
      name: "",
      locationId: "",
      capacity: 0,
      volume: 0,
      ageStart: 0,
      ageEnd: 0,
      classroom: "",
    });
    clearDraft();
    setIsFormOpen(false);
  }

  /** Open Add modal */
  function handleAddClick() {
    if ((locations ?? []).length === 0) {
      alert("No locations available. Please create a location first.");
      return;
    }
    setEditingClass(null);
    setNewClass({
      name: "",
      locationId: locations[0]?.id ?? "",
      capacity: 0,
      volume: 0,
      ageStart: 0,
      ageEnd: 0,
      classroom: "",
    });
    setIsFormOpen(true);
  }

  /** Open Edit modal */
  function handleEditClick(cls: Types.Class) {
    setEditingClass(cls);
    setNewClass({
      name: cls.name,
      locationId: cls.locationId,
      capacity: cls.capacity,
      volume: cls.volume,
      ageStart: cls.ageStart,
      ageEnd: cls.ageEnd,
      classroom: cls.classroom || "",
    });
    setIsFormOpen(true);
  }

  /** Delete a class */
  async function handleDeleteClick(cls: Types.Class) {
    const ok = window.confirm(`Delete class "${cls.name}"?`);
    if (!ok) return;
    const success = await apiDeleteClass(cls.id);
    if (success) onDeleted?.(cls.id);
  }

  /**
   * Open Assign modal.
   * Fetch teacher candidates filtered by this class's location (server-enforced).
   */
  async function openAssign(classId: string) {
    setShowAssignTeachers(classId);
    setLoadingCandidates(true);
    try {
      const cls = getClassById(classes, classId);

      const candidates = await fetchTeacherCandidates({
        onlyNew: true,
        classId, // server derives location and enforces scope
        // locationId: cls?.locationId, // optional explicit filter
      });
      setTeacherOptions(candidates);

      // Preselect currently assigned teachers
      const pre: string[] = Array.isArray((cls as unknown as { teacherIds?: string[] })?.teacherIds)
        ? ((cls as unknown as { teacherIds?: string[] }).teacherIds as string[])
        : teachers.filter(t => (t.classIds || []).includes(classId)).map(t => t.id);

      // Ensure currently assigned (non-New) teachers appear in the list
      const candidateIds = new Set(candidates.map(c => c.id));
      const extras: TeacherCandidate[] = [];
      for (const id of pre) {
        if (!candidateIds.has(id)) {
          const fromProps = teachers.find(t => t.id === id);
          if (fromProps) {
            const status =
              hasStatus(fromProps) && typeof fromProps.status === "string" ? fromProps.status : "Active";
            extras.push({
              id,
              firstName: fromProps.firstName,
              lastName: fromProps.lastName,
              email: fromProps.email,
              status,
              classIds: fromProps.classIds ?? [],
              locationId: hasLocationId(fromProps) ? fromProps.locationId : undefined,
            });
          }
        }
      }
      if (extras.length > 0) setTeacherOptions(prev => [...prev, ...extras]);

      setSelectedTeachers(pre);
    } finally {
      setLoadingCandidates(false);
    }
  }

  /**
   * Save assignment.
   * Backend strictly enforces teacher.locationId === class.locationId.
   */
  async function handleSaveTeachers() {
    if (!showAssignTeachers || isAssigning) return;
    try {
      setIsAssigning(true);
      const ok = await assignTeachersToClass(showAssignTeachers, selectedTeachers);
      if (ok) {
        await onAssigned?.();
        setShowAssignTeachers(null);
        setSelectedTeachers([]);
      }
    } finally {
      setIsAssigning(false);
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header + Filters */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-gray-800">Classes</h2>
          <button
            onClick={handleAddClick}
            className="bg-gray-700 hover:bg-gray-800 text-white font-medium px-4 py-2 rounded-lg transition duration-200 flex items-center gap-2 text-sm shadow-sm"
            title={(locations ?? []).length === 0 ? "No locations available" : "Add class"}
          >
            <span className="text-lg">+</span>
            Add Class
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by class name or location..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={capacityFilter}
              onChange={e => {
                setCapacityFilter(e.target.value as typeof capacityFilter);
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-400"
            >
              <option value="all">All Capacities</option>
              <option value="available">Available (&lt;70%)</option>
              <option value="nearly-full">Nearly Full (70-90%)</option>
              <option value="full">Full (&gt;90%)</option>
            </select>

            <div className="text-gray-500 text-xs whitespace-nowrap">
              {filteredClasses.length} of {classes.length}
            </div>
          </div>
        </div>

        {(searchTerm || capacityFilter !== "all") && (
          <button
            onClick={() => {
              setSearchTerm("");
              setCapacityFilter("all");
              setCurrentPage(1);
            }}
            className="mb-4 text-gray-500 hover:text-gray-700 text-xs"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Cards */}
      {paginatedClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {paginatedClasses.map(cls => {
            const assigned = teachers.filter(t => (t.classIds || []).includes(cls.id));
            const capacityStatus = getCapacityStatus(cls.volume, cls.capacity);
            const capacityPct = Math.min(100, Math.round((cls.volume / (cls.capacity || 1)) * 100));

            return (
              <div
                key={cls.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5 flex flex-col"
              >
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-800 truncate mb-2">{cls.name}</h3>
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <span>📍</span>
                    <span className="truncate">{getLocationLabel(cls.locationId)}</span>
                  </div>
                </div>

                {capacityStatus === "full" && (
                  <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm font-medium">
                    ⚠️ Class is at full capacity
                  </div>
                )}

                <div className="space-y-3 mb-4 flex-grow">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-sm">👶 Age Range:</span>
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {cls.ageStart}–{cls.ageEnd} years
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-600 text-sm">Capacity:</span>
                      <span className="text-gray-800 font-semibold text-sm">
                        {cls.volume}/{cls.capacity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 ${getCapacityColor(capacityStatus)} transition-all duration-300`}
                        style={{ width: `${capacityPct}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {Math.round(capacityPct)}% {capacityStatus === "full" ? "(Full)" : ""}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-500 text-xs mb-1">Teachers</div>
                    {assigned.length > 0 ? (
                      <div className="text-sm text-gray-700">
                        {assigned.slice(0, 2).map(t => (
                          <span key={t.id} className="block text-xs">
                            {t.firstName} {t.lastName}
                          </span>
                        ))}
                        {assigned.length > 2 && (
                          <span className="text-xs text-gray-400">+{assigned.length - 2} more</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Unassigned</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => openAssign(cls.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-lg transition duration-200 text-sm"
                  >
                    Assign
                  </button>
                  <button
                    onClick={() => handleEditClick(cls)}
                    className="flex-1 bg-white/60 backdrop-blur-sm border border-gray-200 hover:bg-white/80 hover:border-gray-300 text-gray-700 font-medium px-3 py-2 rounded-lg transition-all duration-200 text-xs shadow-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(cls)}
                    className="flex-1 bg-white/60 backdrop-blur-sm border border-gray-200 hover:bg-white/80 hover:border-red-300 text-gray-700 hover:text-red-600 font-medium px-3 py-2 rounded-lg transition-all duration-200 text-xs shadow-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">🎓</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No classes found</h3>
          <p className="text-gray-500">
            {searchTerm || capacityFilter !== "all"
              ? "Try adjusting your search or filter settings"
              : "Get started by adding your first class"}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${currentPage === 1
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
              }`}
          >
            ← Previous
          </button>
          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded-lg font-medium transition duration-200 ${currentPage === page ? "bg-gray-800 text-white" : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
                  }`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${currentPage === totalPages
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
              }`}
          >
            Next →
          </button>
        </div>
      )}

      {/* Add/Edit modal */}
      {isFormOpen && (
        <div
          className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => {
            setIsFormOpen(false);
            setEditingClass(null);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {editingClass ? "Edit Class" : "Add New Class"}
                </h3>
                {isDraftRestored && !editingClass && (
                  <p className="text-xs text-green-600 mt-1">✓ Draft restored</p>
                )}
              </div>
              <button
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingClass(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Class Name *</span>
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Class Name"
                    value={newClass.name}
                    onChange={e => updateClass({ name: e.target.value })}
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Location *</span>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={newClass.locationId ?? ""}
                    onChange={e => updateClass({ locationId: e.target.value })}
                    required
                    disabled={(locations ?? []).length <= 1}
                  >
                    {(locations ?? []).length > 1 && <option value="" disabled>Select a location</option>}
                    {(locations ?? []).map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name || l.id}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Capacity *</span>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Capacity"
                      value={newClass.capacity}
                      onChange={e => updateClass({ capacity: Number(e.target.value) })}
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Volume *</span>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Volume"
                      value={newClass.volume}
                      onChange={e => updateClass({ volume: Number(e.target.value) })}
                      required
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Age Start *</span>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Age Start"
                      value={newClass.ageStart}
                      onChange={e => updateClass({ ageStart: Number(e.target.value) })}
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Age End *</span>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Age End"
                      value={newClass.ageEnd}
                      onChange={e => updateClass({ ageEnd: Number(e.target.value) })}
                      required
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Classroom (optional)</span>
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Room name / number"
                    value={newClass.classroom || ""}
                    onChange={e => updateClass({ classroom: e.target.value })}
                  />
                </label>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingClass(null);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-6 py-3 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                {!editingClass && (
                  <button
                    type="button"
                    onClick={() => clearDraft(true)}
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
                  {editingClass ? "Update Class" : "Add Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Teachers modal */}
      {showAssignTeachers && (
        <div
          className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowAssignTeachers(null);
            setSelectedTeachers([]);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Assign Teachers</h3>
              <button
                onClick={() => {
                  setShowAssignTeachers(null);
                  setSelectedTeachers([]);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-600 text-sm mb-4">
                Select teachers for this class. Only teachers from the same location are shown.
              </p>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loadingCandidates ? (
                  <div className="text-center py-8 text-gray-500">Loading teachers…</div>
                ) : teacherOptions.length > 0 ? (
                  teacherOptions.map(t => (
                    <label
                      key={t.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition duration-150"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeachers.includes(t.id)}
                        onChange={() =>
                          setSelectedTeachers(prev =>
                            prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                          )
                        }
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {getTeacherInitials(t.firstName, t.lastName)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {t.firstName ?? "—"} {t.lastName ?? ""}
                        </div>
                        <div className="text-sm text-gray-500">{t.email ?? ""}</div>
                        {t.status && <div className="text-xs text-gray-400">Status: {t.status}</div>}
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No teachers available
                    <div className="text-xs mt-1">
                      Save with an empty selection to auto-assign NEW teachers in this location.
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAssignTeachers(null);
                    setSelectedTeachers([]);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-6 py-3 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTeachers}
                  disabled={isAssigning}
                  className={`flex-1 ${isAssigning ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                    } text-white font-medium px-6 py-3 rounded-lg transition duration-200`}
                >
                  {isAssigning ? "Saving..." : `Save (${selectedTeachers.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
