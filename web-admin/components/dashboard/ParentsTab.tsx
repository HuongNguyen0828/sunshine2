'use client';

import * as Types from '../../../shared/types/type';
import type { NewParentInput } from '@/types/forms';
import { useState } from 'react';

export default function ParentsTab({
  parents,
  newParent,
  setNewParent,
  onAdd,
}: {
  parents: Types.Parent[];
  newParent: NewParentInput;
  setNewParent: React.Dispatch<React.SetStateAction<NewParentInput>>;
  onAdd: () => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingParent, setEditingParent] = useState<Types.Parent | null>(null);

  // Filter parents based on search
  const filteredParents = parents.filter(parent =>
    parent.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const parentsPerPage = 6;
  const totalPages = Math.ceil(filteredParents.length / parentsPerPage);
  const startIndex = (currentPage - 1) * parentsPerPage;
  const paginatedParents = filteredParents.slice(startIndex, startIndex + parentsPerPage);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingParent) {
      console.log('Update parent:', { ...editingParent, ...newParent });
      setEditingParent(null);
      resetForm();
    } else {
      onAdd();
    }
    setIsFormOpen(false);
  };

  const resetForm = () => {
    setNewParent({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      passwordHash: '',
      childIds: [],
      street: '',
      city: '',
      province: '',
      country: '',
      emergencyContact: undefined,
      updatedAt: undefined,
      preferredLanguage: undefined,
    });
  };

  const handleAddClick = () => {
    setEditingParent(null);
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditClick = (parent: Types.Parent) => {
    setEditingParent(parent);
    setNewParent({
      firstName: parent.firstName,
      lastName: parent.lastName,
      email: parent.email,
      phone: parent.phone,
      passwordHash: '',
      childIds: parent.childIds,
      street: parent.street,
      city: parent.city,
      province: parent.province,
      country: parent.country,
      emergencyContact: parent.emergencyContact,
      updatedAt: parent.updatedAt,
      preferredLanguage: parent.preferredLanguage,
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (parent: Types.Parent) => {
    if (window.confirm(`Are you sure you want to delete ${parent.firstName} ${parent.lastName}?`)) {
      console.log('Delete parent:', parent.id);
    }
  };

  const formatAddress = (parent: Types.Parent) => {
    return `${parent.street}, ${parent.city}, ${parent.province}, ${parent.country}`;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-gray-800">Parents</h2>
          <button
            onClick={handleAddClick}
            className="bg-gray-700 hover:bg-gray-800 text-white font-medium px-4 py-2 rounded-lg transition duration-200 flex items-center gap-2 text-sm shadow-sm"
          >
            <span className="text-lg">+</span>
            Add Parent
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-gray-500 text-xs whitespace-nowrap">
            {filteredParents.length} of {parents.length}
          </div>
        </div>
      </div>

      {/* Parents Grid */}
      {paginatedParents.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          {paginatedParents.map((parent) => (
            <div
              key={parent.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5"
            >
              {/* Primary Info */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {parent.firstName} {parent.lastName}
                </h3>
                <div className="text-sm text-gray-500">
                  {parent.email}
                </div>
              </div>

              {/* Secondary Details */}
              <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-500">Phone:</span>
                  <span className="text-xs text-gray-700 font-medium">{parent.phone}</span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-500">Address:</span>
                  <span className="text-xs text-gray-700">{formatAddress(parent)}</span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-500">Children:</span>
                  <span className="text-xs text-gray-700">
                    {parent.childIds.length > 0 ? `${parent.childIds.length} child(ren)` : 'None'}
                  </span>
                </div>

                {parent.emergencyContact && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-500">Emergency:</span>
                    <span className="text-xs text-gray-700">{parent.emergencyContact}</span>
                  </div>
                )}

                {parent.preferredLanguage && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-500">Language:</span>
                    <span className="text-xs text-gray-700">{parent.preferredLanguage}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditClick(parent)}
                  className="flex-1 bg-white/60 backdrop-blur-sm border border-gray-200 hover:bg-white/80 hover:border-gray-300 text-gray-700 font-medium px-3 py-2 rounded-lg transition-all duration-200 text-xs shadow-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(parent)}
                  className="flex-1 bg-white/60 backdrop-blur-sm border border-gray-200 hover:bg-white/80 hover:border-red-300 text-gray-700 hover:text-red-600 font-medium px-3 py-2 rounded-lg transition-all duration-200 text-xs shadow-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No parents found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first parent'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${
              currentPage === 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
            }`}
          >
            ← Previous
          </button>

          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded-lg font-medium transition duration-200 ${
                  currentPage === page
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${
              currentPage === totalPages
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
            }`}
          >
            Next →
          </button>
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
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
              <h3 className="text-2xl font-bold text-gray-800">
                {editingParent ? 'Edit Parent' : 'Add New Parent'}
              </h3>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">First Name *</span>
                    <input
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                      placeholder="First Name"
                      value={newParent.firstName}
                      onChange={(e) => setNewParent({ ...newParent, firstName: e.target.value })}
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Last Name *</span>
                    <input
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                      placeholder="Last Name"
                      value={newParent.lastName}
                      onChange={(e) => setNewParent({ ...newParent, lastName: e.target.value })}
                      required
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Email *</span>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="Email"
                    value={newParent.email}
                    onChange={(e) => setNewParent({ ...newParent, email: e.target.value })}
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Phone *</span>
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="Phone"
                    value={newParent.phone}
                    onChange={(e) => setNewParent({ ...newParent, phone: e.target.value })}
                    required
                  />
                </label>

                {!editingParent && (
                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Password *</span>
                    <input
                      type="password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                      placeholder="Password"
                      value={newParent.passwordHash}
                      onChange={(e) => setNewParent({ ...newParent, passwordHash: e.target.value })}
                      required={!editingParent}
                    />
                  </label>
                )}

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Street *</span>
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="Street Address"
                    value={newParent.street}
                    onChange={(e) => setNewParent({ ...newParent, street: e.target.value })}
                    required
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">City *</span>
                    <input
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                      placeholder="City"
                      value={newParent.city}
                      onChange={(e) => setNewParent({ ...newParent, city: e.target.value })}
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Province *</span>
                    <input
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                      placeholder="Province"
                      value={newParent.province}
                      onChange={(e) => setNewParent({ ...newParent, province: e.target.value })}
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Country *</span>
                    <input
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                      placeholder="Country"
                      value={newParent.country}
                      onChange={(e) => setNewParent({ ...newParent, country: e.target.value })}
                      required
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Emergency Contact</span>
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="Emergency Contact (optional)"
                    value={newParent.emergencyContact ?? ''}
                    onChange={(e) => setNewParent({ ...newParent, emergencyContact: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Preferred Language</span>
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="e.g., en, fr (optional)"
                    value={newParent.preferredLanguage ?? ''}
                    onChange={(e) => setNewParent({ ...newParent, preferredLanguage: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Child IDs</span>
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="Comma separated child IDs (optional)"
                    value={newParent.childIds.join(', ')}
                    onChange={(e) =>
                      setNewParent({
                        ...newParent,
                        childIds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                </label>
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
                <button
                  type="submit"
                  className="flex-1 bg-gray-700 hover:bg-gray-800 text-white font-medium px-6 py-3 rounded-lg transition duration-200"
                >
                  {editingParent ? 'Update Parent' : 'Add Parent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
