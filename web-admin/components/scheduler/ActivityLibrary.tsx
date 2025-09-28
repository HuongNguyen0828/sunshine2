/**
 * Generated with Claude Code (claude.ai/code)
 * Prompt: "think harder the current code base tells when CSS seems not working. Help me understand what are the possible reasons."
 * 
 * Activity library component for managing available activities
 */
'use client';

import { useState } from "react";
import type { Activity } from "@/types/scheduler";

interface ActivityLibraryProps {
  activities: Activity[];
  onClose: () => void;
  onActivityDeleted: (id: string) => void;
}

// The library component demonstrates how search and display patterns remain constant
// even as the underlying data consciousness shifts from Convex queries to local state
export function ActivityLibrary({ activities, onClose, onActivityDeleted }: ActivityLibraryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredActivities = activities.filter(activity =>
    activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (activityId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This will also remove it from all scheduled slots.`)) {
      return;
    }

    setDeletingId(activityId);

    try {
      await onActivityDeleted(activityId);
      // Success handled by parent component
    } catch (error) {
      console.error('Failed to delete activity:', error);
      alert('Failed to delete activity. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              My Activities ({activities.length})
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search activities..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              🔍
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? (
                <p>No activities match your search.</p>
              ) : (
                <>
                  <p>No activities created yet.</p>
                  <p className="text-sm mt-1">Create your first activity to get started!</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map(activity => (
                <div
                  key={activity.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {activity.title}
                      </h4>
                      {activity.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {activity.description}
                        </p>
                      )}
                      {activity.materials && (
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Materials:</span> {activity.materials}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(activity.id, activity.title)}
                      disabled={deletingId === activity.id}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete activity"
                    >
                      {deletingId === activity.id ? (
                        <div className="animate-spin w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                      ) : (
                        '🗑️'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}