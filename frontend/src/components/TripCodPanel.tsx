import { useState } from 'react';
import { Banknote, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Trip } from '../types';
import { useRecordCollection, CodCollection } from '../lib/cod';
import CodDepositModal from './CodDepositModal';
import { formatCurrency } from '../lib/format';

export default function TripCodPanel({ trip }: { trip: Trip }) {
  const recordCollection = useRecordCollection();
  const [amount, setAmount] = useState<string>(String(trip.codAmount ?? ''));
  const [showDeposit, setShowDeposit] = useState(false);

  // Only relevant for completed cash-on-delivery trips
  if (trip.paymentMethod !== 'cod' || trip.status !== 'completed') return null;

  const collection = trip.codCollection;

  const handleRecord = () => {
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    recordCollection.mutate(
      { tripId: trip.id, amountCollected: value },
      {
        onSuccess: () => toast.success('Cash collection recorded'),
        onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed'),
      }
    );
  };

  // Build a minimal CodCollection object for the deposit modal
  const modalCollection: CodCollection | null = collection
    ? ({
        id: collection.id,
        tripId: trip.id,
        driverId: trip.driverId ?? '',
        amountCollected: collection.amountCollected,
        collectionTime: '',
        depositStatus: collection.depositStatus as CodCollection['depositStatus'],
        verificationStatus: collection.verificationStatus as CodCollection['verificationStatus'],
        atmReference: collection.atmReference,
        trip: { tripNumber: trip.tripNumber, codAmount: trip.codAmount },
      } as CodCollection)
    : null;


  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Banknote size={18} className="text-primary-600" />
        <h2 className="font-semibold text-gray-900">Cash on delivery</h2>
      </div>

      {/* Step 1: no collection recorded yet */}
      {!collection && (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            Record the cash you collected from the customer (order amount{' '}
            {formatCurrency(trip.codAmount)}).
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0.00"
            />
            <button
              onClick={handleRecord}
              disabled={recordCollection.isPending}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              Record collection
            </button>
          </div>
        </div>
      )}

      {/* Step 2+: collection exists — show status & deposit action */}
      {collection && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Collected</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(collection.amountCollected)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status</span>
            {collection.verificationStatus === 'verified' ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
                <CheckCircle2 size={14} /> Verified
              </span>
            ) : collection.depositStatus === 'disputed' || collection.verificationStatus === 'failed' ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-red-700">
                <AlertTriangle size={14} /> Flagged for review
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700">
                <Clock size={14} /> {collection.atmReference ? 'Checking' : 'Awaiting deposit'}
              </span>
            )}
          </div>

          {collection.verificationStatus !== 'verified' && (
            <button
              onClick={() => setShowDeposit(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <Banknote size={14} /> {collection.atmReference ? 'Re-submit deposit' : 'Record ATM deposit'}
            </button>
          )}
        </div>
      )}

      {showDeposit && modalCollection && (
        <CodDepositModal collection={modalCollection} onClose={() => setShowDeposit(false)} />
      )}
    </div>
  );
}
