"use client";

import * as Types from "../../../shared/types/type";
import {
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
  ChangeEvent,
} from "react";
import type { NewTeacherInput } from "@/types/forms";
import AutoCompleteAddress, { Address } from "@/components/AutoCompleteAddress";
import api from "@/api/client";
import { ENDPOINTS } from "@/api/endpoint";
import { type LocationLite } from "@/services/useLocationsAPI";
import { ClassLite } from "@/app/dashboard/[uid]/page";

export default function TeachersTab({
  teachers,
  setTeachers,
  newTeacher,
  setNewTeacher,
  onAdd,
  locations,
  classesLite,
}: {
  teachers: Types.Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Types.Teacher[]>>;
  newTeacher: NewTeacherInput;
  setNewTeacher: React.Dispatch<React.SetStateAction<NewTeacherInput>>;
  onAdd: (t: NewTeacherInput) => void;
  locations: LocationLite[];
  classesLite?: ClassLite[];
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTeacher, setEditingTeacher] =
    useState<Types.Teacher | null>(null);
  const [rows, setRows] = useState<Types.Teacher[]>(teachers);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [phoneError, setPhoneError] = useState<string>("");

  const defaultLocationView: string = locations.length > 1 ? "all" : locations[0].id;
  const [locationView, setLocationView] =
    useState<string>(defaultLocationView);

  useEffect(() => {
    if (locationView === "all") {
      setRows(teachers);
    } else {
      setRows(teachers.filter((t) => t.locationId === locationView));
    }
  }, [teachers, locationView]);

  const getLocationLabel = (locId?: string) => {
    if (!locId) return "—";
    const found = (locations ?? []).find((l) => l.id === locId);
    return found?.name || locId;
  };

  useEffect(() => {
    if (isFormOpen && !editingTeacher) {
      const draft = sessionStorage.getItem("teacher-form-draft");
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setNewTeacher(parsed);
          setIsDraftRestored(true);
        } catch (e) {
          console.error("Failed to restore draft:", e);
        }
      }
    }
  }, [isFormOpen, editingTeacher, setNewTeacher]);

  const resetForm = useCallback(() => {
    setNewTeacher((prev) => ({
      ...prev,
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
      startDate: "",
      endDate: undefined,
      status: Types.TeacherStatus.New,
      isRegistered: false,
    }));
  }, [setNewTeacher]);

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem("teacher-form-draft");
    setIsDraftRestored(false);
    resetForm();
  }, [resetForm]);

  const updateTeacher = useCallback(
    (updates: Partial<NewTeacherInput>) => {
      setNewTeacher((prev) => {
        const updated = { ...prev, ...updates };

        if (!editingTeacher) {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          saveTimeoutRef.current = setTimeout(() => {
            sessionStorage.setItem(
              "teacher-form-draft",
              JSON.stringify(updated)
            );
          }, 500);
        }

        return updated;
      });
    },
    [editingTeacher, setNewTeacher]
  );

  const handleAddressChange = useCallback(
    (a: Address) => {
      updateTeacher({
        address1: a.address1,
        address2: a.address2,
        city: a.city,
        province: a.province,
        country: a.country,
        postalcode: a.postalcode,
      });
    },
    [updateTeacher]
  );

  const newTeacherAddressValues: Address = {
    address1: newTeacher.address1 || "",
    address2: newTeacher.address2 || "",
    city: newTeacher.city || "",
    province: newTeacher.province || "",
    country: newTeacher.country || "",
    postalcode: newTeacher.postalcode || "",
  };

  const filteredTeachers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return rows.filter(
      (t) =>
        (t.firstName ?? "").toLowerCase().includes(term) ||
        (t.lastName ?? "").toLowerCase().includes(term) ||
        (t.email ?? "").toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  const teachersPerPage = 6;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTeachers.length / teachersPerPage)
  );
  const startIndex = (currentPage - 1) * teachersPerPage;
  const paginatedTeachers = filteredTeachers.slice(
    startIndex,
    startIndex + teachersPerPage
  );

  const handleAddClick = () => {
    setEditingTeacher(null);
    resetForm();
    setNewTeacher((prev) => ({
      ...prev,
      locationId:
        prev.locationId ||
        (locations?.length === 1 ? locations[0].id : prev.locationId || ""),
    }));
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTeacher) {
      const id = editingTeacher.id;
      const updated = await api.put<Types.Teacher>(
        `${ENDPOINTS.teachers}/${id}`,
        { ...newTeacher }
      );
      setRows((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updated } : t))
      );
      // Passing state back to parent component dashboard, to support ClassTab
      setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));

      setEditingTeacher(null);
      clearDraft();
      setIsFormOpen(false);
      return;
    }

    const effectiveLocationId =
      newTeacher.locationId ||
      (locations?.length === 1 ? locations[0].id : "");

    const localId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `tmp-${Date.now()}`;

    const optimistic: Types.Teacher = {
      id: localId,
      firstName: newTeacher.firstName,
      lastName: newTeacher.lastName,
      locationId: effectiveLocationId,
      email: newTeacher.email,
      phone: newTeacher.phone,
      address1: newTeacher.address1,
      address2: newTeacher.address2,
      city: newTeacher.city,
      province: newTeacher.province,
      country: newTeacher.country,
      postalcode: newTeacher.postalcode,
      startDate: newTeacher.startDate,
      endDate: newTeacher.endDate,
      status: newTeacher.status,
      isRegistered: newTeacher.isRegistered,
    };

    setRows((prev) => [optimistic, ...prev]);

    onAdd({
      ...newTeacher,
      locationId: effectiveLocationId,
    });

    clearDraft();
    setIsFormOpen(false);
  };

  const handleEditClick = (teacher: Types.Teacher) => {
    setEditingTeacher(teacher);
    setNewTeacher({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      locationId: teacher.locationId,
      email: teacher.email,
      phone: teacher.phone,
      address1: teacher.address1,
      address2: teacher.address2,
      city: teacher.city,
      province: teacher.province,
      country: teacher.country,
      postalcode: teacher.postalcode,
      startDate: String(teacher.startDate || ""),
      endDate: teacher.endDate ? String(teacher.endDate) : undefined,
      status: teacher.status,
      isRegistered: teacher.isRegistered,
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (teacher: Types.Teacher) => {
    const ok = window.confirm(
      `Are you sure you want to delete ${teacher.firstName} ${teacher.lastName}?`
    );
    if (!ok) return;
    await api.delete<{ ok: boolean; uid: string }>(
      `${ENDPOINTS.teachers}/${teacher.id}`
    );
    setRows((prev) => {
      const next = prev.filter((t) => t.id !== teacher.id);
      const maxPage = Math.max(1, Math.ceil(next.length / teachersPerPage));
      if (currentPage > maxPage) setCurrentPage(maxPage);
      return next;
    });
    // Updating teachers state
    setTeachers(prev => prev.filter(t => t.id !== teacher.id));
  };

  const formatAddress = (teacher: Types.Teacher) => {
    const parts = [
      teacher.address2,
      teacher.address1,
      teacher.city,
      teacher.province,
      teacher.country,
      teacher.postalcode,
    ].filter(Boolean) as string[];
    return parts.join(", ");
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateTeacher({ phone: value });
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(value)) {
      setPhoneError("Phone must be 10 digits");
    } else {
      setPhoneError("");
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex justify-between gap-4">
            <h2 className="text-3xl font-bold text-gray-800">Teachers</h2>
            <select
              className="appearance-none px-4 py-2 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              value={locationView}
              onChange={(e) => {
                setLocationView(e.target.value);
                setCurrentPage(1);
              }}
              required
            >
              <option value="" disabled>
                Select a view location
              </option>
              {(locations ?? []).map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
              {locations.length > 1 && <option value={defaultLocationView}>All locations</option>}
            </select>
          </div>
          <button
            onClick={handleAddClick}
            className="bg-black hover:bg-neutral-900 text-white font-medium px-4 py-2 transition duration-200 flex items-center gap-2 text-sm"
          >
            <span className="text-lg">+</span> Add Teacher
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-white border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:border-neutral-400"
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
          <div className="text-gray-500 text-xs whitespace-nowrap">
            {filteredTeachers.length} of {rows.length}
          </div>
        </div>
      </div>

      {paginatedTeachers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {paginatedTeachers.map((teacher) => (
            <div
              key={teacher.id}
              className="group bg-white border border-neutral-200 hover:border-neutral-400 transition-all duration-200 p-6"
            >
              <div className="mb-5">
                <div className="flex items-baseline gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-slate-800 truncate group-hover:text-neutral-600 transition-colors">
                    {teacher.firstName} {teacher.lastName}
                  </h3>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${
                    teacher.status?.includes('Active') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-50 text-slate-600 border border-slate-100'
                  }`}>
                    {teacher.status}
                  </span>
                </div>
                <div className="text-sm text-slate-500 font-medium">{teacher.email}</div>
              </div>

              <div className="space-y-3 mb-5 pb-5 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide min-w-[60px]">Phone</span>
                  <span className="text-sm text-slate-700 font-medium">
                    {teacher.phone}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide min-w-[60px]">Location</span>
                  <span className="text-sm text-slate-600">
                    {getLocationLabel(teacher.locationId)}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide min-w-[60px]">Address</span>
                  <span className="text-sm text-slate-600 leading-relaxed">
                    {formatAddress(teacher)}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide min-w-[60px]">Period</span>
                  <span className="text-sm text-slate-600">
                    {String(teacher.startDate)}
                    {teacher.endDate ? ` → ${String(teacher.endDate)}` : " → Present"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>Class:</span>
                  {!teacher.classIds || teacher.classIds.length === 0 ? (
                    <span>___</span>
                  ) : (
                    teacher.classIds.map((classId) => {
                      const cls = classesLite?.find((c) => c.id === classId);
                      return (
                        <span key={classId} >
                          {cls ? cls.name : 'Unknown class'}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleEditClick(teacher)}
                  className="flex-1 bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 text-neutral-700 font-medium px-4 py-2.5 transition-all duration-200 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(teacher)}
                  className="flex-1 bg-white border border-neutral-200 hover:bg-red-50 hover:border-red-300 text-neutral-700 hover:text-red-600 font-medium px-4 py-2.5 transition-all duration-200 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No teachers found
          </h3>
          <p className="text-gray-500">
            {searchTerm
              ? "Try adjusting your search terms"
              : "Get started by adding your first teacher"}
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}

            className={`px-4 py-2 font-medium transition duration-200 border ${currentPage === 1
              ? "bg-gray-200 text-gray-400 cursor-not-allowed border-gray-200"
              : "bg-white text-gray-700 hover:bg-gray-100 border-neutral-200"

              }`}
          >
            ← Previous
          </button>
          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 font-medium transition duration-200 border ${currentPage === page
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 hover:bg-gray-100 border-neutral-200"
                  }`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className={`px-4 py-2 font-medium transition duration-200 border ${currentPage === totalPages
              ? "bg-gray-200 text-gray-400 cursor-not-allowed border-gray-200"
              : "bg-white text-gray-700 hover:bg-gray-100 border-neutral-200"
              }`}
          >
            Next →
          </button>
        </div>
      )}

      {isFormOpen && (
        <div
          className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => {
            setIsFormOpen(false);
            setEditingTeacher(null);
          }}
        >
          <div
            className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {editingTeacher ? "Edit Teacher" : "Add New Teacher"}
                </h3>
                {isDraftRestored && !editingTeacher && (
                  <p className="text-xs text-green-600 mt-1">✓ Draft restored</p>
                )}
              </div>
              <button
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingTeacher(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">
                      First Name *
                    </span>
                    <input
                      type="text"
                      className="appearance-none w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="First Name"
                      value={newTeacher.firstName}
                      onChange={(e) =>
                        updateTeacher({ firstName: e.target.value })
                      }
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">
                      Last Name *
                    </span>
                    <input
                      type="text"
                      className="appearance-none w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="Last Name"
                      value={newTeacher.lastName}
                      onChange={(e) =>
                        updateTeacher({ lastName: e.target.value })
                      }
                      required
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">
                    Location *
                  </span>
                  <select
                    className="appearance-none w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    value={newTeacher.locationId}
                    onChange={(e) =>
                      updateTeacher({ locationId: e.target.value })
                    }
                    required
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">
                      Email *
                    </span>
                    <input
                      type="email"
                      className="appearance-none w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="Email"
                      value={newTeacher.email}
                      onChange={(e) =>
                        updateTeacher({ email: e.target.value })
                      }
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">
                      Phone Number *{" "}
                      <span className="text-red-500 text-sm">
                        {phoneError}
                      </span>
                    </span>
                    <input
                      className="appearance-none w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="e.g. 403 111 2284"
                      value={newTeacher.phone}
                      onChange={handlePhoneChange}
                      required
                    />
                  </label>
                </div>

                <div className="block">
                  <AutoCompleteAddress
                    onAddressChanged={handleAddressChange}
                    addressValues={newTeacherAddressValues}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">
                      Status *
                    </span>
                    <select
                      className="appearance-none w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      value={newTeacher.status}
                      onChange={(e) =>
                        updateTeacher({
                          status: e.target.value as Types.TeacherStatus,
                        })
                      }
                      required
                    >
                      <option disabled>Select status</option>
                      <option value={Types.TeacherStatus.New}>New</option>
                      <option value={Types.TeacherStatus.Active}>
                        Active
                      </option>
                      <option value={Types.TeacherStatus.Inactive}>
                        Inactive
                      </option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">
                      Start Date *
                    </span>
                    <input
                      type="date"
                      className="appearance-none w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      value={newTeacher.startDate}
                      onChange={(e) =>
                        updateTeacher({ startDate: e.target.value })
                      }
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">
                      End Date
                    </span>
                    <input
                      type="date"
                      className="appearance-none w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="End Date (optional)"
                      value={newTeacher.endDate || ""}
                      onChange={(e) =>
                        updateTeacher({
                          endDate: e.target.value || undefined,
                        })
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingTeacher(null);
                  }}
                  className="flex-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-medium px-6 py-3 transition duration-200"
                >
                  Cancel
                </button>
                {!editingTeacher && (
                  <button
                    type="button"
                    onClick={() => clearDraft()}
                    className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-medium px-6 py-3 transition duration-200 text-sm"
                  >
                    Clear Draft
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 bg-black hover:bg-neutral-900 text-white font-medium px-6 py-3 transition duration-200"
                >
                  {editingTeacher ? "Update Teacher" : "Add Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
