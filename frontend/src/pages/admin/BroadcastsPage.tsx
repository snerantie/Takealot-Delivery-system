import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Megaphone, Send, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBroadcasts, useCreateBroadcast } from '../../lib/broadcasts';
import { formatDateTime } from '../../lib/format';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  targetAudience: z.enum(['all_drivers', 'active_drivers', 'admins']),
  priority: z.enum(['low', 'medium', 'high']),
});

type FormValues = z.infer<typeof schema>;

const audienceLabels: Record<string, string> = {
  all_drivers: 'All drivers',
  active_drivers: 'Active drivers',
  specific_drivers: 'Specific drivers',
  admins: 'Admins',
};

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

export default function BroadcastsPage() {
  const { data: list } = useBroadcasts();
  const createBroadcast = useCreateBroadcast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { targetAudience: 'active_drivers', priority: 'medium' },
  });

  const onSubmit = (values: FormValues) => {
    createBroadcast.mutate(
      { ...values, deliveryMethod: ['in_app'] },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          reset({ title: '', message: '', targetAudience: values.targetAudience, priority: 'medium' });
        },
        onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to send'),
      }
    );
  };


  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Megaphone size={24} className="text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcasts</h1>
          <p className="text-gray-500">Send announcements — e.g. payday reminders — to your drivers.</p>
        </div>
      </div>

      {/* Compose */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input {...register('title')} className={inputCls} placeholder="Payday this Friday" />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            {...register('message')}
            rows={4}
            className={inputCls}
            placeholder="Hi team, salaries will be paid this Friday 7 June. Please make sure all COD deposits are verified by Thursday."
          />
          {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
            <select {...register('targetAudience')} className={inputCls}>
              <option value="active_drivers">Active drivers</option>
              <option value="all_drivers">All drivers</option>
              <option value="admins">Admins</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select {...register('priority')} className={inputCls}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={createBroadcast.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {createBroadcast.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Send broadcast
        </button>
      </form>

      {/* History */}
      <h2 className="font-semibold text-gray-900 mb-3">Sent broadcasts</h2>
      <div className="bg-white rounded-xl border border-gray-200">
        {list?.data?.length ? (
          <div className="divide-y divide-gray-100">
            {list.data.map((b) => (
              <div key={b.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{b.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{b.message}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 shrink-0">
                    <Users size={12} /> {b.totalDelivered}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  {audienceLabels[b.targetAudience] ?? b.targetAudience} · {formatDateTime(b.sentAt || b.createdAt)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">No broadcasts sent yet.</p>
        )}
      </div>
    </div>
  );
}
