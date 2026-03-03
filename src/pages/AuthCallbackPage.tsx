import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { consumePostLoginRedirect } from '../auth/authRedirect';
import { handleCallback } from '../auth/authService';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        await handleCallback(window.location.search);
        if (!active) return;
        refreshAuth();
        const redirectPath = consumePostLoginRedirect() || '/';
        navigate(redirectPath, { replace: true });
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No fue posible completar el login');
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [navigate, refreshAuth]);

  return (
    <div className="page">
      <section className="panel">
        <h2>Iniciando sesion...</h2>
        {error ? <p className="muted">Error: {error}</p> : <p className="muted">Procesando callback de Cognito.</p>}
      </section>
    </div>
  );
}
