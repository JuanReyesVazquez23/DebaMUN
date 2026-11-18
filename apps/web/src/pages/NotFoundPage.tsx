import { Link } from 'react-router-dom';
import { Brand } from '../components/AppShell';

export function NotFoundPage() {
  return (
    <div className="notfound">
      <Brand />
      <p className="eyebrow">Error 404</p>
      <h1 className="display">Esta sala no existe.</h1>
      <p className="lead">
        La dirección que abriste no corresponde a ninguna vista de DebaMun. Vuelve al panel o
        empieza de nuevo con tu delegación.
      </p>
      <div className="actions">
        <Link className="button" to="/">
          Volver al inicio
        </Link>
        <Link className="button button--ghost" to="/bienvenida">
          Cambiar de delegación
        </Link>
      </div>
    </div>
  );
}
