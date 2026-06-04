import { Link } from 'react-router-dom';
import { Package, Truck, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useTripStats, useTrips } from '../lib/trips';
import StatusBadge from '../components/StatusBadge';
import { formatDateTime } from '../lib/format';

function StatCard({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tint: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${tint}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: stats, isLoading } = useTripStats();
  const { data: recent } = useTrips({ page: 1 });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName || 'there'} 👋
        </h1>
        <p className="text-gray-500">Here's what's happening with your deliveries.</p>
      </div>


      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin" size={18} /> Loading stats…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Active"
            value={stats?.active ?? 0}
            icon={<Truck size={20} className="text-amber-600" />}
            tint="bg-amber-50"
          />
          <StatCard
            label="Pending"
            value={stats?.pending ?? 0}
            icon={<Clock size={20} className="text-gray-600" />}
            tint="bg-gray-100"
          />
          <StatCard
            label="Completed"
            value={stats?.completed ?? 0}
            icon={<CheckCircle2 size={20} className="text-green-600" />}
            tint="bg-green-50"
          />
          <StatCard
            label="Total trips"
            value={stats?.total ?? 0}
            icon={<Package size={20} className="text-primary-600" />}
            tint="bg-primary-50"
          />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent trips</h2>
          <Link to="/trips" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recent?.data?.length ? (
            recent.data.slice(0, 5).map((trip) => (
              <Link
                key={trip.id}
                to={`/trips/${trip.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{trip.tripNumber}</p>
                  <p className="text-xs text-gray-500">
                    {trip.deliveryAddress} · {formatDateTime(trip.scheduledDelivery)}
                  </p>
                </div>
                <StatusBadge status={trip.status} />
              </Link>
            ))
          ) : (
            <p className="px-5 py-6 text-sm text-gray-500">No trips yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
