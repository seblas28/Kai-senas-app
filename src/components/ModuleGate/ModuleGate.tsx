import { Link, useParams, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { isModuleId, canManage, practiceBlock } from '../../domain/modules';
import { useCatalog } from '../../context/CatalogContext';
import { useAuth } from '../../context/AuthContext';
import { getSignsByCategory } from '../../data/signData';
export default function ModuleGate({ children, training = false }: { children: ReactNode; training?: boolean }) {
  const { states: moduleStates, loading, error, refresh } = useCatalog();
  const { user, roleLoading } = useAuth();
  const params = useParams();
  const location = useLocation();
  const category = params.category || (location.pathname === '/practice/matematicas' ? 'matematicas' : undefined);
  const sign = params.sign;
  if (!isModuleId(category)) return <section className="kai-notice"><h1>Curso no encontrado</h1><Link to="/">Ver cursos</Link></section>;
  if (loading || (training && roleLoading)) return <section className="kai-notice" role="status">Comprobando disponibilidad…</section>;
  if (error) return <section className="kai-notice" role="alert">{error}<button onClick={() => void refresh()}>Reintentar</button></section>;
  const reason = training ? null : practiceBlock(moduleStates[category], sign);
  const invalidSign = sign && !getSignsByCategory(category).some(item => item.label === sign);
  if (reason || invalidSign) return <section className="kai-notice" role="status"><h1>Práctica no disponible</h1><p>{reason || 'Esta seña no pertenece al curso.'}</p><Link to="/">Volver a los cursos</Link></section>;
  if (training && !canManage(user?.role)) return <section className="kai-notice"><h1>Acceso administrativo</h1><p>Inicia sesión con una cuenta admin o superadmin para capturar muestras.</p><Link to="/">Volver al inicio</Link></section>;
  return <>{children}</>;
}
