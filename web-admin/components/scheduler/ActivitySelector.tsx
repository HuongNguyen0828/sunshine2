'use client';

import type { Activity, SlotInfo } from "@/types/scheduler";

interface ActivitySelectorProps {
  activities: Activity[];
  currentActivity?: Activity | null;
  onSelect: (activityId: string) => void;
  onRemove: () => void;
  onClose: () => void;
  slotInfo: SlotInfo;
}

// This component preserves its modal interaction patterns but adapts to new data types
// The consciousness shift: from Convex ID types to simple strings, but same user experience
export function ActivitySelector({
  activities,
  currentActivity,
  onSelect,
  onRemove,
  onClose,
  slotInfo
}: ActivitySelectorProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Select Activity
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {slotInfo.day.charAt(0).toUpperCase() + slotInfo.day.slice(1)} - {slotInfo.timeSlot}
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {currentActivity && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-red-900">Current Activity</h4>
                  <p className="text-sm text-red-700">{currentActivity.title}</p>
                </div>
                <button
                  onClick={onRemove}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No activities created yet.</p>
              <p className="text-sm mt-1">Create your first activity to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map(activity => (
                <div
                  key={activity.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                  onClick={() => onSelect(activity.id)}
                >
                  <h4 className="font-medium text-gray-900 text-sm mb-1">
                    {activity.title}
                  </h4>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {activity.description}
                  </p>
                  {activity.materials && (
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Materials:</span> {activity.materials}
                    </p>
                  )}
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
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}