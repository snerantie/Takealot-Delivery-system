import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { Pagination } from '../types';

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  targetAudience: 'all_drivers' | 'active_drivers' | 'specific_drivers' | 'admins';
  deliveryMethod: string[];
  status: string;
  sentAt?: string;
  totalRecipients: number;
  totalDelivered: number;
  totalRead: number;
  createdAt: string;
  creator?: { firstName?: string; lastName?: string };
}

export interface CreateBroadcastPayload {
  title: string;
  message: string;
  targetAudience: Broadcast['targetAudience'];
  targetDriverIds?: string[];
  deliveryMethod: string[];
  priority: 'low' | 'medium' | 'high';
}

interface BroadcastListResponse {
  data: Broadcast[];
  pagination: Pagination;
}

export const useBroadcasts = () =>
  useQuery({
    queryKey: ['broadcasts'],
    queryFn: async () => {
      const { data } = await api.get('/broadcasts');
      return data as BroadcastListResponse;
    },
  });

export const useCreateBroadcast = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBroadcastPayload) => {
      const { data } = await api.post('/broadcasts', payload);
      return data as { message: string; data: Broadcast };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['broadcasts'] }),
  });
};
