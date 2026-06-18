import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageSkeleton } from '../../components/ui/loading-skeleton';
import { LocationService, type Location } from '@/lib/locations';
import { supabase } from '../../lib/supabase';
import { Phone, Users, Calendar } from 'lucide-react';
import OverviewMetricCard from '../../components/dashboard/OverviewMetricCard';

interface LocationMetrics {
  leadsToday: number;
  leadsThisWeek: number;
  bookingsThisWeek: number;
  callsToday: number;
  smsSentToday: number;
  pendingCallbacks: number;
}

function buildMiniSeries(value: number, direction: 'up' | 'down' = 'up') {
  const step = Math.max(1, Math.ceil(Math.max(value, 1) * 0.18));
  return direction === 'up'
    ? [Math.max(value - step, 0), Math.max(value - Math.ceil(step / 2), 0), value]
    : [value + step, Math.max(value + Math.ceil(step / 2), 0), value];
}

const LocationDashboardPage: React.FC = () => {
  const { locationId } = useParams();
  const [location, setLocation] = useState<Location | null>(null);
  const [metrics, setMetrics] = useState<LocationMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!locationId) return;

      const loc = await LocationService.get(locationId);
      setLocation(loc);

      // Fetch real metrics for this location
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

      const [leadsToday, leadsWeek, bookingsWeek, callbacksPending] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('location_id', locationId)
          .gte('created_at', todayStart),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('location_id', locationId)
          .gte('created_at', weekStart),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('location_id', locationId)
          .gte('created_at', weekStart),
        supabase
          .from('callbacks')
          .select('id', { count: 'exact', head: true })
          .eq('location_id', locationId)
          .eq('status', 'pending'),
      ]);

      setMetrics({
        leadsToday: leadsToday.count || 0,
        leadsThisWeek: leadsWeek.count || 0,
        bookingsThisWeek: bookingsWeek.count || 0,
        callsToday: 0, // Retell calls are not per-location yet
        smsSentToday: 0,
        pendingCallbacks: callbacksPending.count || 0,
      });

      setLoading(false);
    };
    load();
  }, [locationId]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (!location) {
    return <div className="p-6 text-gray-500">Location not found.</div>;
  }

  const kpis = [
    { label: 'Leads Today', value: metrics?.leadsToday ?? 0, icon: Users, color: '#2563eb', direction: 'up' as const },
    { label: 'Leads This Week', value: metrics?.leadsThisWeek ?? 0, icon: Users, color: '#10b981', direction: 'up' as const },
    { label: 'Bookings This Week', value: metrics?.bookingsThisWeek ?? 0, icon: Calendar, color: '#8b5cf6', direction: 'up' as const },
    { label: 'Pending Callbacks', value: metrics?.pendingCallbacks ?? 0, icon: Phone, color: '#f59e0b', direction: 'down' as const },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{location.name}</h1>
          <p className="text-sm text-gray-500">
            {[location.address_line1, location.city, location.state].filter(Boolean).join(', ')}
          </p>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${location.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {location.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <OverviewMetricCard
            key={kpi.label}
            label={kpi.label}
            period="Location overview"
            value={kpi.value}
            badge={kpi.direction === 'down' && kpi.value > 0 ? 'Needs action' : 'Healthy'}
            badgeTone={kpi.direction === 'down' && kpi.value > 0 ? 'negative' : 'positive'}
            chartData={buildMiniSeries(kpi.value, kpi.direction)}
            icon={kpi.icon}
            accentColor={kpi.color}
            compact
            caption="Live from this location"
          />
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 p-6 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Location Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {location.phone && (
            <div>
              <span className="text-gray-500">Phone:</span>
              <span className="ml-2 text-gray-900">{location.phone}</span>
            </div>
          )}
          {location.email && (
            <div>
              <span className="text-gray-500">Email:</span>
              <span className="ml-2 text-gray-900">{location.email}</span>
            </div>
          )}
          {location.timezone && (
            <div>
              <span className="text-gray-500">Timezone:</span>
              <span className="ml-2 text-gray-900">{location.timezone}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationDashboardPage;
