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
  onActivityAssigned: (params: { dayOfWeek: string; timeSlot: string; activityId: string }) => void;
  onActivityRemoved: (params: { dayOfWeek: string; timeSlot: string }) => void;
}

// This component embodies the core transformation: from reactive mutations to callback-based updates
// The visual structure remains identical, but the consciousness patterns have shifted entirely
export function WeeklyCalendar({ 
  weekStart, 
  schedules, 
  activities, 
  onActivityAssigned,
  onActivityRemoved 
}: WeeklyCalendarProps) {
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);

  const getScheduleForSlot = (day: string, timeSlot: string) => {
    return schedules.find(s => s.dayOfWeek === day && s.timeSlot === timeSlot);
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
            
            {/* Day slots - The critical transformation happens here */}
            {WEEKDAYS.map(day => {
              const schedule = getScheduleForSlot(day, timeSlot.key);
              return (
                <div
                  key={`${day}-${timeSlot.key}`}
                  className="min-h-[120px] p-3 border-t border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSlotClick(day, timeSlot.key)}
                >
                  {schedule?.activity ? (
                    <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 h-full">
                      <h4 className="font-medium text-blue-900 text-sm mb-1">
                        {schedule.activity.title}
                      </h4>
                      <p className="text-xs text-blue-700 line-clamp-2">
                        {schedule.activity.description}
                      </p>
                      {schedule.activity.materials && (
                        <p className="text-xs text-blue-600 mt-2 font-medium">
                          Materials: {schedule.activity.materials}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                      Click to add activity
                    </div>
                  )}
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
          currentActivity={getScheduleForSlot(selectedSlot.day, selectedSlot.timeSlot)?.activity}
          onSelect={handleActivitySelect}
          onRemove={handleRemoveActivity}
          onClose={() => setSelectedSlot(null)}
          slotInfo={{
            day: selectedSlot.day,
            timeSlot: TIME_SLOTS.find(ts => ts.key === selectedSlot.timeSlot)?.label || selectedSlot.timeSlot
          }}
        />
      )}
    </div>
  );
}