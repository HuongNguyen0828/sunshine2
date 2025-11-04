// components/SearchParentModal.tsx
import { useState } from "react";
import * as Types from "../../../shared/types/type";

interface SearchParentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectParent: (parent: Types.Parent) => void;
    parents: Types.Parent[];
    title?: string;
    description?: string;
}

export default function SearchParentModal({
    isOpen,
    onClose,
    onSelectParent,
    parents,
    title = "Search Existing Parent",
    description = "Select an existing parent from the list below."
}: SearchParentModalProps) {
    const [searchTerm, setSearchTerm] = useState("");

    if (!isOpen) return null;

    const filteredParents = parents.filter(parent =>
        parent.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        parent.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        parent.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div
            className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] border border-gray-100 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-hidden flex flex-col">
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="text-sm text-gray-600 mt-2">
                            {description}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredParents.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                {searchTerm ? "No parents found matching your search" : "No parents available"}
                            </div>
                        ) : (
                            <div className=" space-y-2">
                                {filteredParents.map((parent) => (
                                    <button
                                        key={parent.id}
                                        onClick={() => onSelectParent(parent)}
                                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="font-semibold">
                                            {parent.firstName} {parent.lastName}
                                        </div>
                                        <div className="text-sm text-gray-600">{parent.email}</div>
                                        <div className="text-xs text-gray-500">
                                            {parent.phone} • {[parent.address1, parent.address2, parent.city, parent.postalcode].filter(Boolean).join(", ") || "-"}
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-700">{parent.maritalStatus}</span>  •
                                            <span className="text-sm text-gray-900">
                                                {parent.childRelationships?.length > 0
                                                    ? parent.childRelationships.map(cr => cr.relationship).join(", ")
                                                    : "—"
                                                }
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}