import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { canManage } from '../../domain/modules';
import { supabase } from '../../lib/supabase';
import ModelsPanel from './ModelsPanel';
import styles from './MaintenancePage.module.css';

function MaintenanceForm({ moduleId, label, status, visibility, reason, supported = true, afterSave }: { moduleId: string; label?: string; status: string; visibility: string; reason: string; supported?: boolean; afterSave: () => Promise<void> }) {
  const [values, setValues] = useState({ status, visibility, maintenance_reason: reason });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => { setValues({ status, visibility, maintenance_reason: reason }); setMessage(''); }, [moduleId, label, status, visibility, reason]);
  const dirty = values.status !== status || values.visibility !== visibility || values.maintenance_reason !== reason;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage(''); setFailed(false);
    try {
      const query = label ? supabase.from('exercises').update(values).eq('module_id', moduleId).eq('label', label).select('label').single() : supabase.from('modules').update(values).eq('id', moduleId).select('id').single();
      const { error } = await query;
      if (error) throw error;
      await afterSave(); setMessage('Cambios guardados.');
    } catch { setFailed(true); setMessage('No se pudo guardar. Comprueba la conexión y tus permisos.'); }
    finally { setBusy(false); }
  };
  return <form className={styles.maintenanceForm} onSubmit={submit}>
    <fieldset disabled={busy}><legend>{label ? `Seña ${label}` : 'Configuración del módulo'}</legend>
      {!supported && <p className={styles.warning}>Sin modelo compatible. Activar esta opción no habilita la práctica.</p>}
      <div className={styles.formGrid}>
        <label>Disponibilidad<select value={values.status} onChange={event => setValues(v => ({ ...v, status: event.target.value }))}><option value="active">Activo</option><option value="maintenance">En mantenimiento</option></select></label>
        <label>Visibilidad<select value={values.visibility} onChange={event => setValues(v => ({ ...v, visibility: event.target.value }))}><option value="visible">Mostrar en pantalla</option><option value="hidden">Ocultar</option></select></label>
        <label className={styles.fullWidth}>Mensaje para los aprendices<input placeholder="Ej.: Estamos actualizando esta seña." value={values.maintenance_reason} maxLength={500} onChange={event => setValues(v => ({ ...v, maintenance_reason: event.target.value }))} /></label>
      </div>
      <div className={styles.formFooter}><span>{values.visibility === 'hidden' ? 'No aparecerá para los aprendices.' : values.status === 'maintenance' || !supported ? 'Se mostrará como no disponible.' : 'Disponible si el módulo también está activo.'}</span><button className={styles.primaryButton} disabled={busy || !dirty} type="submit">{busy ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </fieldset><p className={styles.message} role={failed ? 'alert' : 'status'}>{message}</p>
  </form>;
}
const titles: Record<string, string> = { vocales: 'Vocales', abecedario: 'Abecedario', numeros: 'Números', matematicas: 'Matemáticas' };
export default function MaintenancePage() {
  const { user, roleLoading } = useAuth();
  const catalog = useCatalog();
  const [selected, setSelected] = useState('vocales');
  const [tab, setTab] = useState<'maintenance' | 'models' | 'permissions'>('maintenance');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  if (roleLoading || catalog.loading) return <section className="kai-notice" role="status">Comprobando permisos…</section>;
  if (!canManage(user?.role)) return <section className="kai-notice"><h1>Acceso restringido</h1><p>Esta sección requiere una cuenta administradora.</p><Link to="/login">Mi cuenta</Link></section>;
  if (catalog.error) return <section className="kai-notice" role="alert">{catalog.error}<button onClick={() => void catalog.refresh()}>Reintentar</button></section>;
  const module = catalog.modules.find(row => row.id === selected);
  const exercises = catalog.exercises.filter(row => row.module_id === selected);
  const visibleExercises = exercises.filter(row => row.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) && (filter === 'all' || filter === 'pending' && !row.supported || filter === 'maintenance' && row.status === 'maintenance' || filter === 'hidden' && row.visibility === 'hidden'));
  return <section className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>ESPACIO DE GESTIÓN</p><h1>Administración</h1><p>Cuida las prácticas y acompaña cada actualización de Kai Señas.</p></div><span className={styles.roleBadge}>{user?.role === 'superadmin' ? 'Superadmin' : 'Administrador'}</span></header>
    <div className={styles.summary}>
      <div><span>Módulos</span><strong>{catalog.modules.length}</strong><small>En el catálogo</small></div>
      <div><span>En mantenimiento</span><strong>{catalog.modules.filter(row => row.status === 'maintenance').length}</strong><small>Módulos completos</small></div>
      <div><span>Señas sin modelo</span><strong>{catalog.exercises.filter(row => !row.supported).length}</strong><small>Pendientes de cobertura</small></div>
      <div><span>Publicación</span><strong className={styles.summaryWord}>{user?.role === 'superadmin' ? 'Habilitada' : 'Restringida'}</strong><small>Solo para superadmin</small></div>
    </div>
    <nav className={styles.sectionNav} aria-label="Secciones de administración">{([{ id: 'maintenance', text: 'Prácticas y mantenimiento' }, { id: 'models', text: 'Modelos de IA' }, { id: 'permissions', text: 'Roles y permisos' }] as const).map(item => <button key={item.id} type="button" aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}>{item.text}</button>)}</nav>
    {tab === 'maintenance' && <div className={styles.workspace}>
      <aside className={styles.sidebar}><h2>Módulos</h2>{catalog.modules.map(row => <button key={row.id} type="button" aria-pressed={selected === row.id} onClick={() => { setSelected(row.id); setSearch(''); setFilter('all'); }}><strong>{titles[row.id] || row.id}</strong><span>{row.visibility === 'hidden' ? 'Oculto' : row.status === 'maintenance' ? 'En mantenimiento' : 'Activo'} · {row.stage === 'stable' ? 'Estable' : row.stage}</span></button>)}<p>El estado del módulo se aplica a todas sus señas.</p></aside>
      <div className={styles.content}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>DISPONIBILIDAD</p><h2>{titles[selected] || selected}</h2></div><Link className={styles.textLink} to={`/training/${selected}`}>Capturar muestras ↗</Link></div>
        {module && <MaintenanceForm key={selected} moduleId={selected} status={module.status} visibility={module.visibility} reason={module.maintenance_reason} afterSave={catalog.refresh} />}
        <div className={styles.sectionHeading}><div><h2>Señas del módulo</h2><p>{exercises.filter(row => row.supported).length} de {exercises.length} con modelo compatible</p></div></div>
        {module && (module.status !== 'active' || module.visibility !== 'visible') && <p className={styles.warning}>Este módulo está {module.visibility === 'hidden' ? 'oculto' : 'en mantenimiento'}. Sus señas no estarán disponibles aunque estén activas.</p>}
        <div className={styles.filters}><label>Buscar seña<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Ej.: A" /></label><label>Filtrar<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Todas las señas</option><option value="maintenance">En mantenimiento</option><option value="pending">Sin modelo</option><option value="hidden">Ocultas</option></select></label></div>
        <p className={styles.resultCount} role="status">{visibleExercises.length} señas encontradas</p>
        {visibleExercises.map(row => <details className={styles.exercise} key={`${selected}:${row.label}`}><summary><strong>{row.label}</strong><span>{!row.supported ? 'Sin modelo' : row.visibility === 'hidden' ? 'Oculta' : row.status === 'maintenance' ? 'En mantenimiento' : 'Activa'}</span><span aria-hidden="true">＋</span></summary><MaintenanceForm moduleId={selected} label={row.label} status={row.status} visibility={row.visibility} reason={row.maintenance_reason} supported={row.supported} afterSave={catalog.refresh} /></details>)}
        {!visibleExercises.length && <p className={styles.empty}>No hay señas que coincidan con estos filtros.</p>}
      </div>
    </div>}
    {tab === 'models' && user && <ModelsPanel key={user.id} user={user} afterPublication={catalog.refresh} />}
    {tab === 'permissions' && <div className={styles.panel}><p className={styles.eyebrow}>RESPONSABILIDADES CLARAS</p><h2>Un rol para cada tarea</h2><p>El entrenamiento ocurre en tu equipo. La subida crea una versión pendiente; la aprobación y la publicación son pasos separados.</p><div className={styles.tableScroll}><table className={styles.permissionTable}><caption>Permisos de cada rol</caption><thead><tr><th scope="col">Acción</th><th scope="col">Usuario</th><th scope="col">Admin</th><th scope="col">Superadmin</th></tr></thead><tbody>{[['Practicar y guardar progreso', true, true, true], ['Capturar muestras y subir modelos', false, true, true], ['Cambiar mantenimiento y visibilidad', false, true, true], ['Revisar, aprobar o rechazar modelos', false, false, true], ['Publicar o restaurar una versión aprobada', false, false, true]].map(([action, ...permissions]) => <tr key={String(action)}><th scope="row">{action}</th>{permissions.map((allowed, index) => <td key={index}>{allowed ? 'Permitido' : '—'}</td>)}</tr>)}</tbody></table></div><div className={styles.infoBox}><h3>La aprobación no activa el modelo</h3><p>Solo la publicación cambia la versión que se cargará al abrir una práctica. No elimina el mantenimiento ni incorpora matemáticas al promedio mientras esté en alpha o beta.</p><p>Los permisos se comprueban en Supabase en cada operación. No se pueden cambiar roles desde este panel.</p></div></div>}
  </section>;
}
