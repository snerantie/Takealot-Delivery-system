import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRecordDeposit, CodCollection } from '../lib/cod';
import { formatCurrency } from '../lib/format';

const schema = z.object({
  atmReference: z
    .string()
    .min(4, 'At least 4 characters')
    .regex(/^[A-Za-z0-9-]+$/, 'Letters, numbers and dashes only'),
  bankName: z.string().min(1, 'Bank name is required'),
  atmLocation: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const banks = ['FNB', 'Standard Bank', 'Absa', 'Nedbank', 'Capitec', 'TymeBank', 'Other'];

export default function CodDepositModal({
  collection,
  onClose,
}: {
  collection: CodCollection;
  onClose: () => void;
}) {
  const recordDeposit = useRecordDeposit();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    recordDeposit.mutate(
      { id: collection.id, ...values },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          onClose();
        },
        onError: (e: any) => toast.error(e?.response?.data?.error || 'Verification failed'),
      }
    );
  };

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Banknote size={20} className="text-primary-600" />
            <h2 className="font-semibold text-gray-900">Record ATM deposit</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="rounded-lg bg-primary-50 px-4 py-3 text-sm">
            <span className="text-gray-600">Amount to deposit:</span>{' '}
            <span className="font-semibold text-gray-900">
              {formatCurrency(collection.amountCollected)}
            </span>
            {collection.trip?.tripNumber && (
              <span className="text-gray-500"> · {collection.trip.tripNumber}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ATM reference number</label>
            <input
              {...register('atmReference')}
              className={inputCls}
              placeholder="e.g. 4421887ABC"
              autoComplete="off"
            />
            {errors.atmReference && (
              <p className="mt-1 text-xs text-red-600">{errors.atmReference.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              The reference printed on your ATM deposit slip.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
            <select {...register('bankName')} className={inputCls} defaultValue="">
              <option value="" disabled>
                Select bank
              </option>
              {banks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {errors.bankName && <p className="mt-1 text-xs text-red-600">{errors.bankName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ATM location (optional)</label>
            <input {...register('atmLocation')} className={inputCls} placeholder="e.g. Canal Walk" />
          </div>

          <button
            type="submit"
            disabled={recordDeposit.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {recordDeposit.isPending && <Loader2 size={16} className="animate-spin" />}
            {recordDeposit.isPending ? 'Verifying…' : 'Submit & verify'}
          </button>
        </form>
      </div>
    </div>
  );
}
