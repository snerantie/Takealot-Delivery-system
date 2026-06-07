import { useState } from 'react';
import { Banknote, CheckCircle2, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth';
import { UserRole } from '../types';
import {
  useCodCollections,
  useCodStats,
  usePendingCod,
  useResolveCod,
  CodCollection,
} from '../lib/cod';
import CodDepositModal from '../components/CodDepositModal';
import { formatCurrency, formatDateTime } from '../lib/format';

function VerifyBadge({ c }: { c: CodCollection }) {
  if (c.depositStatus === 'disputed' || c.verificationStatus === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <AlertTriangle size={12} /> Flagged
      </span>
    );
  }
  if (c.verificationStatus === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle2 size={12} /> Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <Clock size={12} /> {c.atmReference ? 'Checking' : 'Awaiting deposit'}
    </span>
  );
}

function StatCard({ label, value, tint }: { label: string; value: string | number; tint: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className={`text-2xl font-bold ${tint}`}>{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}


function AdminPendingQueue() {
  const { data: pending, isLoading } = usePendingCod();
  const resolve = useResolveCod();

  const act = (id: string, approve: boolean) =>
    resolve.mutate(
      { id, approve },
      {
        onSuccess: () => toast.success(approve ? 'Deposit verified' : 'Deposit rejected'),
        onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed'),
      }
    );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 p-6">
        <Loader2 className="animate-spin" size={18} /> Loading queue…
      </div>
    );
  }

  if (!pending?.length) {
    return <p className="p-6 text-sm text-gray-500">Nothing awaiting verification. 🎉</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {pending.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">
                {c.trip?.tripNumber ?? 'Trip'}
              </p>
              <VerifyBadge c={c} />
            </div>
            <p className="text-xs text-gray-500 truncate">
              {c.driver?.user?.firstName} {c.driver?.user?.lastName} · Collected{' '}
              {formatCurrency(c.amountCollected)}
              {c.atmReference ? ` · Ref ${c.atmReference}` : ''}
            </p>
            {c.discrepancyReason && (
              <p className="text-xs text-red-600 mt-0.5">{c.discrepancyReason}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => act(c.id, true)}
              disabled={resolve.isPending}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              Approve
            </button>
            <button
              onClick={() => act(c.id, false)}
              disabled={resolve.isPending}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}


export default function PaymentsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.admin || user?.role === UserRole.super_admin;
  const { data: stats } = useCodStats();
  const { data: list, isLoading } = useCodCollections();
  const [depositFor, setDepositFor] = useState<CodCollection | null>(null);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">COD Payments</h1>
        <p className="text-gray-500">
          {isAdmin
            ? 'Verify driver cash deposits and resolve discrepancies.'
            : 'Record your ATM deposits to get them verified automatically.'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total collected" value={formatCurrency(stats?.totalCollected)} tint="text-gray-900" />
        <StatCard label="Awaiting verification" value={stats?.awaitingVerification ?? 0} tint="text-amber-600" />
        <StatCard label="Verified" value={stats?.verified ?? 0} tint="text-green-600" />
        <StatCard label="Flagged" value={stats?.disputed ?? 0} tint="text-red-600" />
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Awaiting verification</h2>
          </div>
          <AdminPendingQueue />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {isAdmin ? 'All collections' : 'My collections'}
          </h2>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-500 p-6">
            <Loader2 className="animate-spin" size={18} /> Loading…
          </div>
        ) : list?.data?.length ? (
          <div className="divide-y divide-gray-100">
            {list.data.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {c.trip?.tripNumber ?? 'Trip'}
                    </p>
                    <VerifyBadge c={c} />
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {formatCurrency(c.amountCollected)} · {formatDateTime(c.collectionTime)}
                    {c.atmReference ? ` · Ref ${c.atmReference}` : ''}
                  </p>
                  {c.discrepancyReason && (
                    <p className="text-xs text-red-600 mt-0.5">{c.discrepancyReason}</p>
                  )}
                </div>
                {!isAdmin && c.verificationStatus !== 'verified' && (
                  <button
                    onClick={() => setDepositFor(c)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 shrink-0"
                  >
                    <Banknote size={14} /> {c.atmReference ? 'Re-submit' : 'Record deposit'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">
            No COD collections yet. They appear here after you deliver a cash-on-delivery trip.
          </p>
        )}
      </div>

      {depositFor && <CodDepositModal collection={depositFor} onClose={() => setDepositFor(null)} />}
    </div>
  );
}
