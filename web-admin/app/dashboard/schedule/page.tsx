export default function SchedulePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-neutral-900">Schedule</h1>
        <p className="text-neutral-500 mt-1">View and manage daycare schedules and activities.</p>
      </div>

      {/* Note: Scheduler is accessed through the main Dashboard tabs */}
      <div className="p-8 border border-neutral-200 text-center text-neutral-500">
        <p>Access the Scheduler through the main Dashboard.</p>
        <p className="text-sm mt-2">Navigate to Dashboard → Scheduler Labs tab</p>
      </div>
    </div>
  );
}