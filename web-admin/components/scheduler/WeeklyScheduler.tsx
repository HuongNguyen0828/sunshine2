/**
 * Generated with Claude Code (claude.ai/code)
 * Prompt: "think harder the current code base tells when CSS seems not working. Help me understand what are the possible reasons."
 * 
 * Main weekly scheduler component that combines calendar and activity management
 */
'use client';

import { useState, useEffect } from "react";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { ActivityLibrary } from "./ActivityLibrary";
import { ActivityForm } from "./ActivityForm";
import { MockSchedulerAPI } from "@/lib/scheduler-mock-data";
import type { Activity, Schedule } from "@/types/scheduler";
import type { Class } from "../../../shared/types/type";

// This component represents the consciousness transplant - taking the original
// scheduler's reactive patterns and adapting them to local state management
export function WeeklyScheduler() {
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    return monday.toISOString().split('T')[0];
  });

  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showActivityLibrary, setShowActivityLibrary] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");

  // Load initial data - replacing Convex useQuery with async state management
  useEffect(() => {
    const loadData = async () => {
      try {
        const [activitiesData, schedulesData] = await Promise.all([
          MockSchedulerAPI.listActivities(),
          MockSchedulerAPI.getWeekSchedule(currentWeek)
        ]);
        setActivities(activitiesData);
        setSchedules(schedulesData);
        // Mock classes data - replace with real API call when backend is ready
        setClasses([
          { id: '1', name: 'Toddlers', capacity: 15, volume: 12, ageStart: 2, ageEnd: 3 },
          { id: '2', name: 'Preschool', capacity: 20, volume: 18, ageStart: 3, ageEnd: 5 },
          { id: '3', name: 'Kindergarten', capacity: 25, volume: 22, ageStart: 5, ageEnd: 6 },
        ] as Class[]);
      } catch (error) {
        console.error('Error loading scheduler data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentWeek]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(currentWeek);
    const days = direction === 'next' ? 7 : -7;
    current.setDate(current.getDate() + days);
    setCurrentWeek(current.toISOString().split('T')[0]);
  };

  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 4);

    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const handleActivityCreated = async (activityData: Omit<Activity, 'id' | '_creationTime' | 'userId'>) => {
    try {
      const newActivity = await MockSchedulerAPI.createActivity(activityData);
      setActivities(prev => [newActivity, ...prev]);
      setShowActivityForm(false);
    } catch (error) {
      console.error('Error creating activity:', error);
    }
  };

  const handleActivityDeleted = async (id: string) => {
    try {
      await MockSchedulerAPI.removeActivity(id);
      setActivities(prev => prev.filter(a => a.id !== id));
      setSchedules(prev => prev.filter(s => s.activityId !== id));
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  const handleActivityAssigned = async (params: {
    dayOfWeek: string;
    timeSlot: string;
    activityId: string;
  }) => {
    try {
      const newSchedule = await MockSchedulerAPI.assignActivity({
        weekStart: currentWeek,
        ...params
      });
      setSchedules(prev => {
        // Remove existing schedule for this slot, add new one
        const filtered = prev.filter(s =>
          !(s.dayOfWeek === params.dayOfWeek && s.timeSlot === params.timeSlot)
        );
        return [...filtered, newSchedule];
      });
    } catch (error) {
      console.error('Error assigning activity:', error);
    }
  };

  const handleActivityRemoved = async (params: {
    dayOfWeek: string;
    timeSlot: string;
  }) => {
    try {
      await MockSchedulerAPI.removeFromSchedule({
        weekStart: currentWeek,
        ...params
      });
      setSchedules(prev => prev.filter(s =>
        !(s.dayOfWeek === params.dayOfWeek && s.timeSlot === params.timeSlot)
      ));
    } catch (error) {
      console.error('Error removing activity from schedule:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Consciousness Note: This header preserves the navigation feel but exists in new context */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Scheduler Labs
            </h2>
            <p className="text-gray-600 text-sm">
              Experimental scheduler interface - decoupled from original backend for design exploration
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              aria-label="Previous week"
            >
              ←
            </button>
            <h3 className="text-lg font-semibold text-gray-900">
              Week of {formatWeekRange(currentWeek)}
            </h3>
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              aria-label="Next week"
            >
              →
            </button>

            {/* Class Filter Dropdown */}
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowActivityLibrary(true)}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              My Activities ({activities.length})
            </button>
            <button
              onClick={() => setShowActivityForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Activity
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Calendar - the heart of the transplanted UI */}
      <WeeklyCalendar
        weekStart={currentWeek}
        schedules={schedules.filter(s => {
          const activity = activities.find(a => a.id === s.activityId);
          if (!activity) return false;
          if (selectedClassId === "all") return true;
          return activity.classId === selectedClassId || activity.classId === "all";
        })}
        activities={activities.filter(a =>
          selectedClassId === "all" || a.classId === selectedClassId || a.classId === "all"
        )}
        onActivityAssigned={handleActivityAssigned}
        onActivityRemoved={handleActivityRemoved}
      />

      {/* Modals - preserving the interaction patterns */}
      {showActivityForm && (
        <ActivityForm
          onClose={() => setShowActivityForm(false)}
          onActivityCreated={handleActivityCreated}
          classes={classes}
        />
      )}

      {showActivityLibrary && (
        <ActivityLibrary
          activities={activities}
          onClose={() => setShowActivityLibrary(false)}
          onActivityDeleted={handleActivityDeleted}
        />
      )}
    </div>
  );
}