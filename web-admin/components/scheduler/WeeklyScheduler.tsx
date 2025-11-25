/**
 * Generated with Claude Code (claude.ai/code)
 * Prompt: "think harder the current code base tells when CSS seems not working. Help me understand what are the possible reasons."
 * 
 * Main weekly scheduler component that combines calendar and activity management
 */
'use client';

import { useState, useEffect, useMemo } from "react";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { ActivityLibrary } from "./ActivityLibrary";
import { ActivityForm } from "./ActivityForm";
import { WEEKDAYS, type Activity, type Schedule } from "@/types/scheduler";
import type { Class } from "../../../shared/types/type";
// import { fetchClasses } from "@/services/useClassesAPI";
import * as SchedulerAPI from "@/services/useSchedulerAPI";
import { LocationLite } from "@/services/useLocationsAPI";
// import { ClassLite } from "@/app/dashboard/[uid]/page";


// This component represents the consciousness transplant - taking the original
// scheduler's reactive patterns and adapting them to local state management
export function WeeklyScheduler({ showClasses, locations }: { showClasses: Class[], locations: LocationLite[] }) {
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();

    // Force the time to noon to avoid timezone boundary issues
    today.setHours(12, 0, 0, 0);

    // Get Monday of current week
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    // Reset to noon to avoid timezone issues
    monday.setHours(12, 0, 0, 0);

    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const day = String(monday.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  });

  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showActivityLibrary, setShowActivityLibrary] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]); // Schedules of each class
  const [schedulesData, setSchedulesData] = useState<any[]>([]); // Raw backend data with classId
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>(showClasses); // using Class type, loading class from dashboard props, not backend calls
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const defaultLocationView: string = locations.length > 1 ? "all" : locations[0].id;
  const [locationView, setLocationView] = useState<string>(defaultLocationView);
  const [selectedClassOrAllClasses, setSelectedClassOrAllClasses] = useState<boolean>(true); //default to class itself, else location


  // Load initial data - using real Firebase backend
  useEffect(() => {
    const loadData = async () => {
      try {
        const [rawSchedulesData] = await Promise.all([
          SchedulerAPI.fetchSchedules(currentWeek, "*"), // fetch all schedules for all classes at once, and change filtering logic locally
          // fetchClasses()
        ]);

        // Store raw data with classId for filtering
        setSchedulesData(rawSchedulesData);

        // Convert schedules to activities for library display
        const uniqueActivities = new Map<string, Activity>();
        rawSchedulesData.forEach(schedule => {
          const key = schedule.activityTitle; // Activities are now class-agnostic
          if (!uniqueActivities.has(key)) {
            uniqueActivities.set(key, {
              id: key,
              type: schedule.type,
              title: schedule.activityTitle,
              description: schedule.activityDescription,
              materials: schedule.activityMaterials,
              color: schedule.color || '#3B82F6', // Default to blue if no color
              userId: schedule.userId,
            });
          }
        });

        setActivities(Array.from(uniqueActivities.values()));
        setSchedules(rawSchedulesData.map(s => ({
          id: s.id,
          type: s.type,
          userId: s.userId,
          weekStart: s.weekStart,
          dayOfWeek: s.dayOfWeek,
          timeSlot: s.timeSlot,
          activityId: s.activityTitle,
          order: s.order || 0,
          activity: {
            id: s.activityTitle,
            type: s.type,
            title: s.activityTitle,
            description: s.activityDescription,
            materials: s.activityMaterials,
            color: s.color || '#3B82F6',
            userId: s.userId,
          }
        })));
        setClasses(showClasses || []);
      } catch (error) {
        console.error('Error loading scheduler data:', error);
      } finally {
        setLoading(false);
      }
    };

    console.log('Week range debug:', {
      weekStart: currentWeek,
      monday: new Date(currentWeek).toDateString(),
      friday: new Date(new Date(currentWeek).setDate(new Date(currentWeek).getDate() + 4)).toDateString(),
      weekdays: WEEKDAYS // Check this has 5 days
    });

    loadData();
  }, [currentWeek]); // always load all classes and all locations on week change

  const navigateWeek = (direction: 'prev' | 'next') => {
    const [year, month, day] = currentWeek.split('-').map(Number);
    const current = new Date(year, month - 1, day, 12); // Use noon to avoid timezone issues

    const days = direction === 'next' ? 7 : -7;
    current.setDate(current.getDate() + days);

    const newYear = current.getFullYear();
    const newMonth = String(current.getMonth() + 1).padStart(2, '0');
    const newDay = String(current.getDate()).padStart(2, '0');

    setCurrentWeek(`${newYear}-${newMonth}-${newDay}`);
  };

  const formatWeekRange = (weekStart: string) => {
    // Parse the date properly without timezone issues
    const [year, month, day] = weekStart.split('-').map(Number);
    const start = new Date(year, month - 1, day); // Local date
    const end = new Date(year, month - 1, day + 4); // Local date + 4 days

    const startFormatted = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    const endFormatted = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return `${startFormatted} - ${endFormatted}`;
  };

  const handleActivityCreated = async (activityData: Omit<Activity, 'id' | '_creationTime' | 'userId'>) => {
    try {
      // Just add to local state - activities are created when scheduled
      const newActivity: Activity = {
        ...activityData,
        id: `${activityData.title}-${Date.now()}`, // Use timestamp for unique ID
      };
      setActivities(prev => [newActivity, ...prev]);
      setShowActivityForm(false);
    } catch (error) {
      console.error('Error creating activity:', error);
    }
  };

  const handleActivityDeleted = async (id: string) => {
    try {
      // Delete all schedules using this activity
      const schedulesToDelete = schedules.filter(s => s.activityId === id);
      await Promise.all(schedulesToDelete.map(s => SchedulerAPI.deleteSchedule(s.id)));

      setActivities(prev => prev.filter(a => a.id !== id));
      setSchedulesData(prev => prev.filter(s => s.activityTitle !== id));
      setSchedules(prev => prev.filter(s => s.activityId !== id));
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  const handleActivityAssigned = async (params: {
    dayOfWeek: string;
    timeSlot: string;
    activityId: string;
    targetClassId?: string;
    targetLocationId?: string;
  }) => {
    try {
      // Find the activity to get its details
      const activity = activities.find(a => a.id === params.activityId);
      if (!activity) {
        console.error('Activity not found:', params.activityId);
        return;
      }

      if (locationView === defaultLocationView) {
        alert("Cannot assign activity: please select a location first.");
        return;
      }

      // Calculate the next order position for this slot
      const existingSchedulesInSlot = schedules.filter(s =>
        s.dayOfWeek === params.dayOfWeek && s.timeSlot === params.timeSlot
      );
      const nextOrder = existingSchedulesInSlot.length;

      // Create new schedule with activity data embedded
      // Use targetClassId if provided (from multi-calendar view), otherwise use selectedClassId'
      let newSchedule: any;
      if (selectedClassOrAllClasses) { // Assigning to specific class
        const assignToClassId = params.targetClassId || selectedClassId;

        newSchedule = await SchedulerAPI.createSchedule({
          weekStart: currentWeek,
          type: activity.type,
          dayOfWeek: params.dayOfWeek,
          timeSlot: params.timeSlot,
          activityTitle: activity.title,
          locationId: locationView, // location passed from filter context, or by select in form mactching with class location
          activityDescription: activity.description,
          activityMaterials: activity.materials,
          classId: assignToClassId,
          color: activity.color,
          order: nextOrder,
        });
      } else {
        // Assigning to location
        newSchedule = await SchedulerAPI.createSchedule({
          weekStart: currentWeek,
          type: activity.type,
          dayOfWeek: params.dayOfWeek,
          timeSlot: params.timeSlot,
          activityTitle: activity.title,
          activityDescription: activity.description,
          activityMaterials: activity.materials,
          classId: "*", // Indicate all classes of this location. Backend should interpret this accordingly when fetching
          locationId: locationView, // location passed from filter context, or by select in form mactching with class location
          color: activity.color,
          order: nextOrder,
        });
      };
      // Update raw backend data - add to existing schedules, don't replace
      setSchedulesData(prev => [...prev, newSchedule]);

      setSchedules(prev => [...prev, {
        id: newSchedule.id,
        type: newSchedule.type,
        userId: newSchedule.userId,
        weekStart: newSchedule.weekStart,
        dayOfWeek: newSchedule.dayOfWeek,
        timeSlot: newSchedule.timeSlot,
        activityId: params.activityId,
        activity,
        order: nextOrder,
      }]);
    } catch (error) {
      console.error('Error assigning activity:', error);
    }
  };

  const handleActivityRemoved = async (params: {
    dayOfWeek: string;
    timeSlot: string;
  }) => {
    try {
      const scheduleToRemove = schedules.find(s =>
        s.dayOfWeek === params.dayOfWeek && s.timeSlot === params.timeSlot
      );

      if (scheduleToRemove) {
        await SchedulerAPI.deleteSchedule(scheduleToRemove.id);
        setSchedulesData(prev => prev.filter(s => s.id !== scheduleToRemove.id));
        setSchedules(prev => prev.filter(s => s.id !== scheduleToRemove.id));
      }
    } catch (error) {
      console.error('Error removing activity from schedule:', error);
    }
  };

  const handleScheduleDeleted = async (scheduleId: string) => {
    try {
      await SchedulerAPI.deleteSchedule(scheduleId);
      setSchedulesData(prev => prev.filter(s => s.id !== scheduleId));
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const handleScheduleReordered = async (
    scheduleId: string,
    newOrder: number,
    dayOfWeek: string,
    timeSlot: string
  ) => {
    try {
      // Get all schedules in the same slot
      const slotSchedules = schedules.filter(
        s => s.dayOfWeek === dayOfWeek && s.timeSlot === timeSlot
      ).sort((a, b) => (a.order || 0) - (b.order || 0));

      const draggedSchedule = slotSchedules.find(s => s.id === scheduleId);
      if (!draggedSchedule) return;

      const oldOrder = draggedSchedule.order;

      // Reorder locally for immediate feedback
      const reordered = slotSchedules.map(s => {
        if (s.id === scheduleId) {
          return { ...s, order: newOrder };
        }
        // Shift others
        if (oldOrder < newOrder) {
          // Moving down
          if (s.order > oldOrder && s.order <= newOrder) {
            return { ...s, order: s.order - 1 };
          }
        } else {
          // Moving up
          if (s.order >= newOrder && s.order < oldOrder) {
            return { ...s, order: s.order + 1 };
          }
        }
        return s;
      });

      // Update local state
      setSchedules(prev => {
        const filtered = prev.filter(
          s => !(s.dayOfWeek === dayOfWeek && s.timeSlot === timeSlot)
        );
        return [...filtered, ...reordered];
      });

      // TODO: Add backend API to update order
      // For now, we'll need to delete and recreate schedules in new order
      // This is a limitation we can improve later with a PATCH endpoint

    } catch (error) {
      console.error('Error reordering schedule:', error);
    }
  };

  const scheduleLookup = useMemo(() => {
    schedulesData.reduce((lookup, schedule) => {
      lookup[schedule.id] = schedule;
      return lookup;
    }, {} as Record<string, any>);
  }, [schedulesData]);



  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 border border-neutral-200 hover:bg-neutral-50 transition-colors text-neutral-600"
            aria-label="Previous week"
          >
            ←
          </button>
          <h3 className="text-lg font-medium text-neutral-900">
            Week of {formatWeekRange(currentWeek)}
          </h3>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 border border-neutral-200 hover:bg-neutral-50 transition-colors text-neutral-600"
            aria-label="Next week"
          >
            →
          </button>

          {/* Location Filter */}
          <select
            className="px-4 py-2 border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 outline-none bg-white text-neutral-700"
            value={locationView}
            onChange={(e) => {
              setLocationView(e.target.value);
            }}
            required
          >
            <option value="" disabled>
              Select a view location
            </option>
            {(locations ?? []).map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
            {locations.length > 1 && <option value={defaultLocationView}>All locations</option>}
          </select>

          {/* Class Filter Dropdown */}
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-4 py-2 border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 outline-none bg-white text-neutral-700"
          >
            <option value="all">All Classes</option>
            {classes.filter(cls => cls.locationId === locationView || locationView === "all").map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowActivityLibrary(true)}
            className="px-4 py-2 text-neutral-700 border border-neutral-200 hover:bg-neutral-50 transition-colors"
          >
            My Activities ({activities.length})
          </button>
          <button
            onClick={() => setShowActivityForm(true)}
            className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
          >
            + New Activity
          </button>
        </div>
      </div>

      {/* Weekly Calendar */}
      <div className="space-y-8">
        {classes.filter(cls => {
          if (locationView !== defaultLocationView) {
            if (cls.locationId != locationView) {
              return false;
            }
          }
          if (selectedClassId != "all") {
            return cls.id === selectedClassId;
          }
          return true;
        }).map((cls) => {
          const classSchedules = schedules.filter(s => {
            const rawSchedule = schedulesData.find(rs => rs.id === s.id);
            if (rawSchedule.classId !== "*") {
              return rawSchedule && (rawSchedule.classId === cls.id);
            } else {
              return rawSchedule && (rawSchedule.locationId === cls.locationId);
            }
          });

          return (
            <div key={cls.id}>
              <h3 className="text-lg font-medium text-neutral-900 mb-4">{cls.name}</h3>
              <WeeklyCalendar
                weekStart={currentWeek}
                schedules={classSchedules}
                activities={activities}
                targetClassIdWithLocation={{ classId: cls.id, locationId: locationView }} // pass classId or locationId as fallback for shared activities applied to all classes of that location
                targetClassName={cls.name}
                targetLocationName={locationView === defaultLocationView ? "All Locations" : locations.find(loc => loc.id === locationView)?.name}
                onActivityAssigned={handleActivityAssigned}
                setSelectedClassOrAllClasses={setSelectedClassOrAllClasses} // boolean setter indicating class or location used in handle Activity Assigned
                selectedClassOrAllClasses={selectedClassOrAllClasses} // boolean indicating class or location used in handle Activity Assigned
                onActivityRemoved={handleActivityRemoved}
                onScheduleDeleted={handleScheduleDeleted}
                onScheduleReordered={handleScheduleReordered}
              />
            </div>
          );
        })}
      </div>

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