import { type NewParentInput } from "@/types/forms";
import { ChangeEvent, useCallback } from "react";
import AutoCompleteAddress, { Address } from "../AutoCompleteAddress";

export default function ParentForm({
    parent,
    updateParent,
    phoneError,
    setPhoneError,
    disabled,
}: {
    parent: NewParentInput;
    updateParent: (updates: Partial<NewParentInput>) => void;
    phoneError: string;
    setPhoneError: React.Dispatch<React.SetStateAction<string>>;
    disabled: boolean; // When to disable to from to edit
}) {

    const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (disabled) return; // Prevent changes when disabled
        const value = e.target.value;
        updateParent({ phone: value });

        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(value)) {
            setPhoneError("Phone number must be 10 digits");
        } else {
            setPhoneError("");
        }
    };

    const addressValues: Address = {
        address1: parent.address1,
        address2: parent.address2,
        city: parent.city,
        province: parent.province,
        country: parent.country,
        postalcode: parent.postalcode
    };

    const handleAddressChangeForm = useCallback((a: Address) => {
        if (disabled) return; // Prevent changes when disabled
        // Case updating parent 
        updateParent({
            address1: a.address1,
            address2: a.address2,
            city: a.city,
            province: a.province,
            country: a.country,
            postalcode: a.postalcode
        });
    }, [updateParent])


    return (
        <>
            {/* Firstname - Lastname */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">First Name *</span>
                    <input
                        className="w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 read-only:bg-gray-100"
                        placeholder="First Name"
                        value={parent.firstName}
                        onChange={(e) => updateParent({ firstName: e.target.value })}
                        required
                        readOnly={disabled} // not editing when disabled from Children Tab
                    />
                </label>

                <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Last Name *</span>
                    <input
                        className="w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 read-only:bg-gray-100"
                        placeholder="Last Name"
                        value={parent.lastName}
                        onChange={(e) => updateParent({ lastName: e.target.value })}
                        required
                        readOnly={disabled} // not editing when disabled from Children Tab
                    />
                </label>
            </div>

            {/* Email - Phone number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Email *</span>
                    <input
                        type="email"
                        className="w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 read-only:bg-gray-100"
                        placeholder="Email"
                        value={parent.email}
                        onChange={(e) => updateParent({ email: e.target.value })}
                        required
                        readOnly={disabled} // not editing when disabled from Children Tab
                    />
                </label>

                <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">
                        Phone * <span className="text-red-500 text-sm">{phoneError}</span>
                    </span>
                    <input
                        className="w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 read-only:bg-gray-100"
                        placeholder="Phone"
                        value={parent.phone}
                        onChange={handlePhoneChange}
                        required
                        readOnly={disabled} // not editing when disabled from Children Tab
                    />
                </label>
            </div>

            <div className="block">
                <AutoCompleteAddress
                    onAddressChanged={handleAddressChangeForm}
                    addressValues={addressValues}
                    disabled={disabled}
                />
            </div>

            {/* Marital Status and relationship to kid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Marital Status *</span>
                    <select
                        className="appearance-none w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:bg-gray-100"
                        value={parent.maritalStatus}
                        onChange={(e) => updateParent({ maritalStatus: e.target.value })}
                        required
                        disabled={disabled}
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
                    <span className="text-gray-700 font-medium mb-1 block">Relationship to child*</span>
                    <select
                        className="appearance-none w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:bg-gray-100"
                        value={parent.newChildRelationship}
                        onChange={(e) => updateParent({ newChildRelationship: e.target.value })}
                        required
                        disabled={disabled}
                    >
                        <option value="" disabled>Select relationship</option>
                        <option value="Mother">Mother</option>
                        <option value="Father">Father</option>
                        <option value="Guardian">Guardian</option>
                    </select>
                </label>
            </div>
        </>
    );
}