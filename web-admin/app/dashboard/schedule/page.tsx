import { WeeklyScheduler } from "@/components/scheduler/WeeklyScheduler";

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-neutral-900">Schedule</h1>
        <p className="text-neutral-500 mt-1">View and manage daycare schedules and activities.</p>
      </div>

      {/* Scheduler */}
      <WeeklyScheduler />
    </div>
  );
}