import React from 'react';
import { Outlet } from 'react-router-dom';

import { Navigation } from 'App/components/Navigation';
import { Header } from 'App/features/Header';
import { RequireAuth } from 'App/features/RequireAuth';

const ProtectedLayout: React.FC = () => (
  <RequireAuth>
    <>
      <Header />
      <div className="protected-layout__content">
        <Navigation />
        <Outlet />
      </div>
    </>
  </RequireAuth>
);

export { ProtectedLayout };
