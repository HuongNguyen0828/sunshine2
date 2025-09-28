'use client';

import { dash } from '@/styles/dashboard';
import type { Tab } from '@/types/forms';

export default function SidebarNav({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  // Compute style per button with active highlight
  const btn = (t: Tab) =>
    active === t ? { ...dash.navButton, ...dash.navButtonActive } : dash.navButton;

  return (
    <aside style={dash.sidebar}>
      <nav style={dash.nav}>
        <button style={btn('overview')} onClick={() => onChange('overview')}>Overview</button>
        <button style={btn('teachers')} onClick={() => onChange('teachers')}>Teachers</button>
        <button style={btn('children')} onClick={() => onChange('children')}>Children</button>
        <button style={btn('parents')} onClick={() => onChange('parents')}>Parents</button>
        <button style={btn('classes')} onClick={() => onChange('classes')}>Classes</button>
        <button style={btn('schedule')} onClick={() => onChange('schedule')}>Schedule</button>
        <button style={btn('report')} onClick={() => onChange('report')}>Report</button>
      </nav>
    </aside>
  );
}
