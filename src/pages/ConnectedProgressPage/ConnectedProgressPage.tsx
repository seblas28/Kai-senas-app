import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ConnectedProgressPage.module.css';
import { categoryData, getSignsByCategory } from '../../data/signData';
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
  const [historyCategory, setHistoryCategory] = useState('all');
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
      validatedSigns: Object.values(byCategory).reduce((sum, value) => sum + value.completed, 0),
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
  const waiting = progress.loading || catalogLoading;
  const reliableAverage = !waiting && !catalogError;
  const history = progress.snapshot.recentSessions.filter(session => historyCategory === 'all' || session.category === historyCategory).slice(0, 10);
  const retry = async () => {
    setBusy(true); setMessage('');
    try { await progress.retry(); setMessage('Sincronización revisada. Consulta el estado de las sesiones pendientes.'); }
    catch { setMessage('No se pudo completar la sincronización. Tus sesiones pendientes se conservan en este navegador.'); }
    finally { setBusy(false); }
  };
  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>CADA INTENTO CUENTA</p><h1>Mi progreso</h1><p>{user ? 'Un espacio para reconocer lo que avanzaste y elegir tu próximo paso.' : 'Tu aprendizaje empieza aquí. Cada práctica suma experiencia.'}</p></div><Link className={styles.primary} to="/">Explorar prácticas <span aria-hidden="true">↗</span></Link></header>
    <section className={styles.syncPanel} aria-label="Guardado del progreso"><div><span className={styles.syncDot} aria-hidden="true" /><div><strong>{user ? progress.loading ? 'Recuperando tu progreso' : progress.error ? 'Revisa la sincronización' : progress.pendingCount ? 'Hay sesiones por sincronizar' : 'Tu progreso, conectado a tu cuenta' : 'Estás practicando como invitado'}</strong><p>{user ? progress.pendingCount ? progress.pendingCount + ' sesiones pendientes se conservan en este navegador.' : 'Las nuevas prácticas se guardan en tu cuenta cuando hay conexión.' : 'Tu avance se conserva solo en este navegador. Con una cuenta puedes guardar tus nuevas prácticas entre dispositivos.'}</p></div></div>{user ? <button className={styles.secondary} type="button" disabled={busy || waiting} onClick={() => void retry()}>{busy ? 'Procesando…' : 'Sincronizar ahora'}</button> : <Link className={styles.secondary} to="/login">Guardar con una cuenta</Link>}</section>
    {waiting && <p role="status" className={styles.notice}>Cargando progreso y cursos…</p>}
    {catalogError && <p role="alert" className={styles.error}>{catalogError} <button type="button" onClick={() => void refreshCatalog()}>Reintentar cursos</button></p>}
    {progress.error && <p role="alert" className={styles.error}>{progress.error}</p>}
    <section className={styles.stats} aria-label="Resumen de tu aprendizaje"><div><span>Promedio de práctica</span><strong>{reliableAverage ? summary.average + '%' : '—'}</strong><small>Promedio entre categorías elegibles</small></div><div><span>Señas validadas</span><strong>{waiting ? '—' : summary.validatedSigns}</strong><small>Con validación sostenida</small></div><div><span>Sesiones registradas</span><strong>{progress.loading ? '—' : summary.sessions}</strong><small>Cada intento es parte del camino</small></div><div><span>Tiempo de práctica</span><strong className={styles.time}>{progress.loading ? '—' : summary.time}</strong><small>Tiempo total registrado</small></div></section>
    <section className={styles.courses} aria-labelledby="courses-progress-title"><div className={styles.sectionHeader}><div><p className={styles.eyebrow}>TU RECORRIDO</p><h2 id="courses-progress-title">Una seña a la vez.</h2></div><span className={styles.pill}>{waiting ? 'Cargando cursos' : summary.completed + ' de ' + categoryData.length + ' cursos completados'}</span></div><div className={styles.categoryGrid}>{!catalogLoading && !catalogError && categoryData.filter(category => states[category.id].visibility === 'visible').map(category => {
      const value = summary.byCategory[category.id], percent = value.total ? Math.round(value.completed / value.total * 100) : 0;
      const blocked = states[category.id].status === 'maintenance';
      return <article className={styles.courseCard} key={category.id}><img src={category.imageSrc} alt="" loading="lazy" /><div className={styles.courseContent}><div className={styles.courseHeading}><h3>{category.title}</h3><span>{blocked ? 'Mantenimiento' : states[category.id].stage === 'stable' ? 'Estable' : states[category.id].stage}</span></div><p>{progress.loading ? 'Cargando avance…' : value.completed + ' de ' + value.total + ' señas validadas'}</p><progress aria-label={'Avance en ' + category.title} value={progress.loading ? undefined : value.completed} max={value.total || 1} /><div className={styles.courseFooter}><span>{progress.loading ? '—' : percent + '% completado'}</span><Link to={'/practice/' + category.id}>{blocked ? 'Ver disponibilidad' : value.completed ? 'Seguir practicando' : 'Comenzar'} →</Link></div>{category.id === 'matematicas' && !countsInAverage(category.id, states[category.id]) && <small className={styles.excluded}>Fuera del promedio durante alpha y beta</small>}</div></article>;
    })}</div>{!catalogLoading && !catalogError && !categoryData.some(category => states[category.id].visibility === 'visible') && <p className={styles.empty}>No hay cursos visibles en este momento.</p>}</section>
    <section className={styles.history} aria-labelledby="history-title"><div className={styles.sectionHeader}><div><p className={styles.eyebrow}>TUS ÚLTIMOS PASOS</p><h2 id="history-title">Sesiones recientes</h2></div><div className={styles.filter}><label htmlFor="history-category">Filtrar por curso</label><select id="history-category" value={historyCategory} onChange={event => setHistoryCategory(event.target.value)}><option value="all">Todos los cursos</option>{categoryData.map(category => <option key={category.id} value={category.id}>{category.title}</option>)}</select></div></div>{progress.loading ? <p role="status">Cargando sesiones…</p> : history.length ? <ol className={styles.historyList}>{history.map((session, index) => <li key={session.timestamp + ':' + index}><span className={styles.sign}>{session.label}</span><div className={styles.sessionDetail}><strong>{categoryData.find(category => category.id === session.category)?.title || session.category}</strong><time dateTime={new Date(session.timestamp).toISOString()}>{new Date(session.timestamp).toLocaleString('es-PE')}</time></div><span className={styles.sessionScore}>{session.completed ? session.score.toFixed(1) + '%' : 'Sin validar'}</span></li>)}</ol> : <div className={styles.empty}><h3>{historyCategory === 'all' ? 'Tu próximo intento puede ser el primero.' : 'Todavía no hay sesiones de este curso.'}</h3><p>Cuando practiques, aquí podrás ver tus sesiones más recientes.</p><Link to={historyCategory === 'all' ? '/' : '/practice/' + historyCategory}>Explorar ejercicios →</Link></div>}<p className={styles.help}>Se muestran hasta 10 sesiones del historial reciente disponible.</p></section>
    <details className={styles.explainer}><summary>¿Cómo se calcula mi progreso?</summary><p>El promedio da el mismo peso a cada categoría elegible. Las señas sin validación sostenida cuentan como cero. Matemáticas queda fuera durante alpha y beta.</p><p>El porcentaje de cada tarjeta indica cuántas señas completaste; es distinto del promedio de tus puntuaciones. Estos datos son personales y no son resultados competitivos.</p></details>
    <section className={styles.storagePanel}><div><p className={styles.eyebrow}>{user ? 'HISTORIAL DEL NAVEGADOR' : 'CONTINUIDAD A TU RITMO'}</p><h2>{user ? 'Recupera tus prácticas de invitado.' : 'Dale un lugar a tus avances.'}</h2><p>{user ? 'Puedes importar un resumen por seña de este navegador. Quedará como historial sin validar; deberás repetir esas señas para completarlas. Los registros locales se conservan.' : 'Crea una cuenta para guardar tus nuevas prácticas. El progreso de invitado no se importa automáticamente.'}</p></div><div className={styles.storageActions}>{user ? <button className={styles.secondary} type="button" disabled={busy || progress.loading} onClick={() => void importGuest()}>{busy ? 'Procesando…' : 'Importar resúmenes de invitado'}</button> : <><Link className={styles.primary} to="/login">Ir a mi cuenta →</Link><button className={styles.resetButton} type="button" onClick={() => setConfirmReset(value => !value)}>Reiniciar progreso local</button></>}</div></section>
    {confirmReset && !user && <section className={styles.confirmReset} aria-labelledby="reset-title"><h2 id="reset-title">¿Reiniciar el progreso de invitado?</h2><p>Se borrará el progreso nuevo de este navegador. El historial antiguo y las cuentas no se modificarán.</p><div><button className={styles.dangerButton} type="button" onClick={() => { try { progress.resetGuest(); setConfirmReset(false); setMessage('Progreso de invitado reiniciado.'); } catch { setMessage('No se pudo reiniciar el progreso local.'); } }}>Sí, reiniciar</button><button className={styles.secondary} type="button" onClick={() => setConfirmReset(false)}>Cancelar</button></div></section>}
    {message && <p className={styles.notice} role="status">{message}</p>}
  </div>;
}
