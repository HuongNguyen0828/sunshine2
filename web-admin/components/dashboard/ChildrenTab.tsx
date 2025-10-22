// web-admin/components/dashboard/ChildrenTab.tsx
"use client";
import * as React from "react";
import * as Types from "../../../shared/types/type";
import { useState, useEffect, useCallback, useRef, useMemo, ChangeEvent } from "react";
import type { LocationLite } from "@/services/useLocationsAPI";
import AutoCompleteAddress, { Address } from "../AutoCompleteAddress";

// For Stepper: Choosing linear bar
//Steppers convey progress through numbered steps. It provides a wizard-like workflow.
import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { NewParentInput } from "@/types/forms";


/** UI form input used when creating/updating a child */
export type NewChildInput = {
  firstName: string;
  lastName: string; // YYYY-MM-DD
  birthDate: string;
  parentId: string[];
  classId?: string;
  locationId?: string;
  notes?: string;
  enrollmentStatus?: Types.EnrollmentStatus;
};

type ParentLite = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type Props = {
  childrenData: Types.Child[];
  classes: Types.Class[];
  parents: ParentLite[];
  locations: LocationLite[];
  newChild: NewChildInput;
  setNewChild: React.Dispatch<React.SetStateAction<NewChildInput>>;
  createChild: (input: NewChildInput) => Promise<Types.Child | null>;
  updateChild: (
    id: string,
    patch: Partial<NewChildInput>
  ) => Promise<Types.Child | null>;
  deleteChild: (id: string) => Promise<boolean>;
  onAssign?: (childId: string, classId: string) => Promise<boolean> | boolean;
  onUnassign?: (childId: string) => Promise<boolean> | boolean;
  onLinkParent?: (childId: string, parentUserId: string) => Promise<boolean> | boolean;
  onUnlinkParent?: (childId: string, parentUserId: string) => Promise<boolean> | boolean;
  onLinkParentByEmail?: (childId: string, email: string) => Promise<boolean> | boolean;
  onCreated?: (c: Types.Child) => void;
  onUpdated?: (c: Types.Child) => void;
  onDeleted?: (id: string) => void;

  newParent: NewParentInput;
  setNewParent: React.Dispatch<React.SetStateAction<NewParentInput>>
  onAddParent: () => void;
};

/* ---------------- helpers ---------------- */

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
  return found?.name ?? classId;
}

function getLocationLabel(locs: LocationLite[], id?: string): string {
  if (!id) return "—";
  const found = (locs ?? []).find((l) => l.id === id);
  return found?.name || id;
}

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

function classCapacityBadge(cls?: Types.Class): {
  text: string;
  pct: number;
  level: "ok" | "warn" | "full";
} {
  if (!cls) return { text: "—", pct: 0, level: "ok" };
  const cap = Math.max(1, cls.capacity ?? 0);
  const v = cls.volume ?? 0;
  const pct = Math.round((v / cap) * 100);
  if (pct >= 95 || v >= cap)
    return { text: `${v}/${cls.capacity} (Full)`, pct, level: "full" };
  if (pct >= 70)
    return { text: `${v}/${cls.capacity} (High)`, pct, level: "warn" };
  return { text: `${v}/${cls.capacity}`, pct, level: "ok" };
}

function isClassFull(cls?: Types.Class): boolean {
  if (!cls) return false;
  const cap = Math.max(0, cls.capacity ?? 0);
  const v = Math.max(0, cls.volume ?? 0);
  return cap > 0 && v >= cap;
}

/* ---------------- child card ---------------- */

type ChildCardProps = {
  gender: string,
  child: Types.Child;
  classes: Types.Class[];
  parents: ParentLite[];
  locations: LocationLite[];
  onEdit: (c: Types.Child) => void;
  onDelete: (c: Types.Child) => void;
  onOpenAssign: (childId: string) => void;
  onUnassign?: (childId: string) => Promise<boolean> | boolean;
  onUnlinkParent?: (childId: string, parentUserId: string) => Promise<boolean> | boolean;
  onOpenLinkByEmail: (childId: string) => void;
};

function ChildCard({
  gender,
  child,
  classes,
  parents,
  locations,
  onEdit,
  onDelete,
  onOpenAssign,
  onUnassign,
  onUnlinkParent,
  onOpenLinkByEmail,
}: ChildCardProps) {
  const cls = classes.find((c) => c.id === child.classId);
  const cap = classCapacityBadge(cls);
  const status = child.enrollmentStatus ?? computeStatus(child.parentId, child.classId);

  const [localUnlinkId, setLocalUnlinkId] = useState<string>("");
  const [localUnlinkLabel, setLocalUnlinkLabel] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5 flex flex-col">
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 truncate">
            {child.firstName} {child.lastName}
          </h3>
          <div className="flex gap-4">
            <span>{gender}</span>
            <span className="text-xs text-gray-500">{formatAge(child.birthDate)}</span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Status:{" "}
          <span
            className={
              status === Types.EnrollmentStatus.Active
                ? "text-green-600"
                : status === Types.EnrollmentStatus.Waitlist
                  ? "text-yellow-600"
                  : status === Types.EnrollmentStatus.Withdraw
                    ? "text-red-600"
                    : "text-gray-600"
            }
          >
            {status}
          </span>
        </div>
      </div>

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
                className={`h-1.5 ${cap.level === "full" ? "bg-red-500" : cap.level === "warn" ? "bg-yellow-500" : "bg-green-500"
                  }`}
                style={{ width: `${cap.pct}%` }}
              />
            </div>
          </div>
        )}

        {child.parentId && child.parentId.length > 0 ? (
          <div className="text-xs text-gray-600">
            Parents{" "}
            {child.parentId.map((pid, idx) => {
              const p = parents.find((pp) => pp.id === pid);
              const label = (p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() : "") || p?.email || pid;
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

        {child.notes && <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded p-2">{child.notes}</div>}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-200 grid grid-cols-2 gap-2">
        <button onClick={() => onEdit(child)} className="px-3 py-2 rounded-lg text-xs border border-gray-200 hover:bg-gray-50">
          Edit
        </button>
        <button
          onClick={() => onDelete(child)}
          className="px-3 py-2 rounded-lg text-xs border border-gray-200 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
        >
          Delete
        </button>

        <button onClick={() => onOpenLinkByEmail(child.id)} className="px-3 py-2 rounded-lg text-xs border border-gray-200 hover:bg-gray-50">
          Link Parent
        </button>

        {child.classId ? (
          <button onClick={() => onUnassign?.(child.id)} className="px-3 py-2 rounded-lg text-xs bg-gray-700 text-white hover:bg-gray-800">
            Unassign
          </button>
        ) : (
          <button onClick={() => onOpenAssign(child.id)} className="px-3 py-2 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700">
            Assign
          </button>
        )}

        {child.parentId && child.parentId.length > 0 && (
          <div className="col-span-2 flex items-start gap-3 min-w-0">
            <div className="relative flex-auto min-w-0">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={menuOpen}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-left pr-9 relative"
              >
                {localUnlinkLabel ? (
                  <span className="text-xs font-medium">{localUnlinkLabel}</span>
                ) : (
                  <span className="block leading-tight text-[11px] text-gray-500">
                    <span className="block">Select parent</span>
                    <span className="block">to unlink</span>
                  </span>
                )}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""
                    }`}
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.114l3.71-3.883a.75.75 0 111.08 1.04l-4.24 4.44a.75.75 0 01-1.08 0l-4.24-4.44a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {menuOpen && (
                <div
                  role="listbox"
                  tabIndex={-1}
                  className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setMenuOpen(false);
                  }}
                >
                  <ul className="max-h-56 overflow-auto">
                    {child.parentId.map((pid) => {
                      const p = parents.find((pp) => pp.id === pid);
                      const label = (p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() : "") || p?.email || pid;
                      const active = localUnlinkId === pid;
                      return (
                        <li
                          key={pid}
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setLocalUnlinkId(pid);
                            setLocalUnlinkLabel(label);
                            setMenuOpen(false);
                          }}
                          className={`px-3 py-2 text-sm cursor-pointer break-words ${active ? "bg-gray-100 text-gray-900" : "hover:bg-gray-50 text-gray-700"
                            }`}
                        >
                          {label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={() => localUnlinkId && onUnlinkParent?.(child.id, localUnlinkId)}
              disabled={!localUnlinkId}
              className={`shrink-0 whitespace-nowrap px-3 py-2 rounded-lg text-xs ${localUnlinkId ? "bg-white border border-gray-200 hover:bg-gray-50" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
            >
              Unlink
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- main component with auto-save draft ---------------- */

const DRAFT_KEY = "child-form-draft";

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

  newParent,
  setNewParent,
  onAddParent,

}: Props) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Types.Child | null>(null);
  const [showAssignClass, setShowAssignClass] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [gender, setGender] = useState<string>("👦"); // boy


  // =========================Progress bar
  const steps = [
    "Child infomation", // 0
    "Parent 1 infomation", // 1
    "Parent 2 infomation", //2 (*Optional)
    "Review and Submit", // 3
  ];
  const [activeStep, setActiveStep] = useState(0); // Start with form 0 (Child infomation)
  const [skipped, setSkipped] = useState(new Set<number>()); // using imutable list of number
  // =======================Done Progress bar

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Types.EnrollmentStatus | "all">("all");
  const [classFilter, setClassFilter] = useState<string>("all");

  const [page, setPage] = useState(1);

  const [assignChildId, setAssignChildId] = useState<string | null>(null);
  const [assignClassId, setAssignClassId] = useState<string>("");

  const [linkChildId, setLinkChildId] = useState<string | null>(null);
  const [parentEmail, setParentEmail] = useState<string>("");


  /// ================From ParentTab
  const [phoneError, setPhoneError] = useState<String>("");
  const [colorChangeError, setColorChangeError] = useState<string>(""); // Initially no error
  const [editingParent, setEditingParent] = useState<Types.Parent | null>(null);
  const [secondParent, setSecondParent] = useState<NewParentInput | null>(null); // Initially Parent2 is null (optional)



  // Restore draft when form opens
  useEffect(() => {
    if (isFormOpen && !editingChild) {
      const draft = sessionStorage.getItem("child-form-draft");
      if (draft) {
        try {
          const parsed = JSON.parse(draft) as NewChildInput;
          setNewChild(parsed);
          setIsDraftRestored(true);
        } catch (e) {
          console.error("Failed to restore draft:", e);
        }
      }
    }
  }, [isFormOpen, editingChild, setNewChild]);

  // Helper to update form and save draft
  const updateDraft = useCallback(
    (patch: Partial<NewChildInput>) => {
      setNewChild((prev) => {
        const updated = { ...prev, ...patch };
        if (!editingChild) {
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(() => {
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
          }, 500);
        }
        return updated;
      });
    },
    [editingChild, setNewChild]
  );

  // Clear draft
  const clearDraft = useCallback(() => {
    sessionStorage.removeItem("child-form-draft");
    setIsDraftRestored(false);
    resetForm(); // clear the form at the same time
  }, []);

  //============ Progress bar
  // Identify which step is optional
  const isStepOptional = (step: number) => {
    // Optional for Medical Concerned and Alergies
    const optional = 2;
    return step === optional;
  };

  // Track if optional step is passed
  const isStepSkipped = (step: number) => {
    return skipped.has(step);
  };
  // Add this validation function near your other helpers
  const validateCurrentStep = (step: number): boolean => {
    switch (step) {
      case 0: // Child Information
        if (!newChild.firstName.trim()) {
          alert("First name is required");
          setColorChangeError(newChild.firstName);
          return false;
        }
        if (!newChild.lastName.trim()) {
          alert("Last name is required");
          setColorChangeError(newChild.lastName)
          return false;
        }
        if (!newChild.birthDate) {
          alert("Birth date is required");
          return false;
        }
        if (!newChild.locationId) {
          alert("Location is required");
          return false;
        }
        if (!newChild.enrollmentStatus) {
          alert("Enrollment status is required");
          return false;
        }
        return true;

      case 1: // Parent 1 Information
        if (!newParent.firstName.trim()) {
          alert("Parent first name is required");
          return false;
        }
        if (!newParent.lastName.trim()) {
          alert("Parent last name is required");
          return false;
        }
        if (!newParent.email.trim()) {
          alert("Parent email is required");
          return false;
        }
        if (!newParent.phone.trim() || phoneError) {
          alert("Valid phone number is required");
          return false;
        }
        if (!newParent.maritalStatus) {
          alert("Marital status is required");
          return false;
        }
        if (!newParent.relationshipToChild) {
          alert("Relationship to child is required");
          return false;
        }
        return true;

      case 2: // Parent 2 Information (optional, but if filled, validate)
        // Only validate if any field is filled (since it's optional)
        const hasAnyParent2Data =
          newParent.firstName.trim() ||
          newParent.lastName.trim() ||
          newParent.email.trim() ||
          newParent.phone.trim();

        if (hasAnyParent2Data) {
          if (!newParent.firstName.trim()) {
            alert("Parent 2 first name is required if other fields are filled");
            return false;
          }
          if (!newParent.lastName.trim()) {
            alert("Parent 2 last name is required if other fields are filled");
            return false;
          }
          if (!newParent.email.trim()) {
            alert("Parent 2 email is required if other fields are filled");
            return false;
          }
          if (!newParent.phone.trim() || phoneError) {
            alert("Valid parent 2 phone number is required if other fields are filled");
            return false;
          }
        }
        return true;

      case 3: // Review - no validation needed
        return true;

      default:
        return true;
    }
  };

  // Handle click Next
  const handleNext = () => {
    // Checking if form is validated
    if (!validateCurrentStep(activeStep)) return;
    // Initially, skipped = empty or just new Set();
    let newSkipped = skipped;
    // If at Optional step
    if (isStepSkipped(activeStep)) {
      newSkipped = new Set(newSkipped.values());
      newSkipped.delete(activeStep);
    }

    // Increase next step
    setActiveStep((prev) => prev + 1);
    setSkipped(newSkipped);

    // If step === 2 (entering 2nd parent) => setSecondParent = newParent
    if (activeStep === 2) {
      setSecondParent(newParent);
    }

    // Save data into temporary variable, Then Call API backend, when submit


  };

  // Handle click Back
  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSkip = () => {
    if (!isStepOptional(activeStep)) {
      // You probably want to guard against something like this,
      // it should never occur unless someone's actively trying to break something.
      throw new Error("You can't skip a step that isn't optional.");
    }
    setActiveStep((prev) => prev + 1);
    setSkipped((prev) => {
      const newSkipped = new Set(prev.values());
      newSkipped.add(activeStep);
      return newSkipped;
    });
    // If SKIP, then Parent2 is null
    setSecondParent(null);
  };

  // Start all over agaim
  const handleReset = () => {
    setActiveStep(0);
  };

  // ========================== done progress bar

  // Filter children based on search
  const filteredChildren = childrenData.filter((child) => {
    const searchLower = searchTerm.toLowerCase();
    const parentNames = parents
      .filter((p) => child.parentId.includes(p.id))
      .map((p) => `${p.firstName} ${p.lastName}`)
      .join(" ");
    return (
      child.firstName.toLowerCase().includes(searchLower) ||
      child.lastName.toLowerCase().includes(searchLower) ||
      parentNames.toLowerCase().includes(searchLower) ||
      child.enrollmentStatus.toLowerCase().includes(searchLower)
    );
  });

  const resetForm = () => {
    // Reset child
    setNewChild({
      firstName: "",
      lastName: "",
      birthDate: "",
      parentId: [],
      classId: "",
      // enrollmentDate: "", was removed as automatic by assigning Class. !!!!!
      enrollmentStatus: Types.EnrollmentStatus.New,
      locationId: "",
      notes: "",
    });
    // Reset Parent
    setNewParent({
      firstName: '',
      lastName: '',
      // childIds: [],
      email: '',
      phone: '',
      address1: '',
      address2: "",
      city: '',
      province: '',
      country: '',
      postalcode: "",
      maritalStatus: "",
      relationshipToChild: "",
    });
  };

  const handleAddClick = useCallback(() => {
    if ((locations ?? []).length === 0) {
      alert("No locations available. Please create a location first.");
      return;
    }
    // 1. Child
    setEditingChild(null);

    // 2. Parent
    setEditingParent(null);

    // Clear the form both forms
    resetForm();
    setIsFormOpen(true);
  }, [locations, setNewChild]);

  const handleEditClick = useCallback(
    (child: Types.Child) => {
      setEditingChild(child);
      setNewChild({
        firstName: child.firstName,
        lastName: child.lastName,
        birthDate: child.birthDate,
        parentId: child.parentId ?? [],
        classId: child.classId ?? "",
        locationId: child.locationId ?? (locations[0]?.id ?? ""),
        notes: child.notes ?? "",
        enrollmentStatus: child.enrollmentStatus ?? computeStatus(child.parentId, child.classId),
      });
      setIsFormOpen(true);
    },
    [locations, setNewChild]
  );

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
        enrollmentStatus: newChild.enrollmentStatus,
      });
      if (updated) onUpdated?.(updated);
      setEditingChild(null);

      // Adding new Child W/ Parent
    } else {
      // 1. Child
      const created = await createChild({
        firstName: newChild.firstName.trim(),
        lastName: newChild.lastName.trim(),
        birthDate: newChild.birthDate,
        parentId: Array.isArray(newChild.parentId) ? newChild.parentId : [],
        classId: newChild.classId?.trim() || undefined,
        locationId: trimmedLoc || undefined,
        notes: newChild.notes?.trim() || undefined,
        enrollmentStatus: newChild.enrollmentStatus,
      });
      alert(created);
      if (created) {
        onCreated?.(created);
      }
      // 2. Parent 1 and 2: passing ChildId ?? in the main
      onAddParent();
    }

    resetForm();
    clearDraft();
    setIsFormOpen(false);
    handleReset(); // to back to inital step;
  }

  async function handleDeleteClick(child: Types.Child) {
    const ok = window.confirm(`Delete "${child.firstName} ${child.lastName}"?`);
    if (!ok) return;
    const success = await deleteChild(child.id);
    if (success) onDeleted?.(child.id);
  }

  async function linkParentByEmail(childId: string, email: string): Promise<boolean> {
    if (onLinkParentByEmail) return !!(await onLinkParentByEmail(childId, email));
    const parent = parents.find((p) => (p.email ?? "").toLowerCase() === email.trim().toLowerCase());
    if (!parent) {
      alert("Parent not found by that email.");
      return false;
    }
    return !!(await onLinkParent?.(childId, parent.id));
  }

  const filtered = useMemo(() => {
    return childrenData.filter((c) => {
      const q = searchTerm.trim().toLowerCase();
      const okSearch =
        q.length === 0 ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        getLocationLabel(locations, c.locationId).toLowerCase().includes(q);
      if (!okSearch) return false;

      const effStatus =
        c.enrollmentStatus ?? computeStatus(c.parentId, c.classId);
      if (statusFilter !== "all" && effStatus !== statusFilter) return false;

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


  ///////================= Parent 
  // Handle Phone Number
  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Update value
    updateParent({ phone: value });

    // Check value
    const phoneRegex = /^\d{10}$/; // 10 digits
    if (!phoneRegex.test(value)) {
      setPhoneError("Phone number must be 10 digits");
    } else {
      setPhoneError("");
    }
  }

  // Update form and persist a draft (debounced)
  const updateParent = useCallback(
    (updates: Partial<NewParentInput>) => {
      setNewParent(prev => {
        const updated = { ...prev, ...updates };

        // Only save draft in add mode
        if (!editingParent) {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          saveTimeoutRef.current = setTimeout(() => {
            sessionStorage.setItem('parent-form-draft', JSON.stringify(updated));
          }, 500);
        }

        return updated;
      });
    },
    [editingParent, setNewParent]
  );

  // Handle load address to form when editing: setNewTeacher with value of current Address
  // Passing Current address value back to input value
  const newTeacherAddressValues: Address = {
    address1: newParent.address1,
    address2: newParent.address2,
    city: newParent.city,
    province: newParent.province,
    country: newParent.country,
    postalcode: newParent?.postalcode
  };

  const handleAddressChange = useCallback((a: Address) => {
    updateParent({
      address1: a.address1,
      address2: a.address2,
      city: a.city,
      province: a.province,
      country: a.country,
      postalcode: a.postalcode
    });
  }, [updateParent]);

  const formatAddress = (parent: Types.Parent) => {
    const parts = [
      parent.address2,
      parent.address1,
      parent.city,
      parent.province,
      parent.country,
      parent.postalcode,
    ].filter(Boolean) as string[];
    return parts.join(", ");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-gray-800">Children</h2>
          <button
            onClick={handleAddClick}
            className="bg-gray-700 hover:bg-gray-800 text-white font-medium px-4 py-2 rounded-lg transition duration-200 flex items-center gap-2 text-sm shadow-sm"
            title={
              (locations ?? []).length === 0
                ? "No locations available"
                : "Add child"
            }
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
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
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
              <option value={Types.EnrollmentStatus.Withdraw}>Withdraw</option>
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

        {pageItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {pageItems.map((child) => (
              <ChildCard
                key={child.id}
                gender={gender}
                child={child}
                classes={classes}
                parents={parents}
                locations={locations}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onOpenAssign={(id) => {
                  setAssignChildId(id);
                  setAssignClassId("");
                }}
                onUnassign={onUnassign}
                onUnlinkParent={onUnlinkParent}
                onOpenLinkByEmail={(id) => setLinkChildId(id)}
              />
            ))}
          </div >
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">🧒</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No children found
            </h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== "all" || classFilter !== "all"
                ? "Try adjusting your search or filter settings"
                : "Get started by adding your first child"}
            </p>
          </div>
        )
        }

        {
          totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${page === 1 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
                  }`}
              >
                ← Previous
              </button>
              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-10 h-10 rounded-lg font-medium transition duration-200 ${page === n ? "bg-gray-800 text-white" : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${page === totalPages ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
                  }`}
              >
                Next →
              </button>
            </div>
          )
        }

        {
          isFormOpen && (
            <div
              // item-start instead of item-center: so the top stays fixed. 
              className="fixed h-full inset-0 bg-white/30 backdrop-blur-md flex items-start justify-center p-2 z-50"
              onClick={() => {
                setIsFormOpen(false);
                setEditingChild(null);
              }}
            >
              <div
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[100vh] overflow-y-auto border border-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0">
                  <div className="bg-white border-b border-gray-200 px-2 py-1 flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">
                      {editingChild ? "Edit Child" : "Add New Child"}
                    </h3>
                    <Typography sx={{ mt: 2, mb: 1, fontWeight: "bold", fontSize: "1.25rem" }}>
                      Step {activeStep + 1}
                    </Typography>
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
                  <Box sx={{ width: "100%" }}>
                    <Stepper activeStep={activeStep}>
                      {steps.map((label, index) => {
                        const stepProps: { completed?: boolean } = {};
                        const labelProps: {
                          optional?: React.ReactNode;
                        } = {};
                        if (isStepOptional(index)) {
                          labelProps.optional = (
                            <Typography variant="caption" fontWeight="bold">*Optional</Typography>
                          );
                        }
                        if (isStepSkipped(index)) {
                          stepProps.completed = false;
                        }
                        return (
                          <Step key={label} {...stepProps}>
                            <StepLabel {...labelProps}>{label}</StepLabel>
                          </Step>
                        );
                      })}
                    </Stepper>
                  </Box>
                </div>

                {/* Main form: shown by the order or of the form */}
                <form onSubmit={handleFormSubmit} className="p-6">
                  {activeStep === 0 && (
                    // Child Information
                    <div className="space-y-4">
                      <h2 className="text-2xl font-semibold text-gray-800 border-b pb-1">
                        Child Information
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block">
                          <span className="text-gray-700 font-medium mb-1 block">
                            First Name *
                          </span>
                          <input
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={newChild.firstName}
                            onChange={(e) => updateDraft({ firstName: e.target.value })}
                            required
                          />
                        </label>
                        <label className="block">
                          <span className="text-gray-700 font-medium mb-1 block">
                            Last Name *
                          </span>
                          <input
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={newChild.lastName}
                            onChange={(e) => updateDraft({ lastName: e.target.value })}
                            required
                          />
                        </label>

                        <label className="block">
                          <span className="text-gray-700 font-medium mb-1 block">Gender *</span>
                          <div className="flex gap-4">
                            <label>
                              <input
                                type="radio"
                                name="gender"
                                value="👦"
                                checked={gender === "👦"}
                                onChange={(e) => setGender(e.target.value)}
                              />
                              Boy
                            </label>

                            <label>
                              <input
                                type="radio"
                                name="gender"
                                value="👧"
                                checked={gender === "👧"}
                                onChange={(e) => setGender(e.target.value)}
                              />
                              Girl
                            </label>
                          </div>
                        </label>

                        <label className="block">
                          <span className="text-gray-700 font-medium mb-1 block">Birth Date *</span>
                          <input
                            type="date"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={newChild.birthDate}
                            onChange={(e) => updateDraft({ birthDate: e.target.value })}
                            required
                          />
                        </label>
                        <label className="block">
                          <span className="text-gray-700 font-medium mb-1 block">
                            Location *
                          </span>
                          <select
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={newChild.locationId ?? ""}
                            onChange={(e) => updateDraft({ locationId: e.target.value })}
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
                        <label className="block">
                          <span className="text-gray-700 font-medium mb-1 block">
                            Status *
                          </span>
                          <select
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={newChild.enrollmentStatus ?? Types.EnrollmentStatus.New}
                            onChange={(e) => updateDraft({ enrollmentStatus: e.target.value as Types.EnrollmentStatus })}
                            required
                          >
                            <option value={Types.EnrollmentStatus.New}>New</option>
                            <option value={Types.EnrollmentStatus.Waitlist}>
                              Waitlist
                            </option>
                            <option value={Types.EnrollmentStatus.Active}>
                              Active
                            </option>
                            <option value={Types.EnrollmentStatus.Withdraw}>
                              Withdraw
                            </option>
                          </select>
                        </label>
                        <label className="block md:col-span-2">
                          <span className="text-gray-700 font-medium mb-1 block">
                            Notes
                          </span>
                          <textarea
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            value={newChild.notes ?? ""}
                            onChange={(e) => updateDraft({ notes: e.target.value })}
                            placeholder="Allergies / Special needs / Subsidy status / Remarks"
                          />
                        </label>
                      </div>
                    </div>
                  )}


                  {/* Parent 1 and 2 info */}
                  {(activeStep === 1 || activeStep === 2) && (
                    <div className="space-y-4">
                      <h2 className="text-2xl font-semibold text-gray-800 border-b pb-1">
                        {activeStep === 1 ? "Parent 1 infomation" : "Parent 2 infomation"}
                      </h2>
                      {/* Firstname - Lastname */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block">
                          <span className="text-gray-700 font-medium mb-1 block">
                            First Name *
                          </span>
                          <input
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                            placeholder="First Name"
                            value={newParent.firstName}
                            onChange={(e) =>
                              updateParent({ firstName: e.target.value })
                            }
                            required
                          />
                        </label>

                        <label className="block">
                          <span className="text-gray-700 font-medium mb-1 block">
                            Last Name *
                          </span>
                          <input
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                            placeholder="Last Name"
                            value={newParent.lastName}
                            onChange={(e) =>
                              updateParent({ lastName: e.target.value })
                            }
                            required
                          />
                        </label>
                      </div>

                      {/* Email - Phone number */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <label className="block">
                          <span className="text-gray-700 font-medium mb-1 block">
                            Email *
                          </span>
                          <input
                            type="email"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                            placeholder="Email"
                            value={newParent.email}
                            onChange={(e) => updateParent({ email: e.target.value })}
                            required
                          />
                        </label>

                        <label className="block">
                          <span className="text-gray-700 font-medium mb-1 block">
                            Phone *  <span className="text-red-500 text-sm">{phoneError}</span>
                          </span>
                          <input
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                            placeholder="Phone"
                            value={newParent.phone}
                            onChange={(e) => handlePhoneChange(e)}
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

                      {/* Maritual Status and relationship to kid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block">
                          <span className="text-gray-700 font-medium mb-1 block">
                            Marital Status *
                          </span>
                          <select
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={newParent.maritalStatus}
                            onChange={(e) =>
                              updateParent({ maritalStatus: e.target.value })
                            }
                            required
                          >
                            <option value="" disabled>Select status</option>
                            <option value="Married">Married</option>
                            <option value="Separated">Separated</option>
                            <option value="Single">Single</option>
                            <option value="Common Law">Common Law</option>
                            <option value="Divorced">Divorced</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-gray-700 font-medium mb-1 block">
                            Relationship to child*
                          </span>
                          <select
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={newParent.relationshipToChild}
                            onChange={(e) =>
                              updateParent({ relationshipToChild: e.target.value })
                            }
                            required
                          >
                            <option value="" disabled>Select relationship</option>
                            <option value="Mother">Mother</option>
                            <option value="Father">Father</option>
                            <option value="Guardian">Guardian</option>
                          </select>
                        </label>
                      </div>
                      {/* Removing AssignClass Manually in input form   */}
                    </div>
                  )}

                  {/* Review SUMMARY before forms is submitted or reset */}
                  {(activeStep === 3 || activeStep === 4) && (
                    // View all Child and Parent Info
                    <div className="space-y-6">
                      <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">
                        Review Information
                      </h2>

                      {/* 🧒 Child Information */}
                      <div className="bg-gray-50 p-4 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-purple-700 mb-3 flex items-center gap-2">
                          👶 Child Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                          <p><span className="font-semibold">First Name:</span> {newChild.firstName || "-"}</p>
                          <p><span className="font-semibold">Last Name:</span> {newChild.lastName || "-"}</p>
                          <p><span className="font-semibold">Gender:</span> {gender === "👧" ? "👧 Girl" : "👦 Boy"}</p>
                          <p><span className="font-semibold">Birth Date:</span> {newChild.birthDate || "-"}</p>
                          <p><span className="font-semibold">Location:</span> {locations?.find(l => l.id === newChild.locationId)?.name || "-"}</p>
                          <p><span className="font-semibold">Status:</span> {newChild.enrollmentStatus}</p>
                          <p className="md:col-span-2">
                            <span className="font-semibold">Notes:</span> {newChild.notes || "None"}
                          </p>
                        </div>
                      </div>

                      {/* 👨‍👩‍👧 Parent 1 Information */}
                      <div className="bg-gray-50 p-4 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-purple-700 mb-3 flex items-center gap-2">
                          👩 Parent 1 Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                          <p><span className="font-semibold">First Name:</span> {newParent.firstName || "-"}</p>
                          <p><span className="font-semibold">Last Name:</span> {newParent.lastName || "-"}</p>
                          <p><span className="font-semibold">Email:</span> {newParent.email || "-"}</p>
                          <p><span className="font-semibold">Phone:</span> {newParent.phone || "-"}</p>
                          <p><span className="font-semibold">Address:</span> {newTeacherAddressValues?.address1 || "-"}</p>
                          <p><span className="font-semibold">Marital Status:</span> {newParent.maritalStatus || "-"}</p>
                          <p><span className="font-semibold">Relationship to Child:</span> {newParent.relationshipToChild || "-"}</p>
                        </div>
                      </div>

                      {/* Optionally: Parent 2 */}
                      {secondParent && (
                        <div className="bg-gray-50 p-4 rounded-2xl shadow-sm border border-gray-200">
                          <h3 className="text-lg font-semibold text-purple-700 mb-3 flex items-center gap-2">
                            👨 Parent 2 Information
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                            <p><span className="font-semibold">First Name:</span> {secondParent.firstName || "-"}</p>
                            <p><span className="font-semibold">Last Name:</span> {secondParent.lastName || "-"}</p>
                            <p><span className="font-semibold">Email:</span> {secondParent.email || "-"}</p>
                            <p><span className="font-semibold">Phone:</span> {secondParent.phone || "-"}</p>
                            <p><span className="font-semibold">Marital Status:</span> {secondParent.maritalStatus || "-"}</p>
                            <p><span className="font-semibold">Relationship to Child:</span> {secondParent.relationshipToChild || "-"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}



                  {/*  Control of the Stepper and Status*/}
                  {activeStep === (steps.length - 1) ? (
                    <React.Fragment>
                      <Box sx={{ display: "flex", flexDirection: "row", pt: 1, fontWeight: "bold" }}>
                        <Typography sx={{}}>
                          ✔️ All steps completed
                        </Typography>
                        <Box sx={{ flex: "1 1 auto" }} />
                        <Button onClick={handleReset}>Reset</Button>
                      </Box>
                    </React.Fragment>
                  ) : (
                    <React.Fragment>
                      <Box sx={{ display: "flex", flexDirection: "row", pt: 2 }}>
                        <Button
                          color="inherit"
                          disabled={activeStep === 0}
                          onClick={handleBack}
                          sx={{ mr: 1 }}
                        >
                          Back
                        </Button>
                        <Box sx={{ flex: "1 1 auto" }} />
                        {isStepOptional(activeStep) && (
                          <Button
                            color="inherit"
                            onClick={handleSkip}
                            sx={{ mr: 1 }}
                          >
                            Skip
                          </Button>
                        )}
                        <Button onClick={handleNext}>
                          {activeStep === steps.length - 1 ? "Finish" : "Next"}
                        </Button>
                      </Box>
                    </React.Fragment>
                  )}

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
                      className="flex-1 disabled:bg-gray-400 bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-3 rounded-lg transition duration-200"
                      title={
                        (locations ?? []).length === 0
                          ? "No locations available"
                          : "Submit"
                      }

                      // Disable button when not complete step
                      disabled={activeStep !== (steps.length - 1)}
                    >
                      {editingChild ? "Update Child" : "Submit"}
                    </button>
                  </div>
                </form>
              </div >
            </div >
          )
        }

        {
          assignChildId && (
            <div
              className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50"
              onClick={() => {
                setAssignChildId(null);
                setAssignClassId("");
              }}
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-gray-100" onClick={(e) => e.stopPropagation()}>
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
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={assignClassId} onChange={(e) => setAssignClassId(e.target.value)}>
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
                  <div className="text-xs text-gray-500">Full classes are disabled. If a class is full, the child should remain on <b>Waitlist</b>.</div>
                </div >

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
                      const targetClass = classes.find(
                        (c) => c.id === assignClassId
                      );
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
                    className={`flex-1 ${assignClassId ? "bg-green-600 hover:bg-green-700" : "bg-green-400 cursor-not-allowed"} text-white font-medium px-4 py-2 rounded-lg`}
                  >
                    Assign
                  </button>
                </div>
              </div >
            </div >
          )
        }

        {linkChildId && (
          <div
            className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => {
              setLinkChildId(null);
              setParentEmail("");
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-gray-100" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">
                  Link Parent by Email
                </h3>
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
                <div className="text-xs text-gray-500 mt-2">Enter the parent&apos;s email to link their account.</div>
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
                    const ok = await linkParentByEmail(
                      linkChildId,
                      parentEmail.trim()
                    );
                    if (ok) {
                      setLinkChildId(null);
                      setParentEmail("");
                    }
                  }}
                  disabled={!parentEmail.trim()}
                  className={`flex-1 ${parentEmail.trim() ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-400 cursor-not-allowed"} text-white font-medium px-4 py-2 rounded-lg`}
                >
                  Link
                </button>
              </div>
            </div>
          </div>
        )
        }
      </div >
    </div>
  )
}