"use client";

import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";
import { cn } from "@/lib/utils";
import type { Tab } from "@/types/forms";

interface ShellProps {
  children: ReactNode;
  className?: string;
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

export function Shell({ children, className, activeTab, onTabChange }: ShellProps) {
  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className={cn("flex-1 overflow-y-auto p-6", className)}>
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}