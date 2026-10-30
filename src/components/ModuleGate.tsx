import { Link, useParams, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { isModuleId, moduleStates, practiceBlock } from '../domain/modules';
import { getSignsByCategory } from '../data/signData';
export default function ModuleGate({ children, training = false }: { children: ReactNode; training?: boolean }) {
  const params = useParams();
  const location = useLocation();
  const category = params.category || (location.pathname === '/practice/matematicas' ? 'matematicas' : undefined);
  const sign = params.sign;
  if (!isModuleId(category)) return <section className="kai-notice"><h1>Curso no encontrado</h1><Link to="/">Ver cursos</Link></section>;
  const reason = training ? null : practiceBlock(moduleStates[category], sign);
  const invalidSign = sign && !getSignsByCategory(category).some(item => item.label === sign);
  if (reason || invalidSign) return <section className="kai-notice" role="status"><h1>Práctica no disponible</h1><p>{reason || 'Esta seña no pertenece al curso.'}</p><Link to="/">Volver a los cursos</Link></section>;
  if (training && !import.meta.env.DEV) return <section className="kai-notice"><h1>Acceso administrativo pendiente</h1><p>El entrenamiento estará disponible con una cuenta autorizada.</p><Link to="/">Volver al inicio</Link></section>;
  return <>{children}</>;
}
