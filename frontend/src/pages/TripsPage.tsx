import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Loader2 } from 'lucide-react';
import { useTrips } from '../lib/trips';
import { useAuthStore } from '../store/auth';
import { UserRole, TripStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../lib/format';

const filters: { label: string; value?: TripStatus }[] = [
  { label: 'All' },
  { label: 'Pending', value: TripStatus.pending },
  { label: 'Assigned', value: TripStatus.assigned },
  { label: 'In progress', value: TripStatus.in_progress },
  { label: 'Completed', value: TripStatus.completed },
];

export default function TripsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.admin || user?.role === UserRole.super_admin;
  const [status, setStatus] = useState<TripStatus | undefined>(undefined);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useTrips({ status, search });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
          <p className="text-gray-500">Track and manage deliveries.</p>
        </div>
        {isAdmin && (
          <Link
            to="/trips/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <Plus size={18} /> New trip
          </Link>
        )}
      </div>


      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatus(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                status === f.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trip #, customer, address"
            className="w-full sm:w-72 rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-500 p-6">
            <Loader2 className="animate-spin" size={18} /> Loading trips…
          </div>
        ) : data?.data?.length ? (
          <div className="divide-y divide-gray-100">
            {data.data.map((trip) => (
              <Link
                key={trip.id}
                to={`/trips/${trip.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{trip.tripNumber}</p>
                    <StatusBadge status={trip.status} />
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {trip.customerName ? `${trip.customerName} · ` : ''}
                    {trip.deliveryAddress}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-gray-900">
                    {trip.paymentMethod === 'cod'
                      ? `COD ${formatCurrency(trip.codAmount)}`
                      : formatCurrency(trip.deliveryFee)}
                  </p>
                  <p className="text-xs text-gray-500">{formatDateTime(trip.scheduledDelivery)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">No trips found.</p>
        )}
      </div>
    </div>
  );
}
