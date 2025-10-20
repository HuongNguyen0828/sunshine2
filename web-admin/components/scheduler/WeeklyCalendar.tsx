/**
 * Generated with Claude Code (claude.ai/code)
 * Prompt: "think harder the current code base tells when CSS seems not working. Help me understand what are the possible reasons."
 * 
 * Weekly calendar component for daycare activity scheduling
 */
'use client';

import { useState } from "react";
import { ActivitySelector } from "./ActivitySelector";
import type { Activity, Schedule, SlotInfo } from "@/types/scheduler";
import { WEEKDAYS, TIME_SLOTS } from "@/types/scheduler";

interface WeeklyCalendarProps {
  weekStart: string;
  schedules: Schedule[];
  activities: Activity[];
  targetClassId?: string; // The specific class this calendar is for (used in multi-calendar view)
  targetClassName?: string; // The name of the class (for display in modal)
  onActivityAssigned: (params: { dayOfWeek: string; timeSlot: string; activityId: string; targetClassId?: string }) => void;
  onActivityRemoved: (params: { dayOfWeek: string; timeSlot: string }) => void;
}

// This component embodies the core transformation: from reactive mutations to callback-based updates
// The visual structure remains identical, but the consciousness patterns have shifted entirely
export function WeeklyCalendar({
  weekStart,
  schedules,
  activities,
  targetClassId,
  targetClassName,
  onActivityAssigned,
  onActivityRemoved
}: WeeklyCalendarProps) {
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);

  const getSchedulesForSlot = (day: string, timeSlot: string) => {
    return schedules
      .filter(s => s.dayOfWeek === day && s.timeSlot === timeSlot)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const handleSlotClick = (day: string, timeSlot: string) => {
    setSelectedSlot({ day, timeSlot });
  };

  const handleActivitySelect = async (activityId: string) => {
    if (!selectedSlot) return;

    await onActivityAssigned({
      dayOfWeek: selectedSlot.day,
      timeSlot: selectedSlot.timeSlot,
      activityId,
      targetClassId, // Pass the target class ID
    });

    setSelectedSlot(null);
  };

  const handleRemoveActivity = async () => {
    if (!selectedSlot) return;
    
    await onActivityRemoved({
      dayOfWeek: selectedSlot.day,
      timeSlot: selectedSlot.timeSlot,
    });
    
    setSelectedSlot(null);
  };

  const formatDayHeader = (day: string) => {
    const date = new Date(weekStart);
    const dayIndex = WEEKDAYS.indexOf(day as any);
    date.setDate(date.getDate() + dayIndex);
    
    return {
      name: day.charAt(0).toUpperCase() + day.slice(1),
      date: date.getDate(),
    };
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Calendar Grid - preserving the exact visual structure from original */}
      <div className="grid grid-cols-6 divide-x divide-gray-200">
        {/* Time column header */}
        <div className="bg-gray-50 p-4 font-medium text-gray-700">
          Time
        </div>
        
        {/* Day headers */}
        {WEEKDAYS.map(day => {
          const { name, date } = formatDayHeader(day);
          return (
            <div key={day} className="bg-gray-50 p-4 text-center">
              <div className="font-medium text-gray-900">{name}</div>
              <div className="text-sm text-gray-500">{date}</div>
            </div>
          );
        })}

        {/* Time slots */}
        {TIME_SLOTS.map(timeSlot => (
          <div key={timeSlot.key} className="contents">
            {/* Time label */}
            <div className="bg-gray-50 p-4 text-sm font-medium text-gray-700 border-t border-gray-200">
              <div>{timeSlot.label}</div>
              <div className="text-xs text-gray-500">{timeSlot.time}</div>
            </div>
            
            {/* Day slots - Stacked activity pills UI */}
            {WEEKDAYS.map(day => {
              const slotSchedules = getSchedulesForSlot(day, timeSlot.key);
              return (
                <div
                  key={`${day}-${timeSlot.key}`}
                  className="min-h-[140px] p-2 border-t border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="h-full flex flex-col gap-2">
                    {/* Activity pills - stacked vertically */}
                    {slotSchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="group relative rounded-lg px-3 py-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md"
                        style={{
                          backgroundColor: schedule.activity?.color + '20',
                          borderLeft: `4px solid ${schedule.activity?.color}`,
                        }}
                        onClick={() => handleSlotClick(day, timeSlot.key)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4
                              className="font-medium text-sm truncate"
                              style={{ color: schedule.activity?.color }}
                            >
                              {schedule.activity?.title}
                            </h4>
                            {schedule.activity?.description && (
                              <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                                {schedule.activity.description}
                              </p>
                            )}
                          </div>
                          {/* Drag handle - for future drag-drop */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 text-xs">
                            ⋮⋮
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add activity button */}
                    <button
                      onClick={() => handleSlotClick(day, timeSlot.key)}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-xs text-gray-500 border-2 border-dashed border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-700 hover:bg-white transition-all"
                    >
                      <span className="text-base">+</span>
                      <span>Add activity</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Activity Selector Modal - maintaining the interaction flow */}
      {selectedSlot && (
        <ActivitySelector
          activities={activities}
          currentActivity={null} // We'll update ActivitySelector to handle multiple activities later
          onSelect={handleActivitySelect}
          onRemove={handleRemoveActivity}
          onClose={() => setSelectedSlot(null)}
          slotInfo={{
            day: selectedSlot.day,
            timeSlot: TIME_SLOTS.find(ts => ts.key === selectedSlot.timeSlot)?.label || selectedSlot.timeSlot
          }}
          targetClassName={targetClassName}
        />
      )}
    </div>
  );
}