'use client';

import { useState } from 'react';
import type { Tab } from '@/types/forms';

export default function SidebarNav({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '◉' },
    { id: 'teachers', label: 'Teachers', icon: '👤' },
    { id: 'children', label: 'Students', icon: '👥' },
    { id: 'parents', label: 'Parents', icon: '👪' },
    { id: 'classes', label: 'Classes', icon: '▢' },
    { id: 'scheduler-labs', label: 'Scheduler', icon: '📅' },
  ];

  return (
    <aside className={`p-4 transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-20' : 'w-72'
    }`}>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col h-full overflow-hidden">
        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm ${
                active === item.id
                  ? 'bg-gray-900 text-white font-medium shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="text-sm font-semibold flex-shrink-0 w-5 text-center">{item.icon}</span>
              {!isCollapsed && (
                <span className="transition-opacity duration-200 opacity-100">
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Toggle Button at Bottom */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : undefined}
          >
            <span className="text-sm font-semibold flex-shrink-0 w-5 text-center">⋮⋮</span>
            {!isCollapsed && <span>Toggle</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
