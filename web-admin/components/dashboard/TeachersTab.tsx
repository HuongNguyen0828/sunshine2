"use client";

import * as Types from "../../../shared/types/type";
import { useCallback, useState } from "react";
import type { NewTeacherInput } from "@/types/forms";
import AutoCompleteAdress from "@/components/AutoCompleteAddress";
import {Address} from "@/components/AutoCompleteAddress"

export default function TeachersTab({
  teachers,
  newTeacher,
  setNewTeacher,
  onAdd,
}: {
  teachers: Types.Teacher[];
  newTeacher: NewTeacherInput;
  setNewTeacher: React.Dispatch<React.SetStateAction<NewTeacherInput>>;
  onAdd: () => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTeacher, setEditingTeacher] = useState<Types.Teacher | null>(null);
  const [showAssignClass, setShowAssignClass] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState('');

  const handleAddressChange = useCallback((a: Address) => {
    setNewTeacher((prev) => ({
        ...prev,
        address1: a.address1,
        address2: a.address2,
        city: a.city,
        province: a.province,
        country: a.country,
        postalcode: a.postalcode
    }));
  }, []);

  // Filter teachers based on search
  const filteredTeachers = teachers.filter(t =>
    t.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const teachersPerPage = 6;
  const totalPages = Math.ceil(filteredTeachers.length / teachersPerPage);
  const startIndex = (currentPage - 1) * teachersPerPage;
  const paginatedTeachers = filteredTeachers.slice(startIndex, startIndex + teachersPerPage);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTeacher) {
      console.log('Update teacher:', { ...editingTeacher, ...newTeacher });
      setEditingTeacher(null);
      // Reset form to empty state
      setNewTeacher({
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
      });
    } else {
      onAdd();
    }
    setIsFormOpen(false);
  };

  const handleAddClick = () => {
    setEditingTeacher(null);
    setNewTeacher({
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
    });
    setIsFormOpen(true);
  };

  const handleEditClick = (teacher: Types.Teacher) => {
    setEditingTeacher(teacher);
    setNewTeacher({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      address1: teacher.address1,
      address2: teacher.address2,
      city: teacher.city,
      province: teacher.province,
      country: teacher.country,
      postalcode: teacher.postalcode,
      startDate: teacher.startDate,
      endDate: teacher.endDate,
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (teacher: Types.Teacher) => {
    if (window.confirm(`Are you sure you want to delete ${teacher.firstName} ${teacher.lastName}?`)) {
      console.log('Delete teacher:', teacher.id);
    }
  };

  const handleAssignClass = (teacherId: string) => {
    setShowAssignClass(teacherId);
    setSelectedClass('');
  };

  const handleSaveClass = () => {
    console.log('Assign class to teacher:', showAssignClass, 'Class:', selectedClass);
    setShowAssignClass(null);
    setSelectedClass('');
  };

  const getInitials = (firstName: string) => {
    return firstName.charAt(0).toUpperCase();
  };

  const formatAddress = (teacher: Types.Teacher) => {
    const parts = [
      teacher.address2,
      teacher.address1,
      teacher.city,
      teacher.province,
      teacher.country,
      teacher.postalcode
    ].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-gray-800">Teachers</h2>
          <button
            onClick={handleAddClick}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition duration-200 flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Add Teacher
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold whitespace-nowrap">
              {filteredTeachers.length} of {teachers.length} teachers
            </div>
          </div>
        </div>
      </div>

      {/* Teacher Grid */}
      {paginatedTeachers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {paginatedTeachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6"
            >
              {/* Teacher Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
                  {getInitials(teacher.firstName)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-800 truncate">
                    {teacher.firstName} {teacher.lastName}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-600 mt-1">
                    <span>✉️</span>
                    <span className="text-sm truncate">{teacher.email}</span>
                  </div>
                </div>
              </div>

              {/* Teacher Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <span>📞</span>
                  <span className="text-sm">{teacher.phone}</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700">
                  <span className="mt-0.5">📍</span>
                  <span className="text-sm flex-1">{formatAddress(teacher)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span>📅</span>
                  <span className="text-sm">
                    {String(teacher.startDate)}
                    {teacher.endDate ? ` → ${String(teacher.endDate)}` : ' → Present'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleAssignClass(teacher.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition duration-200 text-sm"
                >
                  Assign Class
                </button>
                <button
                  onClick={() => handleEditClick(teacher)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-lg transition duration-200 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(teacher)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition duration-200 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No teachers found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first teacher'}
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
                    ? 'bg-blue-600 text-white'
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-800">
                {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
              </h3>
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
                    <span className="text-gray-700 font-medium mb-1 block">First Name *</span>
                    <input
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="First Name"
                      value={newTeacher.firstName}
                      onChange={(e) =>
                        setNewTeacher({ ...newTeacher, firstName: e.target.value })
                      }
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Last Name *</span>
                    <input
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Last Name"
                      value={newTeacher.lastName}
                      onChange={(e) =>
                        setNewTeacher({ ...newTeacher, lastName: e.target.value })
                      }
                      required
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Email *</span>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email"
                    value={newTeacher.email}
                    onChange={(e) =>
                      setNewTeacher({ ...newTeacher, email: e.target.value })
                    }
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Phone Number *</span>
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 403 111 2284"
                    value={newTeacher.phone}
                    onChange={(e) =>
                      setNewTeacher({ ...newTeacher, phone: e.target.value })
                    }
                    required
                  />
                </label>

                <div className="block">
                  <span className="text-gray-700 font-medium mb-1 block">Address *</span>
                  <AutoCompleteAdress onAddressChanged={handleAddressChange} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Start Date *</span>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newTeacher.startDate}
                      onChange={(e) =>
                        setNewTeacher({ ...newTeacher, startDate: e.target.value })
                      }
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">End Date</span>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="End Date (optional)"
                      value={newTeacher.endDate || ""}
                      onChange={(e) =>
                        setNewTeacher({
                          ...newTeacher,
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
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-6 py-3 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition duration-200"
                >
                  {editingTeacher ? 'Update Teacher' : 'Add Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Class Modal */}
      {showAssignClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Assign Class</h3>
              <button
                onClick={() => {
                  setShowAssignClass(null);
                  setSelectedClass('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <label className="block mb-4">
                <span className="text-gray-700 font-medium mb-2 block">Select Class</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a class --</option>
                  <option value="class1">Class 1 (Placeholder)</option>
                  <option value="class2">Class 2 (Placeholder)</option>
                  <option value="class3">Class 3 (Placeholder)</option>
                </select>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAssignClass(null);
                    setSelectedClass('');
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-6 py-3 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveClass}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg transition duration-200"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}