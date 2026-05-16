import { Navigate, Outlet } from 'react-router-dom';
import { useStaffAuth } from './StaffAuthContext';

export function RequireAdmin() {
  const { user, isAdmin } = useStaffAuth();
  if (!user) return null;
  if (!isAdmin) {
    return <Navigate to="/staff" replace />;
  }
  return <Outlet />;
}
