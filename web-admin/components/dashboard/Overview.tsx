'use client';

import { LocationLite } from '@/services/useLocationsAPI';
import { dash } from '@/styles/dashboard';
import { type CountStats } from '@/app/dashboard/[uid]/page';

export default function Overview({
  teacherCount,
  childCount,
  parentCount,
  classCount,
  locations,
}: {
  // Use explicit "*Count" names to avoid clashing with React's `children` prop
  teacherCount: CountStats;
  childCount: CountStats;
  parentCount: CountStats;
  classCount: CountStats;
  locations: LocationLite[]
}) {
  return (
    <>
      <div style={dash.overview}>
        <h2>Dashboard Overview</h2>
        <div style={dash.stats}>
          <div style={dash.statCard}><h3>Teachers</h3><p style={dash.statNumber}>{teacherCount.total}</p></div>
          <div style={dash.statCard}><h3>Children</h3><p style={dash.statNumber}>{childCount.total}</p></div>
          <div style={dash.statCard}><h3>Parents</h3><p style={dash.statNumber}>{parentCount.total}</p></div>
          <div style={dash.statCard}><h3>Classes</h3><p style={dash.statNumber}>{classCount.total}</p></div>
        </div>
      </div>

      <div className='my-4 flex-col gap-3'>

        {
          locations.length > 1 && (
            <div >
              {
                locations.map(location => {
                  const locationId = location.id;
                  return (
                    <div key={locationId} >
                      <h3>{location.name}</h3>
                      <div style={dash.stats}>
                        <div style={dash.statCard}><h3>Teachers</h3><p style={dash.statNumber}>{teacherCount.byLocation[locationId]}</p></div>
                        <div style={dash.statCard}><h3>Children</h3><p style={dash.statNumber}>{childCount.byLocation[locationId]}</p></div>
                        <div style={dash.statCard}><h3>Parents</h3><p style={dash.statNumber}>{parentCount.byLocation[locationId]}</p></div>
                        <div style={dash.statCard}><h3>Classes</h3><p style={dash.statNumber}>{classCount.byLocation[locationId]}</p></div>
                      </div>
                    </div>
                  )
                })
              }
            </div>
          )
        }
      </div>
    </>
  );
}
