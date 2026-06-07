import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { Trip, TripStats, Pagination, TripItem } from '../types';

export interface TripListResponse {
  data: Trip[];
  pagination: Pagination;
}

export interface CreateTripPayload {
  pickupAddress: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  scheduledPickup?: string;
  deliveryAddress: string;
  customerName?: string;
  customerPhone?: string;
  scheduledDelivery?: string;
  distanceKm?: number;
  deliveryFee?: number;
  paymentMethod: 'prepaid' | 'cod';
  codAmount?: number;
  driverId?: string;
  specialInstructions?: string;
  items?: TripItem[];
}

interface TripFilters {
  status?: string;
  search?: string;
  page?: number;
}

export const useTrips = (filters: TripFilters = {}) =>
  useQuery({
    queryKey: ['trips', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      const { data } = await api.get(`/trips?${params.toString()}`);
      return data as TripListResponse;
    },
  });

export const useTripStats = () =>
  useQuery({
    queryKey: ['trip-stats'],
    queryFn: async () => {
      const { data } = await api.get('/trips/stats');
      return data.data as TripStats;
    },
  });

export const useTrip = (id?: string) =>
  useQuery({
    queryKey: ['trip', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/trips/${id}`);
      return data.data as Trip;
    },
  });


// Invalidate trip-related queries after a mutation
const useTripInvalidation = () => {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ['trips'] });
    qc.invalidateQueries({ queryKey: ['trip-stats'] });
    if (id) qc.invalidateQueries({ queryKey: ['trip', id] });
  };
};

export const useCreateTrip = () => {
  const invalidate = useTripInvalidation();
  return useMutation({
    mutationFn: async (payload: CreateTripPayload) => {
      const { data } = await api.post('/trips', payload);
      return data.data as Trip;
    },
    onSuccess: () => invalidate(),
  });
};

interface MilestonePayload {
  notes?: string;
}

export const useMarkPickup = () => {
  const invalidate = useTripInvalidation();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string } & MilestonePayload) => {
      const { data } = await api.post(`/trips/${id}/pickup`, { notes });
      return data.data as Trip;
    },
    onSuccess: (_d, vars) => invalidate(vars.id),
  });
};

export const useMarkDelivered = () => {
  const invalidate = useTripInvalidation();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string } & MilestonePayload) => {
      const { data } = await api.post(`/trips/${id}/deliver`, { notes });
      return data.data as Trip;
    },
    onSuccess: (_d, vars) => invalidate(vars.id),
  });
};

export const useUpdateTripStatus = () => {
  const invalidate = useTripInvalidation();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data } = await api.put(`/trips/${id}/status`, { status, notes });
      return data.data as Trip;
    },
    onSuccess: (_d, vars) => invalidate(vars.id),
  });
};
