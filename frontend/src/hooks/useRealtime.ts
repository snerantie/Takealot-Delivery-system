import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { socketService } from '../lib/socket';
import { useAuthStore } from '../store/auth';
import { UserRole } from '../types';

/**
 * Connects the websocket for the authenticated user, joins the relevant rooms,
 * and keeps notification/trip/COD queries fresh as live events arrive.
 */
export function useRealtime() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const socket = socketService.connect();
    const join = () => {
      socketService.emit('join:user', user.id);
      if (user.role === UserRole.admin || user.role === UserRole.super_admin) {
        socketService.joinAdminRoom();
      }
    };

    // Join on (re)connect
    socket.on('connect', join);
    if (socket.connected) join();

    const onNotification = (n: { title?: string; message?: string }) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      if (n?.title) toast(n.title, { icon: '🔔' });
    };

    const refreshTrips = () => {
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['trip-stats'] });
    };
    const refreshCod = () => {
      qc.invalidateQueries({ queryKey: ['cod'] });
      qc.invalidateQueries({ queryKey: ['cod-stats'] });
      qc.invalidateQueries({ queryKey: ['cod-pending'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    };

    socketService.on('notification:new', onNotification);
    socketService.on('trip:assigned', refreshTrips);
    socketService.on('trip:status', refreshTrips);
    socketService.on('cod:verified', refreshCod);
    socketService.on('cod:resolved', refreshCod);

    return () => {
      socket.off('connect', join);
      socketService.off('notification:new', onNotification);
      socketService.off('trip:assigned', refreshTrips);
      socketService.off('trip:status', refreshTrips);
      socketService.off('cod:verified', refreshCod);
      socketService.off('cod:resolved', refreshCod);
      socketService.disconnect();
    };
  }, [user, qc]);
}
