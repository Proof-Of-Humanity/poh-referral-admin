import { useAtlasProvider } from '@kleros/kleros-app';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { isPohAdmin } from './admin-session';

export const RequireAdmin = () => {
  const location = useLocation();
  // Subscribing to AtlasProvider is what re-renders this guard when the session starts or ends.
  useAtlasProvider();
  if (!isPohAdmin()) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
};
