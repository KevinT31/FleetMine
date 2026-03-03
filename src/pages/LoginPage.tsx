import { LogIn } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { isAuthenticated, loading, login } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page auth-page">
      <section className="panel auth-panel">
        <div className="auth-brand">
          <div className="brand-badge">FM</div>
          <div>
            <strong>FleetMine IoT</strong>
            <small>Acceso seguro con Cognito</small>
          </div>
        </div>

        <h2>Iniciar sesion</h2>
        <p className="muted">
          Debes autenticarte para ver datos operativos, telemetria y alertas de la flota.
        </p>

        <button
          type="button"
          className="solid-button auth-login-button"
          disabled={loading}
          onClick={() => {
            void login().catch((err) => {
              console.error('[Auth] Login failed', err);
            });
          }}
        >
          <LogIn size={16} />
          {loading ? 'Redirigiendo...' : 'Iniciar sesion con Cognito'}
        </button>
      </section>
    </div>
  );
}

