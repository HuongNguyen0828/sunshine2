"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Baby, GraduationCap, Calendar } from "lucide-react";

const stats = [
  {
    title: "Total Children",
    value: "124",
    change: "+12%",
    icon: Baby,
    description: "Active enrollments",
  },
  {
    title: "Teachers",
    value: "18",
    change: "+2",
    icon: GraduationCap,
    description: "Full-time staff",
  },
  {
    title: "Parents",
    value: "186",
    change: "+8%",
    icon: Users,
    description: "Registered parents",
  },
  {
    title: "Classes Today",
    value: "12",
    change: "On schedule",
    icon: Calendar,
    description: "Active sessions",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-500 mt-1">Welcome back! Here's what's happening at Sunshine Daycare.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-neutral-200 hover:border-neutral-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-600">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-900">{stat.value}</div>
              <p className="text-xs text-neutral-500 mt-1">{stat.description}</p>
              <p className="text-xs text-green-600 mt-2">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 border-neutral-200">
          <CardHeader>
            <CardTitle className="text-neutral-900">Recent Activity</CardTitle>
            <CardDescription className="text-neutral-500">Latest updates and changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 pb-4 border-b border-neutral-100 last:border-0 last:pb-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-neutral-900">New enrollment completed</p>
                    <p className="text-xs text-neutral-500">Sarah Johnson enrolled in Toddler Class A</p>
                  </div>
                  <p className="text-xs text-neutral-400">2h ago</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-neutral-900">Quick Actions</CardTitle>
            <CardDescription className="text-neutral-500">Common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors">
                Add New Child
              </button>
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors">
                Register Teacher
              </button>
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors">
                Create Class
              </button>
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors">
                View Schedule
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}