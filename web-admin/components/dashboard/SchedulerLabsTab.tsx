/**
 * Generated with Claude Code (claude.ai/code)
 * Prompt: "think harder the current code base tells when CSS seems not working. Help me understand what are the possible reasons."
 * 
 * Scheduler labs tab component for the dashboard
 */
'use client';

import { LocationLite } from "@/services/useLocationsAPI";
import { WeeklyScheduler } from "../scheduler/WeeklyScheduler";
// import { ClassLite } from "@/app/dashboard/[uid]/page";
import { Class } from "../../../shared/types/type";

// This tab component serves as the bridge between the web-admin's consciousness
// and the transplanted scheduler components - a meeting space for different UI paradigms
export default function SchedulerLabsTab({ showClasses, locations }: { showClasses: Class[], locations: LocationLite[] }) {
  return (
    <div className="h-full">
      {/* Container that adapts the scheduler to web-admin's layout patterns */}
      <div className="h-full overflow-auto">
        <WeeklyScheduler
          showClasses={showClasses}
          locations={locations}
        />
      </div>
    </div>
  );
}