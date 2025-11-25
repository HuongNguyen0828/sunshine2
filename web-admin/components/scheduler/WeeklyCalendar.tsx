/**
 * Generated with Claude Code (claude.ai/code)
 * Prompt: "think harder the current code base tells when CSS seems not working. Help me understand what are the possible reasons."
 * 
 * Weekly calendar component for daycare activity scheduling
 */
'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  onScheduleDeleted: (scheduleId: string) => void;
  onScheduleReordered: (scheduleId: string, newOrder: number, dayOfWeek: string, timeSlot: string) => void;
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
  onActivityRemoved,
  onScheduleDeleted,
  onScheduleReordered
}: WeeklyCalendarProps) {
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [draggedSchedule, setDraggedSchedule] = useState<Schedule | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<{ scheduleId: string; position: 'before' | 'after' } | null>(null);

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

  const handleMenuToggle = (e: React.MouseEvent, scheduleId: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === scheduleId ? null : scheduleId);
  };

  const handleDeleteSchedule = (e: React.MouseEvent, scheduleId: string) => {
    e.stopPropagation();
    onScheduleDeleted(scheduleId);
    setOpenMenuId(null);
  };

  const handleDragStart = (e: React.DragEvent, schedule: Schedule) => {
    // Don't start drag if menu is open
    if (openMenuId === schedule.id) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    setDraggedSchedule(schedule);
    setDragPreviewPosition({ x: e.clientX, y: e.clientY });
    e.dataTransfer.effectAllowed = 'move';

    // Create custom drag image (invisible - we'll use our own preview)
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, targetSchedule: Schedule) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedSchedule || draggedSchedule.id === targetSchedule.id) {
      setDropIndicatorPosition(null);
      return;
    }

    // Only allow reordering within the same slot
    if (draggedSchedule.dayOfWeek === targetSchedule.dayOfWeek &&
        draggedSchedule.timeSlot === targetSchedule.timeSlot) {
      e.dataTransfer.dropEffect = 'move';

      // Calculate if we should show indicator before or after this pill
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const position = e.clientY < midpoint ? 'before' : 'after';

      setDropIndicatorPosition({ scheduleId: targetSchedule.id, position });
    } else {
      setDropIndicatorPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetSchedule: Schedule) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedSchedule || draggedSchedule.id === targetSchedule.id) return;

    // Only allow reordering within the same slot
    if (draggedSchedule.dayOfWeek === targetSchedule.dayOfWeek &&
        draggedSchedule.timeSlot === targetSchedule.timeSlot) {
      onScheduleReordered(
        draggedSchedule.id,
        targetSchedule.order,
        targetSchedule.dayOfWeek,
        targetSchedule.timeSlot
      );
    }

    setDraggedSchedule(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    if (e.clientX === 0 && e.clientY === 0) return; // Ignore final drag event
    setDragPreviewPosition({ x: e.clientX, y: e.clientY });
  };

  const handleDragEnd = () => {
    setDraggedSchedule(null);
    setDragPreviewPosition(null);
    setDropIndicatorPosition(null);
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden relative">
      {/* Invisible backdrop when any menu is open - renders at calendar level */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-[100]"
          onClick={() => setOpenMenuId(null)}
        />
      )}

      {/* Drag preview - follows cursor */}
      {draggedSchedule && dragPreviewPosition && (
        <div
          className="fixed pointer-events-none z-[200]"
          style={{
            left: dragPreviewPosition.x,
            top: dragPreviewPosition.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, rotate: 0, opacity: 0 }}
            animate={{
              scale: 1.08,
              rotate: 5,
              opacity: 0.95,
            }}
            transition={{
              type: "spring",
              damping: 15,
              stiffness: 200,
            }}
            className="rounded-lg px-3 py-2 shadow-2xl border-2"
            style={{
              backgroundColor: draggedSchedule.activity?.color,
              borderColor: draggedSchedule.activity?.color,
              minWidth: '200px',
              filter: 'brightness(1.1)',
            }}
          >
            <h4 className="font-medium text-sm text-white truncate">
              {draggedSchedule.activity?.title}
            </h4>
            {draggedSchedule.activity?.description && (
              <p className="text-xs text-white/80 line-clamp-1 mt-0.5">
                {draggedSchedule.activity.description}
              </p>
            )}
          </motion.div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-6 divide-x divide-neutral-200">
        {/* Time column header */}
        <div className="bg-neutral-50 p-4 font-medium text-neutral-700">
          Time
        </div>

        {/* Day headers */}
        {WEEKDAYS.map(day => {
          const { name, date } = formatDayHeader(day);
          return (
            <div key={day} className="bg-neutral-50 p-4 text-center">
              <div className="font-medium text-neutral-900">{name}</div>
              <div className="text-sm text-neutral-500">{date}</div>
            </div>
          );
        })}

        {/* Time slots */}
        {TIME_SLOTS.map(timeSlot => (
          <div key={timeSlot.key} className="contents">
            {/* Time label */}
            <div className="bg-neutral-50 p-4 text-sm font-medium text-neutral-700 border-t border-neutral-200">
              <div>{timeSlot.label}</div>
              <div className="text-xs text-neutral-500">{timeSlot.time}</div>
            </div>
            
            {/* Day slots - Stacked activity pills UI */}
            {WEEKDAYS.map(day => {
              const slotSchedules = getSchedulesForSlot(day, timeSlot.key);
              return (
                <div
                  key={`${day}-${timeSlot.key}`}
                  className="min-h-[140px] p-2 border-t border-neutral-200 hover:bg-neutral-50 transition-colors"
                >
                  <div className="h-full flex flex-col gap-2">
                    {/* Activity pills - stacked vertically with Framer Motion */}
                    <AnimatePresence mode="popLayout">
                      {slotSchedules.map((schedule) => (
                        <div key={schedule.id} className="relative">
                          {/* Drop indicator line - shows BEFORE this pill */}
                          {dropIndicatorPosition?.scheduleId === schedule.id &&
                            dropIndicatorPosition.position === 'before' && (
                            <motion.div
                              initial={{ opacity: 0, scaleX: 0 }}
                              animate={{ opacity: 1, scaleX: 1 }}
                              exit={{ opacity: 0, scaleX: 0 }}
                              transition={{
                                type: "spring",
                                damping: 20,
                                stiffness: 300,
                              }}
                              className="absolute -top-1 left-0 right-0 h-[3px] bg-blue-500 rounded-full z-10"
                              style={{
                                boxShadow: '0 0 12px rgba(59, 130, 246, 0.8)',
                              }}
                            />
                          )}

                          <motion.div
                            layoutId={schedule.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{
                              opacity: draggedSchedule?.id === schedule.id ? 0.3 : 1,
                              y: 0,
                              scale: draggedSchedule?.id === schedule.id ? 0.95 : 1,
                            }}
                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                            whileHover={
                              openMenuId === schedule.id || draggedSchedule?.id === schedule.id
                                ? {}
                                : { scale: 1.02, transition: { duration: 0.15 } }
                            }
                            transition={{
                              layout: {
                                type: "spring",
                                damping: 25,
                                stiffness: 400,
                                mass: 0.8,
                              },
                              opacity: { duration: 0.15 },
                              scale: { duration: 0.15 },
                            }}
                            onDragOver={(e) => handleDragOver(e, schedule)}
                            onDrop={(e) => handleDrop(e, schedule)}
                            className={`group relative rounded-lg px-3 py-2 ${
                              openMenuId === schedule.id || draggedSchedule?.id === schedule.id ? '' : 'shadow-sm'
                            }`}
                            style={{
                              backgroundColor: schedule.activity?.color + '20',
                              borderLeft: `4px solid ${schedule.activity?.color}`,
                            }}
                          >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, schedule)}
                            onDrag={handleDrag}
                            onDragEnd={handleDragEnd}
                            className="flex-1 min-w-0 cursor-move"
                            onClick={() => handleSlotClick(day, timeSlot.key)}
                          >
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

                          {/* Menu button with dropdown */}
                          <div className="relative">
                            <button
                              onClick={(e) => handleMenuToggle(e, schedule.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 text-xs p-1 hover:bg-white rounded cursor-pointer z-[110]"
                            >
                              ⋮⋮
                            </button>

                            {/* Dropdown menu - backdrop is at calendar root level */}
                            {openMenuId === schedule.id && (
                              <div
                                className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[110] min-w-[120px]"
                                onMouseEnter={() => setDraggedSchedule(null)}
                                onMouseOver={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => handleDeleteSchedule(e, schedule.id)}
                                  onMouseEnter={(e) => e.stopPropagation()}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                          </motion.div>

                          {/* Drop indicator line - shows AFTER this pill */}
                          {dropIndicatorPosition?.scheduleId === schedule.id &&
                            dropIndicatorPosition.position === 'after' && (
                            <motion.div
                              initial={{ opacity: 0, scaleX: 0 }}
                              animate={{ opacity: 1, scaleX: 1 }}
                              exit={{ opacity: 0, scaleX: 0 }}
                              transition={{
                                type: "spring",
                                damping: 20,
                                stiffness: 300,
                              }}
                              className="absolute -bottom-1 left-0 right-0 h-[3px] bg-blue-500 rounded-full z-10"
                              style={{
                                boxShadow: '0 0 12px rgba(59, 130, 246, 0.8)',
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </AnimatePresence>

                    {/* Add activity button */}
                    <motion.button
                      onClick={() => handleSlotClick(day, timeSlot.key)}
                      whileHover={{ scale: 1.02, borderColor: 'rgb(156, 163, 175)' }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", damping: 15, stiffness: 300 }}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-xs text-gray-500 border-2 border-dashed border-gray-200 rounded-lg hover:text-gray-700 hover:bg-white transition-colors"
                    >
                      <span className="text-base">+</span>
                      <span>Add activity</span>
                    </motion.button>
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