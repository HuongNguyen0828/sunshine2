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
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'teachers', label: 'Teachers', icon: '👨‍🏫' },
    { id: 'children', label: 'Students', icon: '👶' },
    { id: 'parents', label: 'Parents', icon: '👨‍👩‍👧' },
    { id: 'classes', label: 'Classes', icon: '🎓' },
    { id: 'scheduler-labs', label: 'Scheduler', icon: '📅' },
  ];

  return (
    <aside
      className={`bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Toggle Button */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200 hover:bg-white/80 hover:border-gray-300 text-gray-700 transition-all duration-200"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="text-lg transition-transform duration-200">
            {isCollapsed ? '→' : '←'}
          </span>
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
              active === item.id
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="text-lg flex-shrink-0">{item.icon}</span>
            {!isCollapsed && (
              <span className="transition-opacity duration-200 opacity-100">
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}
