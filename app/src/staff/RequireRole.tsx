import { Navigate, Outlet } from 'react-router-dom';
import type { StaffUser } from '../api/http';
import { useStaffAuth } from './StaffAuthContext';

type Props = {
  roles: Array<StaffUser['role']>;
};

export function RequireRole({ roles }: Props) {
  const { user } = useStaffAuth();
  if (!user) return null;
  if (!roles.includes(user.role)) {
    return <Navigate to="/staff" replace />;
  }
  return <Outlet />;
}
