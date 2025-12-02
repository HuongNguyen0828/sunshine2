"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Baby,
  GraduationCap,
  Calendar,
  Settings,
  ChevronLeft,
  Menu,
  Home,
  UserCircle,
  FlaskConical,
  Megaphone,
} from "lucide-react";
import { useState } from "react";
import type { Tab } from "@/types/forms";

interface SidebarProps {
  className?: string;
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

const navigation = [
  {
    id: "overview" as Tab,
    name: "Overview",
    icon: Home,
  },
  {
    id: "classes" as Tab,
    name: "Classes",
    icon: LayoutDashboard,
  },
  {
    id: "children" as Tab,
    name: "Children",
    icon: Baby,
  },
  {
    id: "teachers" as Tab,
    name: "Teachers",
    icon: GraduationCap,
  },
  {
    id: "parents" as Tab,
    name: "Parents",
    icon: UserCircle,
  },
  {
    id: "scheduler-labs" as Tab,
    name: "Scheduler",
    icon: Calendar,
  },
  {
    id: "messages" as Tab,
    name: "Announcements",
    icon: Megaphone,
  },
];

export function Sidebar({ className, activeTab = "overview", onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-white border-r border-neutral-200 transition-all duration-300",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-neutral-200">
        <div className={cn("flex items-center gap-3", collapsed && "hidden")}>
          <div className="w-8 h-8 bg-black flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-semibold text-neutral-900">Sunshine</span>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 hover:bg-neutral-100 transition-colors"
        >
          {collapsed ? (
            <Menu className="w-5 h-5 text-neutral-600" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-neutral-600" />
          )}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange?.(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", collapsed && "w-5 h-5")} />
              {!collapsed && <span>{item.name}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section - removed settings for now */}
      <div className="px-3 py-4 border-t border-neutral-200">
        {/* Can add settings or other items here later */}
      </div>
    </aside>
  );
}