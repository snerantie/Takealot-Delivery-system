import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { Pagination } from '../types';

export interface CodCollection {
  id: string;
  tripId: string;
  driverId: string;
  amountCollected: string | number;
  collectionTime: string;
  collectionNotes?: string;
  depositStatus: 'pending' | 'deposited' | 'verified' | 'disputed';
  atmReference?: string;
  bankName?: string;
  atmLocation?: string;
  atmDepositTime?: string;
  verificationStatus: 'pending' | 'verified' | 'failed';
  verifiedAmount?: string | number;
  verificationNotes?: string;
  discrepancyAmount?: string | number;
  discrepancyReason?: string;
  trip?: { tripNumber: string; customerName?: string; codAmount?: string | number };
  driver?: { user?: { firstName?: string; lastName?: string } };
}

export interface CodStats {
  totalCollected: number;
  awaitingVerification: number;
  verified: number;
  disputed: number;
}

interface CodListResponse {
  data: CodCollection[];
  pagination: Pagination;
}

export const useCodCollections = (filters: { verificationStatus?: string } = {}) =>
  useQuery({
    queryKey: ['cod', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.verificationStatus) params.set('verificationStatus', filters.verificationStatus);
      const { data } = await api.get(`/cod-collections?${params.toString()}`);
      return data as CodListResponse;
    },
  });

export const useCodStats = () =>
  useQuery({
    queryKey: ['cod-stats'],
    queryFn: async () => {
      const { data } = await api.get('/cod-collections/stats');
      return data.data as CodStats;
    },
  });

export const usePendingCod = () =>
  useQuery({
    queryKey: ['cod-pending'],
    queryFn: async () => {
      const { data } = await api.get('/cod-collections/pending');
      return data.data as CodCollection[];
    },
  });


const useCodInvalidation = () => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['cod'] });
    qc.invalidateQueries({ queryKey: ['cod-stats'] });
    qc.invalidateQueries({ queryKey: ['cod-pending'] });
    qc.invalidateQueries({ queryKey: ['trip'] });
  };
};

export const useRecordCollection = () => {
  const invalidate = useCodInvalidation();
  return useMutation({
    mutationFn: async (payload: { tripId: string; amountCollected: number; collectionNotes?: string }) => {
      const { data } = await api.post('/cod-collections', payload);
      return data.data as CodCollection;
    },
    onSuccess: () => invalidate(),
  });
};

export const useRecordDeposit = () => {
  const invalidate = useCodInvalidation();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      atmReference: string;
      bankName: string;
      atmLocation?: string;
    }) => {
      const { data } = await api.put(`/cod-collections/${id}/deposit`, payload);
      return data as { message: string; data: CodCollection };
    },
    onSuccess: () => invalidate(),
  });
};

export const useResolveCod = () => {
  const invalidate = useCodInvalidation();
  return useMutation({
    mutationFn: async ({ id, approve, notes }: { id: string; approve: boolean; notes?: string }) => {
      const { data } = await api.post(`/cod-collections/${id}/verify`, { approve, notes });
      return data.data as CodCollection;
    },
    onSuccess: () => invalidate(),
  });
};
