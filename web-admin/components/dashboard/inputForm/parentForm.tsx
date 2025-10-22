"use client"

import type React from "react"

import type * as Types from "../../../../shared/types/type"
import type { NewParentInput } from "@/types/forms"
import { useState, useEffect, useCallback, useRef, type ChangeEvent } from "react"
import AutoCompleteAddress, { type Address } from "@/components/AutoCompleteAddress"

interface ParentFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (parentData: NewParentInput) => Promise<void>
    editingParent: Types.Parent | null
    initialData: NewParentInput
}

export default function ParentForm({ isOpen, onClose, onSubmit, editingParent, initialData }: ParentFormProps) {
    const [formData, setFormData] = useState<NewParentInput>(initialData)
    const [isDraftRestored, setIsDraftRestored] = useState(false)
    const [phoneError, setPhoneError] = useState<string>("")
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Debounced save cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        }
    }, [])

    // Restore draft when form opens (add mode only)
    useEffect(() => {
        if (isOpen && !editingParent) {
            const draft = sessionStorage.getItem("parent-form-draft")
            if (draft) {
                try {
                    const parsed = JSON.parse(draft)
                    setFormData(parsed)
                    setIsDraftRestored(true)
                } catch (e) {
                    console.error("Failed to restore draft:", e)
                }
            }
        }
    }, [isOpen, editingParent])

    // Sync with initialData when editing
    useEffect(() => {
        if (editingParent) {
            setFormData(initialData)
        }
    }, [editingParent, initialData])

    // Update form and persist a draft (debounced)
    const updateFormData = useCallback(
        (updates: Partial<NewParentInput>) => {
            setFormData((prev) => {
                const updated = { ...prev, ...updates }

                // Only save draft in add mode
                if (!editingParent) {
                    if (saveTimeoutRef.current) {
                        clearTimeout(saveTimeoutRef.current)
                    }
                    saveTimeoutRef.current = setTimeout(() => {
                        sessionStorage.setItem("parent-form-draft", JSON.stringify(updated))
                    }, 500)
                }

                return updated
            })
        },
        [editingParent],
    )

    // Clear draft
    const clearDraft = useCallback(() => {
        sessionStorage.removeItem("parent-form-draft")
        setIsDraftRestored(false)
        setFormData(initialData)
    }, [initialData])

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit(formData)

        // Clear draft after successful submit
        if (!editingParent) {
            sessionStorage.removeItem("parent-form-draft")
        }
    }

    // Handle load address to form
    const formAddressValues: Address = {
        address1: formData.address1,
        address2: formData.address2,
        city: formData.city,
        province: formData.province,
        country: formData.country,
        postalcode: formData?.postalcode,
    }

    const handleAddressChange = useCallback(
        (a: Address) => {
            updateFormData({
                address1: a.address1,
                address2: a.address2,
                city: a.city,
                province: a.province,
                country: a.country,
                postalcode: a.postalcode,
            })
        },
        [updateFormData],
    )

    // Handle Phone Number validation
    const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        updateFormData({ phone: value })

        const phoneRegex = /^\d{10}$/ // 10 digits
        if (!phoneRegex.test(value)) {
            setPhoneError("Phone number must be 10 digits")
        } else {
            setPhoneError("")
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">{editingParent ? "Edit Parent" : "Add New Parent"}</h3>
                        {isDraftRestored && !editingParent && <p className="text-xs text-green-600 mt-1">✓ Draft restored</p>}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="p-6">
                    <div className="space-y-4">
                        {/* Firstname - Lastname */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="block">
                                <span className="text-gray-700 font-medium mb-1 block">First Name *</span>
                                <input
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    placeholder="First Name"
                                    value={formData.firstName}
                                    onChange={(e) => updateFormData({ firstName: e.target.value })}
                                    required
                                />
                            </label>

                            <label className="block">
                                <span className="text-gray-700 font-medium mb-1 block">Last Name *</span>
                                <input
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    placeholder="Last Name"
                                    value={formData.lastName}
                                    onChange={(e) => updateFormData({ lastName: e.target.value })}
                                    required
                                />
                            </label>
                        </div>

                        {/* Email - Phone number */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="block">
                                <span className="text-gray-700 font-medium mb-1 block">Email *</span>
                                <input
                                    type="email"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    placeholder="Email"
                                    value={formData.email}
                                    onChange={(e) => updateFormData({ email: e.target.value })}
                                    required
                                />
                            </label>

                            <label className="block">
                                <span className="text-gray-700 font-medium mb-1 block">
                                    Phone * <span className="text-red-500 text-sm">{phoneError}</span>
                                </span>
                                <input
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    placeholder="Phone"
                                    value={formData.phone}
                                    onChange={handlePhoneChange}
                                    required
                                />
                            </label>
                        </div>

                        <div className="block">
                            <AutoCompleteAddress onAddressChanged={handleAddressChange} addressValues={formAddressValues} />
                        </div>

                        {/* Marital Status and relationship to kid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="block">
                                <span className="text-gray-700 font-medium mb-1 block">Marital Status *</span>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    value={formData.maritalStatus}
                                    onChange={(e) => updateFormData({ maritalStatus: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>
                                        Select status
                                    </option>
                                    <option value="Married">Married</option>
                                    <option value="Separated">Separated</option>
                                    <option value="Single">Single</option>
                                    <option value="Common Law">Common Law</option>
                                    <option value="Divorced">Divorced</option>
                                </select>
                            </label>

                            <label className="block">
                                <span className="text-gray-700 font-medium mb-1 block">Relationship to child*</span>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    value={formData.relationshipToChild}
                                    onChange={(e) => updateFormData({ relationshipToChild: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>
                                        Select relationship
                                    </option>
                                    <option value="Mother">Mother</option>
                                    <option value="Father">Father</option>
                                    <option value="Guardian">Guardian</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-6 py-3 rounded-lg transition duration-200"
                        >
                            Cancel
                        </button>
                        {!editingParent && (
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
                            className="flex-1 bg-gray-700 hover:bg-gray-800 text-white font-medium px-6 py-3 rounded-lg transition duration-200"
                        >
                            {editingParent ? "Update Parent" : "Add Parent"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
