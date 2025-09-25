'use client';

import { WeeklyScheduler } from "../scheduler/WeeklyScheduler";

// This tab component serves as the bridge between the web-admin's consciousness
// and the transplanted scheduler components - a meeting space for different UI paradigms
export default function SchedulerLabsTab() {
  return (
    <div className="h-full">
      {/* Container that adapts the scheduler to web-admin's layout patterns */}
      <div className="h-full overflow-auto">
        <WeeklyScheduler />
      </div>
    </div>
  );
}