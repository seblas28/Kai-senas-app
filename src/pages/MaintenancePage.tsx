import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { canManage } from '../domain/modules';
import { supabase } from '../lib/supabase';

function MaintenanceForm({ moduleId, label, status, visibility, reason, afterSave }: { moduleId: string; label?: string; status: string; visibility: string; reason: string; afterSave: () => Promise<void> }) {
  const [values, setValues] = useState({ status, visibility, maintenance_reason: reason });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { setValues({ status, visibility, maintenance_reason: reason }); }, [moduleId, label, status, visibility, reason]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const query = label ? supabase.from('exercises').update(values).eq('module_id', moduleId).eq('label', label).select('label').single() : supabase.from('modules').update(values).eq('id', moduleId).select('id').single();
      const { error } = await query;
      if (error) throw error;
      await afterSave(); setMessage('Cambios guardados.');
    } catch { setMessage('No se pudo guardar. Comprueba la conexión y tus permisos.'); }
    finally { setBusy(false); }
  };
  return <form className="kai-maintenance-form" onSubmit={submit}>
    <h3>{label || 'Todo el módulo'}</h3>
    <label>Disponibilidad<select value={values.status} onChange={event => setValues(v => ({ ...v, status: event.target.value }))}><option value="active">Activo</option><option value="maintenance">En mantenimiento</option></select></label>
    <label>Visibilidad<select value={values.visibility} onChange={event => setValues(v => ({ ...v, visibility: event.target.value }))}><option value="visible">Visible</option><option value="hidden">Oculto</option></select></label>
    <label>Motivo<input value={values.maintenance_reason} maxLength={500} onChange={event => setValues(v => ({ ...v, maintenance_reason: event.target.value }))} /></label>
    <button disabled={busy} type="submit">{busy ? 'Guardando…' : 'Guardar'}</button><p role="status">{message}</p>
  </form>;
}
export default function MaintenancePage() {
  const { user, roleLoading } = useAuth();
  const catalog = useCatalog();
  const [selected, setSelected] = useState('vocales');
  if (roleLoading || catalog.loading) return <section className="kai-notice">Comprobando permisos…</section>;
  if (!canManage(user?.role)) return <section className="kai-notice"><h1>Acceso restringido</h1><p>Esta sección requiere una cuenta administradora.</p><Link to="/login">Mi cuenta</Link></section>;
  if (catalog.error) return <section className="kai-notice" role="alert">{catalog.error}<button onClick={() => void catalog.refresh()}>Reintentar</button></section>;
  const module = catalog.modules.find(row => row.id === selected);
  return <section className="kai-notice"><h1>Mantenimiento de prácticas</h1><p>El estado del módulo prevalece sobre sus señas. Cambiar mantenimiento no habilita modelos que aún faltan.</p>
    <label>Curso<select value={selected} onChange={event => setSelected(event.target.value)}>{catalog.modules.map(row => <option key={row.id} value={row.id}>{row.id}</option>)}</select></label>
    {module && <MaintenanceForm moduleId={selected} status={module.status} visibility={module.visibility} reason={module.maintenance_reason} afterSave={catalog.refresh} />}
    {catalog.exercises.filter(row => row.module_id === selected).map(row => <div key={row.label}>
      {!row.supported && <p>Modelo pendiente: {row.label}</p>}
      <MaintenanceForm moduleId={selected} label={row.label} status={row.status} visibility={row.visibility} reason={row.maintenance_reason} afterSave={catalog.refresh} />
    </div>)}
  </section>;
}
