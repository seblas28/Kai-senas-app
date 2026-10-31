import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { AppUser } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database, Json } from '../../lib/database.types';
import { canApprove } from '../../domain/modules';
import { packTfjs, validateBundle, MAX_MODEL_BYTES } from '../../domain/modelBundle';
import { allowedModelLabels, verifyBundle } from '../../lib/modelRuntime';
import styles from './MaintenancePage.module.css';

type Version = Database['public']['Tables']['model_versions']['Row'];
type Channel = Database['public']['Tables']['model_channels']['Row'];
const names: Record<string, string> = { vocales: 'Vocales', abecedario: 'Abecedario', numeros: 'Números', matematicas: 'Matemáticas' };
function modelError(error: unknown): string {
  const text = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (text.includes('MODEL_FORBIDDEN')) return 'Tu cuenta no tiene permiso para esta acción. Actualiza la página para revisar tu rol.';
  if (text.includes('MODEL_STALE_PUBLICATION')) return 'Otra persona cambió la versión publicada. Actualiza el listado antes de volver a publicar.';
  if (text.includes('MODEL_NOT_PENDING')) return 'Esta versión ya fue revisada. Actualiza el listado.';
  if (text.includes('MODEL_UPLOAD_LIMIT')) return 'Alcanzaste el límite: 10 versiones pendientes o 20 subidas en un día.';
  if (text.includes('MODEL_')) return 'El servidor rechazó el formato, los datos o el estado de esta versión.';
  if (text.includes('duplicate') || text.includes('unique')) return 'Ya existe esa versión en el módulo. Usa un nombre diferente.';
  return 'No se pudo completar la operación. Comprueba la conexión y vuelve a actualizar el listado.';
}
export default function ModelsPanel({ user, afterPublication }: { user: AppUser; afterPublication: () => Promise<void> }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [limit, setLimit] = useState(50);
  const [moduleId, setModuleId] = useState('vocales');
  const [versionName, setVersionName] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Version | null>(null);
  const [inspection, setInspection] = useState('');
  const [verified, setVerified] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [qualityConfirmed, setQualityConfirmed] = useState(false);
  const [publishConfirmation, setPublishConfirmation] = useState('');
  const [mode, setMode] = useState<'review' | 'publish' | null>(null);
  const generation = useRef(0);
  const reviewer = canApprove(user.role);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setListError('');
    try {
      const [rows, active] = await Promise.all([supabase.from('model_versions').select('*').order('created_at', { ascending: false }).limit(limit), supabase.from('model_channels').select('*')]);
      if (request !== generation.current) return;
      if (rows.error || active.error) throw rows.error || active.error;
      setVersions(rows.data || []); setChannels(active.data || []);
    } catch { if (request === generation.current) setListError('No se pudo cargar el registro de modelos.'); }
    finally { if (request === generation.current) setLoading(false); }
  }, [limit]);
  useEffect(() => { void refresh(); return () => { generation.current++; }; }, [refresh]);
  const upload = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setMessage('Comprobando archivos y ejecución del modelo…');
    try {
      if (!files.length || files.length > 20 || files.reduce((sum, file) => sum + file.size, 0) > MAX_MODEL_BYTES) throw new Error('Selecciona los archivos del modelo. El total no debe superar 2 MiB ni 20 archivos.');
      if (new Set(files.map(file => file.name)).size !== files.length) throw new Error('Hay archivos con el mismo nombre.');
      let bundle;
      if (files.length === 1) bundle = validateBundle(JSON.parse(await files[0].text()), allowedModelLabels(moduleId));
      else {
        const modelFile = files.find(file => file.name === 'model.json');
        const labelsFile = files.find(file => file.name === `labels_${moduleId}.json` || file.name === 'labels.json');
        if (!modelFile || !labelsFile) throw new Error(`Selecciona model.json, labels_${moduleId}.json y los .bin de esa exportación.`);
        const shards = new Map<string, ArrayBuffer>();
        for (const file of files.filter(file => file.name.endsWith('.bin'))) shards.set(file.name, await file.arrayBuffer());
        bundle = packTfjs(JSON.parse(await modelFile.text()), JSON.parse(await labelsFile.text()), shards, allowedModelLabels(moduleId));
      }
      await verifyBundle(bundle);
      const { error: failure } = await supabase.rpc('submit_model', { p_module: moduleId, p_version: versionName.trim(), p_notes: notes.trim(), p_bundle: bundle as unknown as Json });
      if (failure) { setError(modelError(failure)); setMessage(''); return; }
      setFiles([]); setFileKey(key => key + 1); setNotes(''); setVersionName(''); setMessage('Versión enviada a revisión. El modelo de las prácticas sigue igual.'); await refresh();
    } catch (failure) { setMessage(''); setError(failure instanceof Error ? failure.message : 'No se pudieron leer los archivos.'); }
    finally { setBusy(false); }
  };
  const openVersion = (row: Version, nextMode: 'review' | 'publish') => {
    setSelected(row); setMode(nextMode); setVerified(false); setInspection(''); setReviewNote(''); setQualityConfirmed(false); setPublishConfirmation(''); setError(''); setMessage('');
  };
  const inspect = async () => {
    if (!selected || busy) return;
    setBusy(true); setVerified(false); setInspection('Comprobando formato, pesos y ejecución…'); setError('');
    try {
      const { data, error: failure } = await supabase.rpc('get_model_artifact', { p_id: selected.id });
      if (failure) throw failure;
      const bundle = validateBundle(data, allowedModelLabels(selected.module_id)); await verifyBundle(bundle);
      setVerified(true); setInspection(`Compatible: 126 coordenadas, ${bundle.network.length} capas densas y ${bundle.labels.length} etiquetas. Esto no mide su precisión con señas reales.`);
    } catch { setInspection('La comprobación técnica falló. No apruebes ni publiques esta versión.'); }
    finally { setBusy(false); }
  };
  const decide = async (approve: boolean) => {
    if (!selected || busy || !reviewer || approve && (!verified || !qualityConfirmed)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: failure } = await supabase.rpc('review_model', { p_id: selected.id, p_approve: approve, p_note: reviewNote.trim() });
      if (failure) throw failure;
      setSelected(null); setMessage(approve ? 'Versión aprobada. Aún falta publicarla para usarla en las prácticas.' : 'Versión rechazada. Los archivos y el motivo quedan en el historial.'); await refresh();
    } catch (failure) { setError(modelError(failure)); }
    finally { setBusy(false); }
  };
  const publish = async () => {
    if (!selected || busy || !reviewer || !verified || !qualityConfirmed || publishConfirmation !== selected.version) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const active = channels.find(channel => channel.module_id === selected.module_id)?.active_version;
      const { error: failure } = await supabase.rpc('publish_model', { p_id: selected.id, ...(active ? { p_expected_active: active } : {}) });
      if (failure) throw failure;
      setSelected(null); setMessage('Versión publicada. Se cargará al abrir una práctica nueva. Revisa el mantenimiento de las señas recién incorporadas.'); await Promise.all([refresh(), afterPublication()]);
    } catch (failure) { setError(modelError(failure)); }
    finally { setBusy(false); }
  };
  return <div className={styles.modelsWorkspace}>
    <div className={styles.panel}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>DEL EQUIPO A LAS PRÁCTICAS</p><h2>Modelos de IA</h2></div><button className={styles.secondaryButton} type="button" disabled={loading || busy} onClick={() => { setSelected(null); void refresh(); }}>Actualizar listado</button></div>
      <ol className={styles.workflow}><li><span>01</span><strong>Subir</strong><small>Admin o superadmin</small></li><li><span>02</span><strong>Revisar y aprobar</strong><small>Solo superadmin</small></li><li><span>03</span><strong>Publicar</strong><small>Solo superadmin</small></li></ol>
      <p className={styles.muted}>El entrenamiento es local. Una subida no modifica el modelo activo. Sin una versión publicada, las prácticas usan el modelo incluido con la aplicación.</p>
    </div>
    <form className={styles.panel} onSubmit={upload}><fieldset disabled={busy}><legend>Enviar una versión a revisión</legend><div className={styles.formGrid}>
      <label>Módulo<select value={moduleId} onChange={event => { setModuleId(event.target.value); setFiles([]); setFileKey(key => key + 1); }}>{Object.entries(names).map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>
      <label>Nombre de versión<input value={versionName} required maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9._\-]{0,39}" placeholder="Ej.: vocales-2026.10-v1" onChange={event => setVersionName(event.target.value)} /></label>
      <label className={styles.fullWidth}>Qué cambió y cómo lo probaste<textarea required minLength={10} maxLength={2000} rows={3} value={notes} placeholder="Describe los datos usados, pruebas con personas y fallas conocidas." onChange={event => setNotes(event.target.value)} /></label>
      <label className={styles.fullWidth}>Archivos exportados<input key={fileKey} type="file" multiple required accept=".json,.bin" onChange={event => setFiles(Array.from(event.target.files || []))} /><span className={styles.help}>Selecciona model.json, labels_{moduleId}.json y todos sus .bin. También se admite un paquete Kai v1. Hasta 2 MiB; no acepta .h5, .keras ni archivos ZIP.</span></label>
    </div><div className={styles.formFooter}><span>{files.length ? `${files.length} archivos seleccionados` : 'Cada versión conserva sus propios archivos.'}</span><button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? 'Procesando…' : 'Enviar a revisión'}</button></div></fieldset></form>
    <p className={styles.message} role="status">{message}</p>{error && <p className={styles.error} role="alert">{error}</p>}
    {selected && <section className={styles.reviewPanel} aria-label="Revisión de versión"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{mode === 'publish' ? 'CONFIRMAR PUBLICACIÓN' : 'REVISIÓN DE MODELO'}</p><h2>{names[selected.module_id]} / {selected.version}</h2></div><button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => setSelected(null)}>Cerrar</button></div><p>{selected.notes}</p><p className={styles.help}>Etiquetas: {selected.labels.join(', ')}</p><p className={styles.hash}>Huella SHA-256: {selected.artifact_hash}</p>
      <button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => void inspect()}>Comprobar compatibilidad</button><p role="status">{inspection}</p>
      {reviewer && (mode === 'review' && selected.status === 'pending' || mode === 'publish' && selected.status === 'approved' && !channels.some(channel => channel.active_version === selected.id)) && <><label className={styles.checkboxLabel}><input type="checkbox" checked={qualityConfirmed} disabled={busy} onChange={event => setQualityConfirmed(event.target.checked)} />Revisé el modelo exportado localmente con señas reales, etiquetas correctas y casos de error.</label>
      {mode === 'review' ? <><label className={styles.standaloneLabel}>Resultado de la revisión<textarea value={reviewNote} minLength={10} maxLength={2000} rows={3} disabled={busy} onChange={event => setReviewNote(event.target.value)} placeholder="Registra pruebas realizadas y motivo de la decisión (mínimo 10 caracteres)." /></label><div className={styles.actions}><button type="button" className={styles.primaryButton} disabled={busy || !verified || !qualityConfirmed || reviewNote.trim().length < 10} onClick={() => void decide(true)}>Aprobar versión</button><button type="button" className={styles.dangerButton} disabled={busy || reviewNote.trim().length < 10} onClick={() => void decide(false)}>Rechazar versión</button></div></> : <><p className={styles.warning}>Esta acción sustituirá la versión activa de {names[selected.module_id]}. Las prácticas ya abiertas mantendrán su modelo hasta volver a abrirse. El mantenimiento no cambiará.</p><label className={styles.standaloneLabel}>Escribe «{selected.version}» para publicar<input value={publishConfirmation} disabled={busy} onChange={event => setPublishConfirmation(event.target.value)} /></label><button type="button" className={styles.primaryButton} disabled={busy || !verified || !qualityConfirmed || publishConfirmation !== selected.version || loading || !!listError} onClick={() => void publish()}>Publicar esta versión</button></>}
      </>}
    </section>}
    <section className={styles.panel}><div className={styles.sectionHeading}><div><h2>Registro de versiones</h2><p>Las aprobadas pueden publicarse o restaurarse sin volver a subir archivos.</p></div></div>
      {loading && <p role="status">Cargando versiones…</p>}{listError && <p role="alert" className={styles.error}>{listError}</p>}
      {!loading && !listError && !versions.length && <div className={styles.empty}><h3>Aún no hay versiones subidas</h3><p>Envía tu primer modelo entrenado localmente para iniciar la revisión.</p></div>}
      {!listError && versions.map(row => { const active = channels.some(channel => channel.active_version === row.id); return <article key={row.id} className={styles.versionCard}><div className={styles.versionHeading}><div><small>{names[row.module_id]}</small><h3>{row.version}</h3></div><span className={styles.statusBadge}>{active ? 'Publicada · en uso' : row.status === 'approved' ? row.published_at ? 'Aprobada · versión anterior' : 'Aprobada · sin publicar' : row.status === 'rejected' ? 'Rechazada' : 'Pendiente de revisión'}</span></div><p>{row.notes}</p><p className={styles.help}>{new Date(row.created_at).toLocaleString('es-PE')} · {row.labels.length} etiquetas · {Math.ceil(row.artifact_bytes / 1024)} KiB · {row.submitted_by === user.id ? 'Subida por ti' : 'Otro administrador'}</p>{row.review_note && <p className={styles.reviewNote}>Revisión: {row.review_note}</p>}<div className={styles.actions}><button className={styles.secondaryButton} type="button" disabled={busy || loading} onClick={() => openVersion(row, row.status === 'approved' ? 'publish' : 'review')}>{reviewer && row.status === 'pending' ? 'Revisar versión' : 'Ver detalles'}</button>{reviewer && row.status === 'approved' && !active && <button className={styles.primaryButton} type="button" disabled={busy || loading} onClick={() => openVersion(row, 'publish')}>{row.published_at ? 'Restaurar versión' : 'Preparar publicación'}</button>}</div></article>; })}
      {!loading && versions.length === limit && <button className={styles.secondaryButton} type="button" onClick={() => { setSelected(null); setLimit(value => value + 50); }}>Cargar versiones anteriores</button>}
    </section>
  </div>;
}
