/**
 * Generated with Claude Code (claude.ai/code)
 * Prompt: "think harder the current code base tells when CSS seems not working. Help me understand what are the possible reasons."
 * 
 * Activity form component for creating and editing activities
 */
'use client';

import { useState, useCallback } from "react";
import type { Activity } from "@/types/scheduler";
import type { Class } from "../../../shared/types/type";
import { useFormDraft } from "@/hooks/useFormDraft";

interface ActivityFormProps {
  onClose: () => void;
  onActivityCreated: (activity: Omit<Activity, 'id' | '_creationTime' | 'userId'>) => void;
  classes: Class[];
}

// This component shifts from Convex mutations to callback patterns
// The form experience remains identical, but the data flow consciousness changes completely
export function ActivityForm({ onClose, onActivityCreated, classes }: ActivityFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState("");
  const [classId, setClassId] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form draft management
  const { isDraftRestored, saveDraft, clearDraft } = useFormDraft({
    formKey: 'activity-form',
    initialData: { title: "", description: "", materials: "", classId: "all" },
    onRestore: (draft) => {
      setTitle(draft.title || "");
      setDescription(draft.description || "");
      setMaterials(draft.materials || "");
      setClassId(draft.classId || "all");
    },
  });

  // Helper to save draft
  const saveFormDraft = useCallback(() => {
    saveDraft({ title, description, materials, classId });
  }, [title, description, materials, classId, saveDraft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Please enter an activity title");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onActivityCreated({
        title: title.trim(),
        description: description.trim(),
        materials: materials.trim(),
        classId: classId,
      });

      clearDraft(); // Clear draft after successful submission
      // Success! Parent will handle the close
    } catch (error) {
      console.error('Error creating activity:', error);
      setError("Failed to create activity. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Create New Activity
              </h3>
              {isDraftRestored && (
                <p className="text-xs text-green-600 mt-1">✓ Draft restored</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
              disabled={isSubmitting}
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Activity Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => { setTitle(e.target.value); saveFormDraft(); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., Story Time, Art & Crafts"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => { setDescription(e.target.value); saveFormDraft(); }}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="Describe the activity and learning objectives..."
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="materials" className="block text-sm font-medium text-gray-700 mb-1">
              Materials Needed
            </label>
            <input
              type="text"
              id="materials"
              value={materials}
              onChange={(e) => { setMaterials(e.target.value); saveFormDraft(); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., Crayons, paper, glue sticks"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="classId" className="block text-sm font-medium text-gray-700 mb-1">
              Assign to Class *
            </label>
            <select
              id="classId"
              value={classId}
              onChange={(e) => { setClassId(e.target.value); saveFormDraft(); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              required
              disabled={isSubmitting}
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={clearDraft}
              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
              disabled={isSubmitting}
            >
              Clear Draft
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}