import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateTrip, CreateTripPayload } from '../lib/trips';

const schema = z.object({
  pickupAddress: z.string().min(1, 'Pickup address is required'),
  pickupContactPhone: z.string().optional(),
  scheduledPickup: z.string().optional(),
  deliveryAddress: z.string().min(1, 'Delivery address is required'),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  scheduledDelivery: z.string().optional(),
  paymentMethod: z.enum(['prepaid', 'cod']),
  codAmount: z.coerce.number().nonnegative().optional(),
  deliveryFee: z.coerce.number().nonnegative().optional(),
  itemDescription: z.string().optional(),
  itemQuantity: z.coerce.number().int().positive().optional(),
  specialInstructions: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const input =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';


export default function NewTripPage() {
  const navigate = useNavigate();
  const createTrip = useCreateTrip();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { paymentMethod: 'prepaid', itemQuantity: 1 },
  });

  const paymentMethod = watch('paymentMethod');

  const onSubmit = (values: FormValues) => {
    const payload: CreateTripPayload = {
      pickupAddress: values.pickupAddress,
      pickupContactPhone: values.pickupContactPhone || undefined,
      scheduledPickup: values.scheduledPickup
        ? new Date(values.scheduledPickup).toISOString()
        : undefined,
      deliveryAddress: values.deliveryAddress,
      customerName: values.customerName || undefined,
      customerPhone: values.customerPhone || undefined,
      scheduledDelivery: values.scheduledDelivery
        ? new Date(values.scheduledDelivery).toISOString()
        : undefined,
      paymentMethod: values.paymentMethod,
      codAmount: values.paymentMethod === 'cod' ? values.codAmount ?? 0 : 0,
      deliveryFee: values.deliveryFee,
      specialInstructions: values.specialInstructions || undefined,
      items: values.itemDescription
        ? [{ itemDescription: values.itemDescription, itemQuantity: values.itemQuantity ?? 1 }]
        : undefined,
    };

    createTrip.mutate(payload, {
      onSuccess: (trip) => {
        toast.success('Trip created');
        navigate(`/trips/${trip.id}`);
      },
      onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to create trip'),
    });
  };


  return (
    <div className="max-w-2xl">
      <Link to="/trips" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Back to trips
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create a trip</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white rounded-xl border border-gray-200 p-6">
        <div>
          <label className={labelCls}>Pickup address</label>
          <input {...register('pickupAddress')} className={input} placeholder="Takealot DC, Cape Town" />
          {errors.pickupAddress && <p className="mt-1 text-xs text-red-600">{errors.pickupAddress.message}</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Pickup contact phone</label>
            <input {...register('pickupContactPhone')} className={input} placeholder="0210000000" />
          </div>
          <div>
            <label className={labelCls}>Scheduled pickup</label>
            <input type="datetime-local" {...register('scheduledPickup')} className={input} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Delivery address</label>
          <input {...register('deliveryAddress')} className={input} placeholder="12 Main Rd, Claremont" />
          {errors.deliveryAddress && <p className="mt-1 text-xs text-red-600">{errors.deliveryAddress.message}</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Customer name</label>
            <input {...register('customerName')} className={input} placeholder="Jane Doe" />
          </div>
          <div>
            <label className={labelCls}>Customer phone</label>
            <input {...register('customerPhone')} className={input} placeholder="0820000000" />
          </div>
          <div>
            <label className={labelCls}>Scheduled delivery</label>
            <input type="datetime-local" {...register('scheduledDelivery')} className={input} />
          </div>
          <div>
            <label className={labelCls}>Delivery fee (ZAR)</label>
            <input type="number" step="0.01" {...register('deliveryFee')} className={input} placeholder="50.00" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Payment method</label>
            <select {...register('paymentMethod')} className={input}>
              <option value="prepaid">Prepaid</option>
              <option value="cod">Cash on delivery</option>
            </select>
          </div>
          {paymentMethod === 'cod' && (
            <div>
              <label className={labelCls}>COD amount (ZAR)</label>
              <input type="number" step="0.01" {...register('codAmount')} className={input} placeholder="299.00" />
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Item description</label>
            <input {...register('itemDescription')} className={input} placeholder="Electronics parcel" />
          </div>
          <div>
            <label className={labelCls}>Quantity</label>
            <input type="number" {...register('itemQuantity')} className={input} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Special instructions</label>
          <textarea {...register('specialInstructions')} className={input} rows={3} placeholder="Gate code, leave with concierge, etc." />
        </div>

        <button
          type="submit"
          disabled={createTrip.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {createTrip.isPending && <Loader2 size={16} className="animate-spin" />}
          Create trip
        </button>
      </form>
    </div>
  );
}
