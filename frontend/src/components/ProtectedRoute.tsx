import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: ReactNode;
  /** If provided, the user's role must be in this list to access the route. */
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Authenticated but not authorized for this area
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
