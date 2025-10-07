'use client';

import { useState } from 'react';
import type { Tab } from '@/types/forms';

// SVG Icon Components
const OverviewIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="9" cy="9" r="7" />
    <circle cx="9" cy="9" r="2" fill="currentColor" />
  </svg>
);

const TeachersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="9" cy="5" r="3" />
    <path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
  </svg>
);

const StudentsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="6" cy="5" r="2.5" />
    <circle cx="12" cy="5" r="2.5" />
    <path d="M2 16c0-2.2 1.8-4 4-4s4 1.8 4 4" strokeLinecap="round" />
    <path d="M8 16c0-2.2 1.8-4 4-4s4 1.8 4 4" strokeLinecap="round" />
  </svg>
);

const ParentsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="5" cy="4" r="2" />
    <circle cx="13" cy="4" r="2" />
    <path d="M1 14c0-2.2 1.8-4 4-4s4 1.8 4 4" strokeLinecap="round" />
    <path d="M9 14c0-2.2 1.8-4 4-4s4 1.8 4 4" strokeLinecap="round" />
    <circle cx="9" cy="11" r="1.5" fill="currentColor" />
  </svg>
);

const ClassesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="2" width="6" height="6" rx="1" />
    <rect x="10" y="2" width="6" height="6" rx="1" />
    <rect x="2" y="10" width="6" height="6" rx="1" />
    <rect x="10" y="10" width="6" height="6" rx="1" />
  </svg>
);

const SchedulerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="3" width="14" height="13" rx="2" />
    <path d="M2 7h14" />
    <path d="M6 1v4" strokeLinecap="round" />
    <path d="M12 1v4" strokeLinecap="round" />
  </svg>
);

const ToggleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 6h5" strokeLinecap="round" />
    <path d="M2 9h5" strokeLinecap="round" />
    <path d="M2 12h5" strokeLinecap="round" />
  </svg>
);

export default function SidebarNav({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems: { id: Tab; label: string; icon: JSX.Element }[] = [
    { id: 'overview', label: 'Overview', icon: <OverviewIcon /> },
    { id: 'teachers', label: 'Teachers', icon: <TeachersIcon /> },
    { id: 'children', label: 'Students', icon: <StudentsIcon /> },
    { id: 'parents', label: 'Parents', icon: <ParentsIcon /> },
    { id: 'classes', label: 'Classes', icon: <ClassesIcon /> },
    { id: 'scheduler-labs', label: 'Scheduler', icon: <SchedulerIcon /> },
  ];

  return (
    <aside className={`p-3 transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-[72px]' : 'w-72'
    }`}>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col h-full overflow-hidden">
        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 text-sm overflow-hidden ${
                isCollapsed ? 'justify-center aspect-square' : 'px-3 py-2.5'
              } ${
                active === item.id
                  ? 'bg-gray-900 text-white font-medium shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className={`flex-shrink-0 flex items-center justify-center ${
                isCollapsed ? 'w-full' : 'w-5'
              }`}>{item.icon}</span>
              {!isCollapsed && (
                <span className="transition-opacity duration-200 opacity-100 whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Toggle Button at Bottom */}
        <div className="p-2 border-t border-gray-100">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 overflow-hidden ${
              isCollapsed ? 'justify-center aspect-square' : 'px-3 py-2.5'
            }`}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : undefined}
          >
            <span className={`flex-shrink-0 flex items-center justify-center ${
              isCollapsed ? 'w-full' : 'w-5'
            }`}><ToggleIcon /></span>
            {!isCollapsed && <span className="whitespace-nowrap">Toggle</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
