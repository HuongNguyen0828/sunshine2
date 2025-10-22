





















{
    isFormOpen && (
        <div
            className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => {
                setIsFormOpen(false);
                setEditingParent(null);
            }}
        >
            <div
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">
                            {editingParent ? "Edit Parent" : "Add New Parent"}
                        </h3>
                        {isDraftRestored && !editingParent && (
                            <p className="text-xs text-green-600 mt-1">
                                ✓ Draft restored
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            setIsFormOpen(false);
                            setEditingParent(null);
                        }}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="p-6">
                    <div className="space-y-4">
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
                        {/* Removing AssignClass Manually in input form here   */}
                    </div>

                    <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => {
                                setIsFormOpen(false);
                                setEditingParent(null);
                            }}
                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-6 py-3 rounded-lg transition duration-200"
                        >
                            Cancel
                        </button>
                        {!editingParent && (
                            <button
                                type="button"
                                onClick={() => clearDraft()}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-6 py-3 rounded-lg transition duration-200 text-sm"
                            >
                                {/* reset fields too */}
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