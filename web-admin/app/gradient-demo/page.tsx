/**
 * Demo page showing warm gradient background with glass panels
 * Based on modern UX research platform design
 */

'use client';

import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassPanel } from '@/components/ui/GlassPanel';

export default function GradientDemoPage() {
  return (
    <GradientBackground variant="warm-yellow">
      <div className="container mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Dashboard Overview
          </h1>
          <p className="text-gray-600">
            Warm, inviting design for daycare management
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GlassPanel className="p-6">
            <div className="text-sm text-gray-600 mb-1">Total Students</div>
            <div className="text-3xl font-bold text-gray-900">248</div>
            <div className="text-xs text-green-600 mt-2">↑ 12% this month</div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="text-sm text-gray-600 mb-1">Active Classes</div>
            <div className="text-3xl font-bold text-gray-900">12</div>
            <div className="text-xs text-blue-600 mt-2">4 morning, 8 afternoon</div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="text-sm text-gray-600 mb-1">Staff Members</div>
            <div className="text-3xl font-bold text-gray-900">32</div>
            <div className="text-xs text-purple-600 mt-2">2 new this week</div>
          </GlassPanel>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Large content panel */}
          <GlassPanel className="lg:col-span-2 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Recent Activity
            </h2>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/50 hover:bg-white/70 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {item}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      Activity item {item}
                    </div>
                    <div className="text-xs text-gray-500">2 hours ago</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Sidebar */}
          <GlassPanel variant="gradient" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium">
                Add Student
              </button>
              <button className="w-full px-4 py-2 bg-white/60 hover:bg-white/80 text-gray-700 border border-gray-300 rounded-lg transition-colors text-sm font-medium">
                Schedule Class
              </button>
              <button className="w-full px-4 py-2 bg-white/60 hover:bg-white/80 text-gray-700 border border-gray-300 rounded-lg transition-colors text-sm font-medium">
                Generate Report
              </button>
            </div>
          </GlassPanel>
        </div>

        {/* Bottom CTA */}
        <div className="mt-8">
          <GlassPanel className="p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Need Help Getting Started?
            </h3>
            <p className="text-gray-600 mb-4">
              Check out our quick start guide or schedule a demo
            </p>
            <button className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-gray-900 font-semibold rounded-lg transition-all shadow-md">
              Watch Video Tour →
            </button>
          </GlassPanel>
        </div>
      </div>
    </GradientBackground>
  );
}
