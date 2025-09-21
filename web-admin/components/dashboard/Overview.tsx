'use client';

import { dash } from '@/styles/dashboard';

export default function Overview({
  teacherCount,
  childCount,
  parentCount,
  classCount,
}: {
  // Use explicit "*Count" names to avoid clashing with React's `children` prop
  teacherCount: number;
  childCount: number;
  parentCount: number;
  classCount: number;
}) {
  return (
    <div style={dash.overview}>
      <h2>Dashboard Overview</h2>
      <div style={dash.stats}>
        <div style={dash.statCard}><h3>Teachers</h3><p style={dash.statNumber}>{teacherCount}</p></div>
        <div style={dash.statCard}><h3>Children</h3><p style={dash.statNumber}>{childCount}</p></div>
        <div style={dash.statCard}><h3>Parents</h3><p style={dash.statNumber}>{parentCount}</p></div>
        <div style={dash.statCard}><h3>Classes</h3><p style={dash.statNumber}>{classCount}</p></div>
      </div>
    </div>
  );
}
