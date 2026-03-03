import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { setPostLoginRedirect } from './authRedirect';

interface ProtectedRouteProps {
  children: ReactElement;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, refreshAuth } = useAuth();
  const location = useLocation();

  useEffect(() => {
    refreshAuth();
  }, [location.key, refreshAuth]);

  if (loading) {
    return (
      <div className="page auth-page">
        <section className="panel auth-panel">
          <h2>Validando sesion...</h2>
          <p className="muted">Espera un momento.</p>
        </section>
      </div>
    );
  }

  if (!isAuthenticated) {
    const target = `${location.pathname}${location.search}${location.hash}`;
    setPostLoginRedirect(target);
    return <Navigate to="/login" replace />;
  }

  return children;
}
