"use client";

import { Users, Baby, GraduationCap, TrendingUp, Clock, AlertCircle, CalendarDays, DollarSign } from "lucide-react";
import type { LocationLite } from "@/services/useLocationsAPI";
import type { CountStats } from "@/app/dashboard/[uid]/page";

interface OverviewProps {
  teacherCount: CountStats;
  childCount: CountStats;
  parentCount: CountStats;
  classCount: CountStats;
  locations: LocationLite[];
}

export default function Overview({
  teacherCount,
  childCount,
  parentCount,
  classCount,
  locations,
}: OverviewProps) {
  // Calculate capacity metrics
  const totalCapacity = locations.reduce((sum, loc) => sum + (loc.capacity || 0), 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((childCount.total / totalCapacity) * 100) : 0;
  const availableSpots = totalCapacity - childCount.total;

  // Today's date for context
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Overview</h1>
        <p className="text-sm text-neutral-500 mt-1">{today}</p>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 bg-white border border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Total Enrollment</p>
              <p className="text-3xl font-semibold text-neutral-900 mt-1">{childCount.total}</p>
              <p className="text-xs text-neutral-400 mt-2">of {totalCapacity} capacity</p>
            </div>
            <div className="p-3 bg-neutral-50">
              <Baby className="w-5 h-5 text-neutral-600" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Active Teachers</p>
              <p className="text-3xl font-semibold text-neutral-900 mt-1">{teacherCount.total}</p>
              <p className="text-xs text-neutral-400 mt-2">
                Ratio: 1:{teacherCount.total > 0 ? Math.round(childCount.total / teacherCount.total) : 0}
              </p>
            </div>
            <div className="p-3 bg-neutral-50">
              <GraduationCap className="w-5 h-5 text-neutral-600" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Occupancy Rate</p>
              <p className="text-3xl font-semibold text-neutral-900 mt-1">{occupancyRate}%</p>
              <p className="text-xs text-neutral-400 mt-2">{availableSpots} spots available</p>
            </div>
            <div className="p-3 bg-neutral-50">
              <TrendingUp className="w-5 h-5 text-neutral-600" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Active Classes</p>
              <p className="text-3xl font-semibold text-neutral-900 mt-1">{classCount.total}</p>
              <p className="text-xs text-neutral-400 mt-2">across {locations.length} locations</p>
            </div>
            <div className="p-3 bg-neutral-50">
              <CalendarDays className="w-5 h-5 text-neutral-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Location Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrollment by Location */}
        <div className="lg:col-span-2 p-6 bg-white border border-neutral-200">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-neutral-900">Enrollment by Location</h3>
            <p className="text-xs text-neutral-500 mt-1">Distribution across all facilities</p>
          </div>
          <div className="space-y-3">
            {locations.map((location) => {
              const locationChildren = childCount.byLocation[location.id] || 0;
              const locationCapacity = location.capacity || 0;
              const percentage = locationCapacity > 0 ? Math.round((locationChildren / locationCapacity) * 100) : 0;

              return (
                <div key={location.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">{location.name}</span>
                    <span className="text-neutral-500">
                      {locationChildren}/{locationCapacity}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 h-2">
                    <div
                      className="bg-neutral-900 h-2 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-6 bg-white border border-neutral-200">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-neutral-900">Today's Overview</h3>
            <p className="text-xs text-neutral-500 mt-1">Key operational metrics</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span className="text-sm text-neutral-600">Check-ins Today</span>
              </div>
              <span className="text-sm font-medium text-neutral-900">—</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-neutral-400" />
                <span className="text-sm text-neutral-600">Absent Today</span>
              </div>
              <span className="text-sm font-medium text-neutral-900">—</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-neutral-400" />
                <span className="text-sm text-neutral-600">Pending Actions</span>
              </div>
              <span className="text-sm font-medium text-neutral-900">—</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-neutral-400" />
                <span className="text-sm text-neutral-600">Revenue (MTD)</span>
              </div>
              <span className="text-sm font-medium text-neutral-900">—</span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teachers by Location */}
        <div className="p-6 bg-white border border-neutral-200">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-neutral-900">Staff Distribution</h3>
            <p className="text-xs text-neutral-500 mt-1">Teachers across locations</p>
          </div>
          <div className="space-y-3">
            {locations.map((location) => {
              const locationTeachers = teacherCount.byLocation[location.id] || 0;
              const locationChildren = childCount.byLocation[location.id] || 0;
              const ratio = locationTeachers > 0 ? Math.round(locationChildren / locationTeachers) : 0;

              return (
                <div key={location.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                  <div>
                    <p className="text-sm text-neutral-700">{location.name}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Ratio 1:{ratio}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-900">{locationTeachers}</p>
                    <p className="text-xs text-neutral-400">teachers</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Parent Engagement */}
        <div className="p-6 bg-white border border-neutral-200">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-neutral-900">Parent Engagement</h3>
            <p className="text-xs text-neutral-500 mt-1">Family connection metrics</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Total Families</span>
              <span className="text-lg font-semibold text-neutral-900">{parentCount.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Avg Children per Family</span>
              <span className="text-lg font-semibold text-neutral-900">
                {parentCount.total > 0 ? (childCount.total / parentCount.total).toFixed(1) : '0'}
              </span>
            </div>
            <div className="pt-3 border-t border-neutral-100">
              <p className="text-xs text-neutral-400">
                Communication and engagement features coming soon
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}