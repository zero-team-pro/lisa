import React from 'react';
import { Outlet } from 'react-router-dom';

import { RequireAuth } from 'App/features/RequireAuth';

const ProtectedLayout: React.FC = () => (
  <RequireAuth>
    <Outlet />
  </RequireAuth>
);

export { ProtectedLayout };
