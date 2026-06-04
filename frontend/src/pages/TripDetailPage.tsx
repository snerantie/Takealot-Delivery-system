import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Package, Phone, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useTrip,
  useMarkPickup,
  useMarkDelivered,
  useUpdateTripStatus,
} from '../lib/trips';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDateTime, statusLabel } from '../lib/format';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: trip, isLoading } = useTrip(id);
  const pickup = useMarkPickup();
  const deliver = useMarkDelivered();
  const updateStatus = useUpdateTripStatus();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="animate-spin" size={18} /> Loading trip…
      </div>
    );
  }

  if (!trip) {
    return <p className="text-gray-500">Trip not found.</p>;
  }

  const handlePickup = () =>
    pickup.mutate(
      { id: trip.id },
      {
        onSuccess: () => toast.success('Pickup recorded'),
        onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed'),
      }
    );

  const handleDeliver = () =>
    deliver.mutate(
      { id: trip.id },
      {
        onSuccess: () => toast.success('Delivery recorded 🎉'),
        onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed'),
      }
    );

  const handleCancel = () =>
    updateStatus.mutate(
      { id: trip.id, status: 'cancelled', notes: 'Cancelled by user' },
      {
        onSuccess: () => toast.success('Trip cancelled'),
        onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed'),
      }
    );

  const busy = pickup.isPending || deliver.isPending || updateStatus.isPending;


  return (
    <div className="max-w-3xl">
      <Link to="/trips" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Back to trips
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{trip.tripNumber}</h1>
            <p className="text-sm text-gray-500">
              {trip.paymentMethod === 'cod'
                ? `Cash on delivery · ${formatCurrency(trip.codAmount)}`
                : `Prepaid · ${formatCurrency(trip.deliveryFee)} fee`}
            </p>
          </div>
          <StatusBadge status={trip.status} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex gap-3">
            <MapPin size={18} className="text-primary-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Pickup</p>
              <p className="text-sm text-gray-900">{trip.pickupAddress}</p>
              <p className="text-xs text-gray-500">{formatDateTime(trip.scheduledPickup)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <MapPin size={18} className="text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Delivery</p>
              <p className="text-sm text-gray-900">{trip.deliveryAddress}</p>
              <p className="text-xs text-gray-500">{formatDateTime(trip.scheduledDelivery)}</p>
            </div>
          </div>
          {trip.customerName && (
            <div className="flex gap-3">
              <Phone size={18} className="text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Customer</p>
                <p className="text-sm text-gray-900">{trip.customerName}</p>
                <p className="text-xs text-gray-500">{trip.customerPhone || '—'}</p>
              </div>
            </div>
          )}
          {!!trip.items?.length && (
            <div className="flex gap-3">
              <Package size={18} className="text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Items</p>
                {trip.items.map((it, i) => (
                  <p key={i} className="text-sm text-gray-900">
                    {it.itemQuantity}× {it.itemDescription}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons based on current status */}
        <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-gray-100">
          {trip.status === 'assigned' && (
            <button
              onClick={handlePickup}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {pickup.isPending && <Loader2 size={16} className="animate-spin" />}
              Mark picked up
            </button>
          )}
          {trip.status === 'in_progress' && (
            <button
              onClick={handleDeliver}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {deliver.isPending && <Loader2 size={16} className="animate-spin" />}
              Mark delivered
            </button>
          )}
          {(trip.status === 'pending' || trip.status === 'assigned' || trip.status === 'in_progress') && (
            <button
              onClick={handleCancel}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Cancel trip
            </button>
          )}
        </div>
      </div>


      {/* Status timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Status history</h2>
        {trip.statusHistory?.length ? (
          <ol className="relative border-l border-gray-200 ml-2">
            {trip.statusHistory.map((h) => (
              <li key={h.id} className="mb-5 ml-4">
                <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-primary-500" />
                <p className="text-sm font-medium text-gray-900">{statusLabel(h.status)}</p>
                {h.notes && <p className="text-xs text-gray-500">{h.notes}</p>}
                <p className="text-xs text-gray-400">{formatDateTime(h.createdAt)}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-500">No history yet.</p>
        )}
      </div>
    </div>
  );
}
