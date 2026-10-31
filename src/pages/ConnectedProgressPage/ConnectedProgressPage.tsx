import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ProgressPage/ProgressPage.module.css';
import { categoryData, getSignsByCategory } from '../../data/signData';
import StatCard from '../../components/StatCard/StatCard';
import CategoryProgressCard from '../../components/CategoryProgressCard/CategoryProgressCard';
import { useAuth } from '../../context/AuthContext';
import { useProgress } from '../../context/ProgressContext';
import { useCatalog } from '../../context/CatalogContext';
import { categoryAverage, globalAverage, progressKey } from '../../domain/progress';
import { countsInAverage } from '../../domain/modules';

export default function ConnectedProgressPage() {
  const { user } = useAuth();
  const progress = useProgress();
  const { states, loading: catalogLoading, error: catalogError, refresh: refreshCatalog } = useCatalog();
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const summary = useMemo(() => {
    const snapshot = progress.snapshot;
    const byCategory = Object.fromEntries(categoryData.map(category => {
      const signs = getSignsByCategory(category.id);
      return [category.id, { total: signs.length, completed: signs.filter(sign => snapshot.signs[progressKey(category.id, sign.label)]?.completed).length }];
    }));
    const eligible = categoryData.filter(category => countsInAverage(category.id, states[category.id]));
    const average = globalAverage(eligible.map(category => categoryAverage(snapshot, category.id, getSignsByCategory(category.id).map(sign => sign.label))));
    const records = Object.values(snapshot.signs);
    const seconds = records.reduce((sum, value) => sum + value.totalTime, 0);
    return {
      byCategory, average: average.toFixed(1),
      completed: Object.values(byCategory).filter(value => value.total > 0 && value.completed === value.total).length,
      sessions: records.reduce((sum, value) => sum + value.sessions, 0),
      time: Math.floor(seconds / 60) + 'm ' + seconds % 60 + 's',
    };
  }, [progress.snapshot, states]);
  const importGuest = async () => {
    setBusy(true); setMessage('');
    try { const count = await progress.importGuest(); setMessage(count ? 'Se importaron ' + count + ' resúmenes como historial sin validar.' : 'No hay resúmenes nuevos disponibles para importar.'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo importar.'); }
    finally { setBusy(false); }
  };
  return <div className={styles.pageWrapper}>
    <h1 className={styles.title}>Mi progreso</h1>
    <p className={styles.subtitle}>{user ? 'Tu progreso se guarda en tu cuenta. Las sesiones pendientes se conservan en este navegador hasta sincronizar.' : 'Estás practicando como invitado. El progreso se guarda únicamente en este navegador.'}</p>
    <p>El promedio da igual peso a cada categoría. Las señas sin validación sostenida cuentan como cero. Matemáticas queda fuera durante alpha y beta. Estos datos no son resultados competitivos.</p>
    {(progress.loading || catalogLoading) && <p role="status">Cargando progreso y cursos…</p>}
    {catalogError && <p role="alert">{catalogError} <button type="button" onClick={() => void refreshCatalog()}>Reintentar cursos</button></p>}
    {progress.error && <p role="alert">{progress.error}</p>}
    {!!progress.pendingCount && <p role="status">Sesiones pendientes: {progress.pendingCount}</p>}
    {user && <button type="button" disabled={busy} onClick={() => { setBusy(true); void progress.retry().catch(() => {}).finally(() => setBusy(false)); }}>Sincronizar ahora</button>}
    <section className={styles.section}><div className={styles.statsGrid}>
      <StatCard label="Cursos completados" value={summary.completed + ' / ' + categoryData.length} icon="🏆" />
      <StatCard label="Promedio de práctica" value={summary.average + '%'} icon="📊" />
      <StatCard label="Sesiones" value={summary.sessions} icon="🔄" />
      <StatCard label="Tiempo total" value={summary.time} icon="⏱️" />
    </div></section>
    <section className={styles.section}><h2 className={styles.sectionTitle}>Resumen de cursos</h2><div className={styles.categoryGrid}>
      {categoryData.filter(category => states[category.id].visibility === 'visible').map(category => <CategoryProgressCard key={category.id} title={category.title} imageSrc={category.imageSrc} completedCount={summary.byCategory[category.id].completed} totalCount={summary.byCategory[category.id].total} practiceLink={'/practice/' + category.id} />)}
    </div></section>
    <section className={styles.section}><h2 className={styles.sectionTitle}>Sesiones recientes</h2><div className={styles.list}>
      {progress.snapshot.recentSessions.slice(0,5).map((session, index) => <div className={styles.listItem} key={session.timestamp + ':' + index}>
        <span>{session.category}: <strong>{session.label}</strong></span><span className={styles.score}>{session.completed ? session.score.toFixed(1) + '%' : 'Sin validar'}</span>
        <span className={styles.timestamp}>{new Date(session.timestamp).toLocaleString('es')}</span>
      </div>)}
      {!progress.snapshot.recentSessions.length && <p>Aún no hay sesiones registradas.</p>}
    </div></section>
    <section className={styles.section}><h2 className={styles.sectionTitle}>{user ? 'Historial del navegador' : 'Guarda tu avance'}</h2>
      {user ? <><p>Puedes importar un resumen por seña del progreso de invitado de este navegador. Se guardará como legado sin validar; deberás repetir las señas para completarlas. Los registros locales se conservan.</p><button type="button" disabled={busy || progress.loading} onClick={() => void importGuest()}>Importar resúmenes de invitado</button></> : <><p>Crea una cuenta para guardar tus nuevas prácticas entre dispositivos.</p><Link to="/login">Crear cuenta o iniciar sesión</Link><p><button type="button" onClick={() => setConfirmReset(true)}>Reiniciar progreso local</button></p></>}
      {message && <p role="status">{message}</p>}
    </section>
    {confirmReset && <div className={styles.confirmOverlay}><div className={styles.confirmModal}><h3>¿Reiniciar el progreso de invitado?</h3><p>Se borrará el progreso nuevo de este navegador. El historial antiguo y las cuentas no se modificarán.</p><button onClick={() => { try { progress.resetGuest(); setConfirmReset(false); } catch { setMessage('No se pudo reiniciar el progreso local.'); } }}>Reiniciar</button><button onClick={() => setConfirmReset(false)}>Cancelar</button></div></div>}
  </div>;
}
