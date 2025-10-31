// web-admin/components/dashboard/ChildrenTab.tsx
"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import * as Types from "../../../shared/types/type";
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  ChangeEvent,
} from "react";
import type { LocationLite } from "@/services/useLocationsAPI";
import AutoCompleteAddress, { Address } from "../AutoCompleteAddress";
import ParentForm from "./ParentForm";
import { NewChildInput } from "../../types/forms";
import { MdFiberNew } from 'react-icons/md';
import { updateChild } from "@/services/useChildrenAPI";

// For Stepper: Choosing linear bar
//Steppers convey progress through numbered steps. It provides a wizard-like workflow.
import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { NewParentInput } from "@/types/forms";
import { returnChildWithParents } from "@/services/useChildrenAPI";
import { loadManifestWithRetries } from "next/dist/server/load-components";
import LinkParentByEmail from "./SearchParentModal.tsx";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import SearchParentModal from "./SearchParentModal.tsx";

export type CustomParentInput = {
  parentId: string,
  newChildRelationship: string;
} | NewParentInput;

type Props = {
  children: Types.Child[];
  setChildren: React.Dispatch<React.SetStateAction<Types.Child[]>>;
  classes: Types.Class[];
  parents: Types.Parent[];
  locations: LocationLite[];
  newChild: NewChildInput;
  setNewChild: React.Dispatch<React.SetStateAction<NewChildInput>>;
  addChild: (
    parent1: CustomParentInput, // Can be parent object or {parent ID with relationship}
    parent2: CustomParentInput | null, // Can be parent object, or {parent ID with relationship}, or null
  ) => Promise<returnChildWithParents | null>;
  deleteChild: (id: string) => Promise<boolean>;
  onAssign?: (childId: string, classId: string) => Promise<boolean> | boolean;
  onUnassign?: (childId: string) => Promise<boolean> | boolean;
  // onLinkParent?: (
  //   childId: string,
  //   parentUserId: string
  // ) => Promise<boolean> | boolean;
  // onUnlinkParent?: (
  //   childId: string,
  //   parentUserId: string
  // ) => Promise<boolean> | boolean;
  // onLinkParentByEmail?: (
  //   childId: string,
  //   email: string
  // ) => Promise<boolean> | boolean;
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
    const months =
      (now.getFullYear() - dob.getFullYear()) * 12 +
      (now.getMonth() - dob.getMonth());
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

function computeStatus(parentIds?: string[], classId?: string): Types.EnrollmentStatus {
  const hasParent = Array.isArray(parentIds) && parentIds.length > 0;
  const hasClass = Boolean(classId);
  if (hasParent && hasClass) return Types.EnrollmentStatus.Active;
  if (hasParent || hasClass) return Types.EnrollmentStatus.Waitlist;
  return Types.EnrollmentStatus.New;
}

function classCapacityBadge(
  cls?: Types.Class
): { text: string; pct: number; level: "ok" | "warn" | "full" } {
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
  child: Types.Child;
  classes: Types.Class[];
  parent1And2: Types.Parent[];
  locations: LocationLite[];
  onEdit: (c: Types.Child, parent1: Types.Parent, parent2: Types.Parent | null) => void;
  onDelete: (c: Types.Child) => void;
  onOpenAssign: (childId: string) => void;
  onUnassign?: (childId: string) => Promise<boolean> | boolean;
  onUnlinkParent?: (
    childId: string,
    parentUserId: string
  ) => Promise<boolean> | boolean;
  onOpenLinkByEmail: (childId: string) => void;
};

function ChildCard({
  child,
  classes,
  parent1And2,
  locations,
  onEdit,
  onDelete,
  onOpenAssign,
  onUnassign,
  // onUnlinkParent,
  // onOpenLinkByEmail,
}: ChildCardProps) {
  const cls = classes.find((c) => c.id === child.classId);
  const cap = classCapacityBadge(cls);
  const status =
    child.enrollmentStatus ?? computeStatus(child.parentId, child.classId);

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
            <span>{child.gender}</span>
            <span className="text-xs text-gray-500">
              {formatAge(child.birthDate)}
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Status:{" "}
          <span
            className={
              status === Types.EnrollmentStatus.Active
                ? "text-green-600 font-bold"
                : status === Types.EnrollmentStatus.Waitlist
                  ? "text-yellow-600"
                  : status === Types.EnrollmentStatus.New
                    ? "text-red-600 font-bold"
                    : "text-gray-600"
            }
          >
            {status}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="text-xs text-gray-500">
          📍 {getLocationLabel(locations, child.locationId)}
        </div>

        <div className="text-sm text-gray-600">
          Class:{" "}
          <span className="font-medium">
            {classLabel(classes, child.classId)}
          </span>
        </div>

        {cls && (
          <div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Capacity</span>
              <span>{cap.text}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 ${cap.level === "full"
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

        {parent1And2 ? (
          <div className="text-xs text-gray-600">
            {/* Add debug info
            <div className="text-red-500 text-xs">
              Debug: {parent1And2.length} parents found
            </div> */}
            {parent1And2.map((eachParent, index) => {
              const childRelationship = eachParent.childRelationships.filter(
                (relationship) => relationship.childId === child.id
              )[0].relationship;
              const firstname = eachParent.firstName;
              const lastname = eachParent.lastName;
              return (
                <div key={index}>
                  {childRelationship}: {firstname} {lastname}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-gray-400">No parent linked</div>
        )}

        {child.notes && (
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded">
            <span className="font-bold">Note:</span> {child.notes}{" "}
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-200 grid grid-cols-2 gap-2 mb-1">
        <button
          onClick={() => onEdit(child, parent1And2[0], parent1And2[1])}
          className="px-3 py-2 rounded-lg text-xs border border-gray-200 hover:bg-gray-50"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(child)}
          className="px-3 py-2 rounded-lg text-xs border border-gray-200 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
        >
          Delete
        </button>
      </div>

      {child.classId ? (
        <button
          onClick={() => onUnassign?.(child.id)}
          className="w-1/2 mx-auto px-3 py-2 rounded-lg text-xs bg-gray-700 text-white hover:bg-gray-800"
        >
          Switch Class
        </button>
      ) : (
        <button
          onClick={() => onOpenAssign(child.id)}
          className="w-1/2 mx-auto px-auto py-2 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700"
        >
          Assign to Class
        </button>
      )}

    </div >
  );
}

/* ---------------- main component with auto-save draft ---------------- */

const DRAFT_KEY = "child-form-draft";

export default function ChildrenTab({
  children,
  setChildren,
  classes,
  parents,
  locations,
  newChild,
  setNewChild,
  addChild,
  deleteChild,
  onAssign,
  onUnassign,
  // onLinkParent,
  // onUnlinkParent,
  // onLinkParentByEmail,
}: Props) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Types.Child | null>(null);
  const [showAssignClass, setShowAssignClass] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const defaultLocationView: string = "all";
  const [locationView, setLocationView] = useState<string>(defaultLocationView); // default is viewing all locations


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

  const initialParentValues: NewParentInput = {
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
    newChildRelationship: "",
  };
  const initialChildValues: NewChildInput = {
    firstName: "",
    lastName: "",
    gender: "",
    birthDate: "",
    parentId: [],
    classId: "",
    startDate: "",
    enrollmentStatus: Types.EnrollmentStatus.New,
    locationId: "",
    notes: "",
  };
  /// ================From ParentTab
  const [phoneError, setPhoneError] = useState<string>("");
  const [editingParent, setEditingParent] = useState<Types.Parent | null>(null);
  const [addOrSearchParent1, setAddOrSearchParent1] = useState<"addParent1" | "searchParent1">("addParent1");
  const [addOrSearchParent2, setAddOrSearchParent2] = useState<"addParent2" | "searchParent2">("addParent2");
  const [parent1, setParent1] = useState<NewParentInput>(initialParentValues);
  const [parent2, setParent2] = useState<NewParentInput | null>(initialParentValues); // Null when skip

  // For editing click from the last step: Review and Summary
  const [isClickEditFromSumarry, setIsClickEditFromSumarry] = useState<boolean>(false);

  // For editing Child button (could be editing child info, parent 1 info, editing/ delete parent 2 info): pARENT1 CAN JUST  editable, no delete
  const [showEditOption, setShowEditOption] = useState<boolean>(false); // To Toggle showing add option or edit option 
  const [isEditingChildInfoMode, setIsEditingChildInfoMode] = useState<boolean>(false);
  const [isEditingParent1InfoMode, setIsEditingParen1InfoMode] = useState<boolean>(false);
  const [isEditingParent2InfoMode, setIsEditingParen2InfoMode] = useState<boolean>(false);

  // For allow searching existing parent to link with a child
  const [searchParent1Modal, setSearchParent1Modal] = useState(false);
  const [searchParent2Modal, setSearchParent2Modal] = useState(false);
  const [selectedParent1, setSelectedParent1] = useState<Types.Parent | null>(null);
  const [selectedParent2, setSelectedParent2] = useState<Types.Parent | null>(null);
  const [newChildRelationshipParent1, setNewChildRelationshipParent1] = useState<string>("");
  const [newChildRelationshipParent2, setNewChildRelationshipParent2] = useState<string>("");



  // Restore ALL forms draft when form opens and not in editing mode
  useEffect(() => {
    if (isFormOpen && !editingChild && !editingParent) {
      // Restore Child draft
      const childDraft = sessionStorage.getItem("child-form-draft");
      if (childDraft) {
        try {
          const parsed = JSON.parse(childDraft) as NewChildInput;
          setNewChild(parsed);
          setIsDraftRestored(true);
        } catch {
          /* noop */
        }
      }

      // Restore parent1 draft
      const parent1Draft = sessionStorage.getItem("parent1-form-draft");
      if (parent1Draft) {
        try {
          const parsed = JSON.parse(parent1Draft) as NewParentInput;
          setParent1(parsed);
        } catch (e) {
          console.log("Failed to restore parent1 draft", e);
        }
      }

      // Restore parent2 draft
      const parent2Draft = sessionStorage.getItem("parent2-form-draft");
      if (parent2Draft) {
        try {
          const parsed = JSON.parse(parent2Draft) as NewParentInput;
          setParent2(parsed);
        } catch (e) {
          console.error("Failed to restore parent2 draft:", e);
        }
      }
    }
  }, [isFormOpen, editingChild, setNewChild, editingParent]);

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
    sessionStorage.removeItem("parent1-form-draft");
    sessionStorage.removeItem("parent2-form-draft");
    setIsDraftRestored(false);
    resetForm(); // clear the form at the same time
    setActiveStep(0); // reset the step
  }, []);

  const resetForm = () => {
    // Reset child
    setNewChild(initialChildValues);
    // Reset Parent
    setParent1(initialParentValues);
    setParent2(initialParentValues);
    // To let default view is Adding
    setAddOrSearchParent1("addParent1");
    setAddOrSearchParent2("addParent2");
    setSelectedParent1(null);
    setSelectedParent2(null);
    setNewChildRelationshipParent1(""); // Reset newChildRelationship
    setNewChildRelationshipParent2("");
    setActiveStep(0);
  };

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
      case 0: // Child Information: MUST
        if (!newChild.firstName.trim()) {
          alert("First name is required");
          return false;
        }
        if (!newChild.lastName.trim()) {
          alert("Last name is required");
          return false;
        }
        if (!newChild.gender.trim()) {
          alert("Gender is required");
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

      case 1: // Parent 1 Information: only in AddOrSearchParent 1 = "addParent", buy pass when search
        if (selectedParent1) {
          if (!newChildRelationshipParent1) {
            alert("Relationship to Child is required");
            return false;
          }
          return true;
        }
        // I want either add or add: meaning if add, selectedParent = null, if search, parent1 = null. 
        if (!parent1.firstName.trim()) {
          alert("Parent first name is required");
          return false;
        }
        if (!parent1.lastName.trim()) {
          alert("Parent last name is required");
          return false;
        }
        if (!parent1.email.trim()) {
          alert("Parent email is required");
          return false;
        }
        if (!parent1.phone.trim() || phoneError) {
          alert("Valid phone number is required");
          return false;
        }
        // Mising checking address
        if (!parent1.address1 || !parent1.city || !parent1.province || !parent1.country || !parent1.postalcode) {
          alert(`Missing address fields`);
          return false;
        }
        if (!parent1.maritalStatus) {
          alert("Marital status is required");
          return false;
        }
        if (!parent1.newChildRelationship) {
          alert("Relationship to child is required");
          return false;
        }
        return true;

      case 2: // Parent 2 Information (optional, but if filled, validate): Only on "addParent", on searchParent, check realtionship
        // Force to validate, otherwise click Skip
        if (selectedParent2) {
          if (!newChildRelationshipParent2) {
            alert("Relationship to Child is required");
            return false;
          }
          return true; // Skip if search
        }
        if (!parent2?.firstName.trim()) {
          alert("Parent 2 first name is required. Otherwise click Skip");
          return false;
        }
        if (!parent2.lastName.trim()) {
          alert("Parent 2 last name is required. Otherwise click Skip");
          return false;
        }
        if (!parent2.email.trim()) {
          alert("Parent 2 email is required. Otherwise click Skip");
          return false;
        }
        if (!parent2.phone.trim() || phoneError) {
          alert(
            "Valid parent 2 phone number is required. Otherwise click Skip"
          );
          return false;
        }
        // Mising checking address
        if (!parent2.address1 || !parent2.city || !parent2.province || !parent2.country || !parent2.postalcode) {
          alert(`Missing address fields`);
          return false;
        }
        if (!parent2.maritalStatus) {
          alert("Marital status is required");
          return false;
        }
        if (!parent2.newChildRelationship) {
          alert("Relationship to child is required");
          return false;
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
    let newSkipped = skipped;
    // If at Optional step
    if (isStepSkipped(activeStep)) { // If 
      newSkipped = new Set(newSkipped.values());
      newSkipped.delete(activeStep);
    }
    setActiveStep((prev) => prev + 1);
    setSkipped(newSkipped);

    // Handle case parent2 is null, or step 2 is skipped, I want to jump from step 1(parent1) to 3(sumary and review) in handleEdit click
    if (showEditOption || isClickEditFromSumarry) { // Could be edit click from ChildCard or Edit click from the Review and Summary
      if (!parent2) { // Parent2 null
        (activeStep === 1) && setActiveStep(3); // Jump from step 1 to 3
        // If no parent2, add step 2 to skipped
        setSkipped(prev => {
          const newSkipped = new Set(prev);
          newSkipped.add(2);
          return newSkipped;
        });

      }
      else {
        (activeStep === 1) && setActiveStep(2); // Else, reset to normal
        // If parent2 exists, remove step 2 from skipped
        setSkipped(prev => {
          const newSkipped = new Set(prev);
          newSkipped.delete(2);
          return newSkipped;
        });
      }
    }
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
    // SetParent2 = null
    setParent2(null);
  };

  // Start all over agaim
  const handleReset = () => {
    setActiveStep(0);
  };

  // ========================== done progress bar

  const handleAddClick = useCallback(() => {
    setShowEditOption(false); // To not show EditOption, but Add option

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
    (child: Types.Child, parent1: Types.Parent, parent2: Types.Parent | null) => {
      // 1. To show EditOption, 
      setShowEditOption(true);
      // 2. To load the form
      // 2.1 Child
      setNewChild({
        firstName: child.firstName,
        lastName: child.lastName,
        birthDate: child.birthDate,
        gender: child.gender,
        parentId: child.parentId ?? [],
        classId: child.classId ?? "",
        locationId: child.locationId ?? locations[0]?.id ?? "",
        notes: child.notes ?? "",
        enrollmentStatus:
          child.enrollmentStatus ??
          computeStatus(child.parentId, child.classId),
        startDate: child.startDate,
      });
      // Set editing child
      setEditingChild(child);

      // 3. Load parent data
      if (parent1) {
        setParent1({
          firstName: parent1.firstName || "",
          lastName: parent1.lastName || "",
          email: parent1.email || "",
          phone: parent1.phone || "", // Fixed: was using email for phone
          address1: parent1.address1 || "",
          address2: parent1.address2 || "",
          city: parent1.city || "",
          province: parent1.province || "",
          country: parent1.country || "", // Fixed: was using province for country
          postalcode: parent1.postalcode || "",
          newChildRelationship: parent1.childRelationships?.find(cr => cr.childId === child.id)?.relationship || "",
          maritalStatus: parent1.maritalStatus || ""
        });
      }

      if (parent2) {
        setParent2({
          firstName: parent2.firstName || "",
          lastName: parent2.lastName || "",
          email: parent2.email || "",
          phone: parent2.phone || "", // Fixed: was using email for phone
          address1: parent2.address1 || "",
          address2: parent2.address2 || "",
          city: parent2.city || "",
          province: parent2.province || "",
          country: parent2.country || "", // Fixed: was using province for country
          postalcode: parent2.postalcode || "",
          newChildRelationship: parent2.childRelationships?.find(cr => cr.childId === child.id)?.relationship || "",
          maritalStatus: parent2.maritalStatus || ""
        });
      } else {
        setParent2(null);
      }

      // Set editing states: View Mode
      setIsEditingChildInfoMode(false); // Start with view mode
      setIsEditingParen1InfoMode(false);
      setIsEditingParen2InfoMode(false);

      setIsFormOpen(true);
      setActiveStep(0); // Start at child info step
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
        gender: newChild.gender,
        startDate: newChild.startDate,
        birthDate: newChild.birthDate,
        parentId: Array.isArray(newChild.parentId) ? newChild.parentId : [],
        classId: newChild.classId?.trim() || undefined,
        locationId: trimmedLoc || undefined,
        notes: newChild.notes?.trim() || undefined,
        enrollmentStatus: newChild.enrollmentStatus,
      });
      setEditingChild(null);
      if (updated) setChildren(prev => prev.map(c => c.id === editingChild.id ? updated : c));

      // Adding new Child W/ Parent
    } else {
      // Clean up parent1 and 2 before passing 
      const customParent1: CustomParentInput = (selectedParent1) ? {
        parentId: selectedParent1.docId, // assuming you have this state
        newChildRelationship: newChildRelationshipParent1
      } : parent1;

      const customParen2: CustomParentInput | null = selectedParent2 ? {
        parentId: selectedParent2.docId,
        newChildRelationship: newChildRelationshipParent2
      } : parent2 ? parent2 : null;

      // 1. if 
      const created = await addChild(customParent1, customParen2);
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
  }

  // Update form and persist a draft (debounced)
  const updateParent1 = useCallback(
    (updates: Partial<NewParentInput>) => {
      setParent1((prev) => {
        const updated = { ...prev, ...updates };

        // Only save draft in add mode
        if (!editingParent) {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          saveTimeoutRef.current = setTimeout(() => {
            sessionStorage.setItem(
              "parent1-form-draft",
              JSON.stringify(updated)
            );
          }, 500);
        }

        return updated;
      });
    },
    [editingParent, setParent1]
  );

  // Update form and persist a draft (debounced)
  const updateParent2 = useCallback(
    (updates: Partial<NewParentInput>) => {
      setParent2((prev) => {
        if (!prev) {
          // Initialize parent2 if it doesn't exist
          const newParent2: NewParentInput = {
            ...initialParentValues,
            ...updates,
          };

          // Save draft
          if (!editingParent) {
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = setTimeout(() => {
              sessionStorage.setItem(
                "parent2-form-draft",
                JSON.stringify(newParent2)
              );
            }, 500);
          }

          return newParent2;
        }

        const updated = { ...prev, ...updates };

        // Only save draft in add mode
        if (!editingParent) {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          saveTimeoutRef.current = setTimeout(() => {
            sessionStorage.setItem(
              "parent2-form-draft",
              JSON.stringify(updated)
            );
          }, 500);
        }

        return updated;
      });
    },
    [editingParent, setParent2]
  );

  // Identify parent 1 and parent 2 for each child
  const parentLookup = useMemo(
    () =>
      // Function to return an object of that matchingparent
      parents.reduce((acc, parent) => {
        acc[parent.docId] = parent;
        return acc;
      }, {} as Record<string, Types.Parent>),
    [parents]
  ); // Only recalculate when parents change

  const childrenWithParents = useMemo(
    () =>
      children.map((child) => ({
        ...child,
        parent1And2: child.parentId
          .map((parentId) => parentLookup[parentId])
          .filter(Boolean), // Remove undefined values
      })),
    [children, parentLookup]
  );

  // Filter logic: name, status, locations, class. SHOULD search also parent. And location should on the top!!!!!!!!!!!!!!!!!!
  ////.filter(Boolean), // Will Remove undefined values, only true value
  const filtered = useMemo(() => {
    return childrenWithParents.filter((c) => {
      const q = searchTerm.trim().toLowerCase();
      const parent1 = c.parent1And2[0];
      const parent2 = c.parent1And2[1];

      const okSearch =
        q.length === 0 ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        parent1.firstName.toLowerCase().includes(q) ||
        parent1.lastName.toLowerCase().includes(q) ||
        (parent2 && parent2.firstName.toLowerCase().includes(q)) ||
        (parent2 && parent2.lastName.toLowerCase().includes(q));

      if (!okSearch) return false;

      const effStatus =
        c.enrollmentStatus ?? computeStatus(c.parentId, c.classId);
      if (statusFilter !== "all" && effStatus !== statusFilter) return false;

      if (classFilter !== "all") {
        if (classFilter === "unassigned") return !c.classId;
        return c.classId === classFilter;
      }

      if (locationView !== defaultLocationView) return (c.locationId === locationView);
      return true;
    });
  }, [childrenWithParents, locations, searchTerm, statusFilter, classFilter, locationView, defaultLocationView]);

  // Pagination logic
  const perPage = 6;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);



  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4">
            <h2 className="text-3xl font-bold text-gray-800">Children</h2>
            {/* Location scope */}
            <select
              className="px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={locationView}
              onChange={(e) => setLocationView(e.target.value)}
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
              {/* Default all locations: all ids */}
              <option value={defaultLocationView}>All locations</option>
            </select>
          </div>
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
                placeholder="Search by child name, parent name..."
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
              {filtered.length} of {children.length}
            </div>
          </div>
        </div>
      )}

        {pageItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {filtered.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                classes={classes}
                parent1And2={child.parent1And2}
                locations={locations}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onOpenAssign={(id) => {
                  setAssignChildId(id);
                  setAssignClassId("");
                }}
                onUnassign={onUnassign}
              // onUnlinkParent={onUnlinkParent}
              // onOpenLinkByEmail={(id) => setLinkChildId(id)}
              />
            ))}
          </div>
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
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${page === 1
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
                  className={`w-10 h-10 rounded-lg font-medium transition duration-200 ${page === n
                    ? "bg-gray-800 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
                    }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${page === totalPages
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
                }`}
            >
              Next →
            </button>
          </div>
        )}

        {isFormOpen && (
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
                  <Typography
                    sx={{
                      mt: 2,
                      mb: 1,
                      fontWeight: "bold",
                      fontSize: "1.25rem",
                    }}
                  >
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
                          <Typography variant="caption" fontWeight="bold">
                            *Optional
                          </Typography>
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
                    <div className="flex justify-between border-b pb-1">
                      <h2 className="text-2xl font-semibold text-gray-800">
                        Child Information
                      </h2>
                      {/* Option to edit child: only when click edit */}
                      {showEditOption && (<label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isEditingChildInfoMode}
                          onChange={(e) => setIsEditingChildInfoMode(e.target.checked)}
                        />
                        Edit Child Information
                      </label>
                      )}
                    </div>


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="block">
                        <span className="text-gray-700 font-medium mb-1 block">
                          First Name *
                        </span>
                        <input
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 read-only:bg-gray-100"
                          value={newChild.firstName}
                          onChange={(e) =>
                            updateDraft({ firstName: e.target.value })
                          }
                          required
                          readOnly={showEditOption && !isEditingChildInfoMode} // View only, only allow edit if check on editing Child
                        />
                      </label>
                      <label className="block">
                        <span className="text-gray-700 font-medium mb-1 block">
                          Last Name *
                        </span>
                        <input
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 read-only:bg-gray-100"
                          value={newChild.lastName}
                          onChange={(e) =>
                            updateDraft({ lastName: e.target.value })
                          }
                          required
                          readOnly={showEditOption && !isEditingChildInfoMode} // View only, only allow edit if check on editing Child and doesn't toggle the Editing option to edit

                        />
                      </label>

                      <label className="block">
                        <span className="text-gray-700 font-medium mb-1 block ">
                          Gender *
                        </span>
                        <div className="flex gap-4">
                          <label>
                            <input
                              type="radio"
                              name="gender"
                              value="👦"
                              checked={newChild.gender === "👦"}
                              onChange={(e) =>
                                updateDraft({ gender: e.target.value })
                              }
                              disabled={showEditOption && !isEditingChildInfoMode} // View only, only allow edit if check on editing Child
                            />
                            Boy
                          </label>

                          <label>
                            <input
                              type="radio"
                              name="gender"
                              value="👧"
                              checked={newChild.gender === "👧"}
                              onChange={(e) =>
                                updateDraft({ gender: e.target.value })
                              }
                              disabled={showEditOption && !isEditingChildInfoMode} // View only, only allow edit if check on editing Child
                            />
                            Girl
                          </label>
                        </div>
                      </label>

                      <label className="block">
                        <span className="text-gray-700 font-medium mb-1 block">
                          Birth Date *
                        </span>
                        <input
                          type="date"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 read-only:bg-gray-100"
                          value={newChild.birthDate}
                          onChange={(e) =>
                            updateDraft({ birthDate: e.target.value })
                          }
                          required
                          readOnly={showEditOption && !isEditingChildInfoMode} // View only, only allow edit if check on editing Child
                        />
                      </label>
                      <label className="block">
                        <span className="text-gray-700 font-medium mb-1 block">
                          Location *
                        </span>
                        <select
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                          value={newChild.locationId ?? ""}
                          onChange={(e) =>
                            updateDraft({ locationId: e.target.value })
                          }
                          required
                          disabled={((locations ?? []).length <= 1) || (showEditOption && !isEditingChildInfoMode)}
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                          value={
                            newChild.enrollmentStatus ??
                            Types.EnrollmentStatus.New
                          }
                          onChange={(e) =>
                            updateDraft({
                              enrollmentStatus: e.target
                                .value as Types.EnrollmentStatus,
                            })
                          }
                          required
                          disabled={showEditOption && !isEditingChildInfoMode} // View only, only allow edit if check on editing Child
                        >
                          <option value={Types.EnrollmentStatus.New}>
                            New
                          </option>
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg read-only:bg-gray-100"
                          value={newChild.notes ?? ""}
                          onChange={(e) =>
                            updateDraft({ notes: e.target.value })
                          }
                          placeholder="Allergies / Special needs / Subsidy status / Remarks"
                          readOnly={showEditOption && !isEditingChildInfoMode} // View only, only allow edit if check on editing Child
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Parent 1 and 2 info */}
                {(activeStep === 1 || activeStep === 2) && (
                  <div className="space-y-4">
                    <div className="flex justify-between border-b pb-1">
                      <h2 className="text-2xl font-semibold text-gray-800 ">
                        {activeStep === 1 ? "Parent 1 infomation" : "Parent 2 infomation"}
                      </h2>

                      {/* Option to edit parent1- only when click edit from Child Card */}
                      {showEditOption ? (
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={activeStep === 1 ? isEditingParent1InfoMode : isEditingParent2InfoMode}
                            onChange={(e) => activeStep === 1 ? setIsEditingParen1InfoMode(e.target.checked) : setIsEditingParen2InfoMode(e.target.checked)}
                          />
                          {activeStep === 1 ? "Edit Parent1 Information" : "Edit Parent2 Information"}
                        </label>
                      ) : (
                        // Option to add new Parent or searching existing parent 
                        <div className="flex gap-4 ">
                          <label className={`${((activeStep === 1 && addOrSearchParent1 === "addParent1") || (activeStep === 2 && addOrSearchParent2 === "addParent2")) ? "font-semibold" : "font-normal"}`}> {/* Option add by defaul*/}
                            <input
                              type="radio"
                              name={activeStep === 1 ? "addOrSearchParent1" : "addOrSearchParent2"}
                              value={activeStep === 1 ? "addParent1" : "addParent2"}
                              checked={activeStep === 1 ? addOrSearchParent1 === "addParent1" : addOrSearchParent2 === "addParent2"}
                              onChange={(e) => { activeStep === 1 ? setAddOrSearchParent1(e.target.value as "addParent1") : setAddOrSearchParent2(e.target.value as "addParent2") }}
                            />
                            Add new parent
                          </label>
                          {/* Option search */}
                          <label className={`${((activeStep === 1 && addOrSearchParent1 === "searchParent1") || (activeStep === 2 && addOrSearchParent2 === "searchParent2")) ? "font-semibold" : "font-normal"}`}>

                            <input
                              type="radio"
                              name={activeStep === 1 ? "addOrSearchParent1" : "addOrSearchParent2"}
                              value={activeStep === 1 ? "searchParent1" : "searchParent2"}
                              checked={activeStep === 1 ? addOrSearchParent1 === "searchParent1" : addOrSearchParent2 === "searchParent2"}
                              onChange={(e) => {
                                if (activeStep === 1) {
                                  setAddOrSearchParent1(e.target.value as "searchParent1"); // search mode
                                  setSearchParent1Modal(true);    // open search form
                                } else {
                                  setAddOrSearchParent2(e.target.value as "searchParent2");
                                  setSearchParent2Modal(true);
                                }
                              }}
                            />
                            Search existing parents
                          </label>
                        </div>
                      )}

                    </div>

                    {/* Use parent1 for step 1, parent2 for step 2 */}
                    {(activeStep === 1 && addOrSearchParent1 === "addParent1") && (
                      <ParentForm
                        parent={parent1}
                        updateParent={updateParent1}
                        phoneError={phoneError}
                        setPhoneError={setPhoneError}
                        disabled={showEditOption && !isEditingParent1InfoMode} // Disable ONly when the form when clicked on edit button from ChildCard and Editing Parent1 is false
                      />
                    )}
                    {(activeStep === 1 && addOrSearchParent1 === "searchParent1") && (
                      // Case searching, show selected parent
                      <div className="grid lg:grid-cols-3 md:grid-cols-1 mx-auto">
                        <div> <span className="font-semibold">Parent 1: </span> {selectedParent1?.email} </div>
                        <div>
                          <label className="block">
                            <span className="text-gray-700 font-medium mb-1">Relationship to child*</span>
                            <select
                              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                              value={newChildRelationshipParent1}
                              onChange={(e) => setNewChildRelationshipParent1(e.target.value)}
                              required
                            // disabled={disabled}
                            >
                              <option value="" disabled>Select relationship</option>
                              <option value="Mother">Mother</option>
                              <option value="Father">Father</option>
                              <option value="Guardian">Guardian</option>
                            </select>
                          </label>
                        </div>
                        <button type="button" className="hover:text-xl" onClick={() => { setSelectedParent1(null); setSearchParent1Modal(true); }}
                        >❌</button>
                      </div>
                    )}

                    {(activeStep === 2 && addOrSearchParent2 === "addParent2") && (
                      // If parent2, show the form
                      (parent2) && (
                        <ParentForm
                          parent={parent2}
                          updateParent={updateParent2}
                          phoneError={phoneError}
                          setPhoneError={setPhoneError}
                          disabled={showEditOption && !isEditingParent2InfoMode} // Disable ONly when the form when clicked on edit button from ChildCard and Editing Parent1 is false
                        />
                      ))}

                    {(activeStep === 2 && addOrSearchParent2 === "searchParent2") && (
                      // Case searching, show selected parent
                      // Case searching, show selected parent
                      <div className="grid lg:grid-cols-3 md:grid-cols-1 mx-auto">
                        <div> <span className="font-semibold">Parent 2: </span> {selectedParent2?.email} </div>
                        <div>
                          <label className="block">
                            <span className="text-gray-700 font-medium mb-1">Relationship to child*</span>
                            <select
                              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                              value={newChildRelationshipParent2}
                              onChange={(e) => setNewChildRelationshipParent2(e.target.value)}
                              required
                            // disabled={disabled}
                            >
                              <option value="" disabled>Select relationship</option>
                              <option value="Mother">Mother</option>
                              <option value="Father">Father</option>
                              <option value="Guardian">Guardian</option>
                            </select>
                          </label>
                        </div>
                        <button type="button" className="hover:text-xl" onClick={() => { setSelectedParent2(null); setSearchParent2Modal(true); }}
                        >❌</button>
                      </div>
                    )}

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
                      <div className="flex justify-between items-center gap-4 ">
                        <h3 className="text-lg font-semibold text-purple-700 mb-3 flex items-center gap-2">
                          👶 Child Information
                        </h3>
                        <button
                          onClick={() => { setActiveStep(0); setIsClickEditFromSumarry(true); }} // Back to Child form and Aware that want to review from Summary
                          className="bg-purple-100 hover:bg-gray-200 text-gray-600 font-medium px-8 border border-2 py-2 rounded-lg transition duration-200 text-sm"
                        >
                          Edit
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                        <p>
                          <span className="font-semibold">First Name:</span>{" "}
                          {newChild.firstName || "-"}
                        </p>
                        <p>
                          <span className="font-semibold">Last Name:</span>{" "}
                          {newChild.lastName || "-"}
                        </p>
                        <p>
                          <span className="font-semibold">Gender:</span>{" "}
                          {newChild.gender === "👧" ? "👧 Girl" : "👦 Boy"}
                        </p>
                        <p>
                          <span className="font-semibold">Birth Date:</span>{" "}
                          {newChild.birthDate || "-"}
                        </p>
                        <p>
                          <span className="font-semibold">Location:</span>{" "}
                          {locations?.find((l) => l.id === newChild.locationId)
                            ?.name || "-"}
                        </p>
                        <p>
                          <span className="font-semibold">Status:</span>{" "}
                          {newChild.enrollmentStatus}
                        </p>
                        <p className="md:col-span-2">
                          <span className="font-semibold">Notes:</span>{" "}
                          {newChild.notes || "None"}
                        </p>
                      </div>
                    </div>

                    {/* 👨‍👩‍👧 Parent 1 Information */}
                    <div className="bg-gray-50 p-4 rounded-2xl shadow-sm border border-gray-200">
                      <div className="flex justify-between items-center gap-4 ">
                        <h3 className="text-lg font-semibold text-purple-700 mb-3 flex items-center gap-2">
                          👩 Parent 1 Information
                        </h3>
                        <button
                          onClick={() => { setActiveStep(1); setIsClickEditFromSumarry(true); }} // Back to modifying parent1
                          className="bg-purple-100 hover:bg-gray-200 text-gray-600 font-medium px-8 border border-2 py-2 rounded-lg transition duration-200 text-sm"
                        >
                          Edit
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                        <p>
                          <span className="font-semibold">First Name:</span>{" "}
                          {parent1.firstName || selectedParent1?.firstName}
                        </p>
                        <p>
                          <span className="font-semibold">Last Name:</span>{" "}
                          {parent1.lastName || selectedParent1?.lastName}
                        </p>
                        <p>
                          <span className="font-semibold">Email:</span>{" "}
                          {parent1.email || selectedParent1?.email}
                        </p>
                        <p>
                          <span className="font-semibold">Phone:</span>{" "}
                          {parent1.phone || selectedParent1?.phone}
                        </p>
                        <p>
                          <span className="font-semibold">Address:</span>{" "}
                          {[parent1.address1, parent1.city, parent1.postalcode]
                            .filter(Boolean)
                            .join(", ") || [selectedParent1?.address1, selectedParent1?.city, selectedParent1?.postalcode]
                              .filter(Boolean)
                              .join(", ")}
                        </p> {" "}
                        <p>
                          <span className="font-semibold">Marital Status:</span>{" "}
                          {parent1.maritalStatus || selectedParent1?.maritalStatus}
                        </p>
                        <p>
                          <span className="font-semibold">
                            Relationship to Child:
                          </span>{" "}
                          {parent1.newChildRelationship || newChildRelationshipParent1}
                        </p>
                      </div>
                    </div>

                    {/* Optionally: Parent 2 */}
                    {parent2 ? (
                      <div className="bg-gray-50 p-4 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center gap-4 ">
                          <h3 className="text-lg font-semibold text-purple-700 mb-3 flex items-center gap-2">
                            👨 Parent 2 Information
                          </h3>
                          {/* Delete button */}
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Remove Parent 2? This action cannot reverst after done."
                                )
                              ) {
                                setParent2(null);
                                setSkipped((prev) => {
                                  const newSkipped = new Set(prev.values());
                                  newSkipped.add(2);
                                  return newSkipped;
                                });
                              }
                            }}
                            className="bg-red-100 hover:bg-red-200 text-red-600 font-medium px-4 py-2 rounded-lg transition duration-200 text-sm border border-red-200"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => setActiveStep(2)} // Backe to parent 2 form
                            className="bg-purple-100 hover:bg-gray-200 text-gray-600 font-medium px-8 border border-2 py-2 rounded-lg transition duration-200 text-sm"
                          >
                            Edit
                          </button>

                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                          <p>
                            <span className="font-semibold">First Name:</span>{" "}
                            {parent2.firstName || selectedParent2?.firstName}
                          </p>
                          <p>
                            <span className="font-semibold">Last Name:</span>{" "}
                            {parent2.lastName || selectedParent2?.lastName}
                          </p>
                          <p>
                            <span className="font-semibold">Email:</span>{" "}
                            {parent2.email || selectedParent2?.email || "-"}
                          </p>
                          <p>
                            <span className="font-semibold">Phone:</span>{" "}
                            {parent2.phone || selectedParent2?.phone || "-"}
                          </p>
                          <p>
                            <span className="font-semibold">Address:</span>{" "}
                            {[parent2.address1, parent2.city, parent2.postalcode]
                              .filter(Boolean)
                              .join(", ") || [selectedParent2?.address1, selectedParent2?.city, selectedParent2?.postalcode].filter(Boolean)
                                .join(", ") || "-"}
                          </p>{" "}
                          <p>
                            <span className="font-semibold">
                              Marital Status:
                            </span>{" "}
                            {parent2.maritalStatus || selectedParent2?.maritalStatus || "-"}
                          </p>
                          <p>
                            <span className="font-semibold">
                              Relationship to Child:
                            </span>{" "}
                            {parent2.newChildRelationship || newChildRelationshipParent2 || "-"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      // Else, we have add button
                      <div className="flex justify-end">

                        <button
                          onClick={() => {
                            setActiveStep(2); // Back to Parent2 Form
                            setAddOrSearchParent2("addParent2"); // Reset the default add option
                            setParent2(initialParentValues); // Initalize the value for parent2 instead of null
                            setSelectedParent2(null); // Make sure clearup the search from previous
                            setNewChildRelationshipParent2("");
                            // Remove skip status
                            setSkipped((prev) => {
                              const newSkipped = new Set(prev.values());
                              newSkipped.delete(2);
                              return newSkipped;
                            });
                          }}
                          className="bg-blue-100 hover:bg-gray-200 text-gray-600 font-medium px-8 border border-2 py-2 rounded-lg transition duration-200 text-sm"
                        >
                          + Add Parent 2
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/*  Control of the Stepper and Status*/}
                {activeStep === steps.length - 1 ? (
                  <React.Fragment>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        pt: 1,
                        fontWeight: "bold",
                      }}
                    >
                      <Typography sx={{}}>✔️ All steps completed</Typography>
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
                    disabled={activeStep !== steps.length - 1}
                  >
                    {editingChild ? "Update Child" : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                <h3 className="text-lg font-bold text-gray-800">
                  Select Class
                </h3>
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
                  Full classes are disabled. If a class is full, the child
                  should remain on <b>Waitlist</b>.
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
                  className={`flex-1 ${assignClassId
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-green-400 cursor-not-allowed"
                    } text-white font-medium px-4 py-2 rounded-lg`}
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Form for searching and load parent */}
        <SearchParentModal
          isOpen={searchParent1Modal}
          onClose={() => setSearchParent1Modal(false)}
          onSelectParent={(parent) => {
            setSelectedParent1(parent);
            setSearchParent1Modal(false);
          }}
          parents={parents}
          title="Select Parent 1"
          description="Choose an existing parent to link as Parent 1."
        />

        <SearchParentModal
          isOpen={searchParent2Modal}
          onClose={() => setSearchParent2Modal(false)}
          onSelectParent={(parent) => {
            setSelectedParent2(parent); // set the parent2
            setSearchParent2Modal(false); // close the form
          }}
          parents={parents}
          title="Select Parent 2"
          description="Choose an existing parent to link as Parent 2."
        />


      </div>
    </div>
  );
}