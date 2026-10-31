import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, authMessage } from '../../lib/supabase';
import styles from './AccountPage.module.css';
import { canManage } from '../../domain/modules';

export default function AccountPage() {
  const { user, error: identityError, roleLoading, refreshIdentity, recovering, finishRecovery, signOut } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState(user?.displayName || '');
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => { setName(user?.displayName || ''); }, [user?.id, user?.displayName]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    try {
      if (recovering) {
        if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
        const result = await supabase.auth.updateUser({ password });
        if (result.error) throw result.error;
        setPassword(''); setConfirm(''); finishRecovery(); setMessage('Contraseña actualizada.');
      } else if (user) {
        const result = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', user.id).select('display_name').single();
        if (result.error) throw result.error;
        refreshIdentity(); setMessage('Nombre actualizado.');
      } else if (mode === 'signin') {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
        setPassword('');
      } else if (mode === 'signup') {
        if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
        const result = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin + '/login' } });
        if (result.error) throw result.error;
        setPassword(''); setConfirm('');
        setMessage(result.data.session ? 'Tu cuenta está lista.' : 'Revisa tu correo y confirma tu cuenta. Después podrás iniciar sesión.');
      } else {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/login' });
        if (result.error) throw result.error;
        setMessage('Si hay una cuenta asociada, recibirás las instrucciones por correo.');
      }
    } catch (e) { setError(authMessage(e)); }
    finally { setBusy(false); }
  };
  const changeMode = (value: typeof mode) => { setMode(value); setPassword(''); setConfirm(''); setError(null); setMessage(null); setShowPassword(false); };
  const title = recovering ? 'Elige una nueva contraseña.' : user ? 'Tu espacio en Kai Señas.' : mode === 'signup' ? 'Cada avance empieza con un paso.' : mode === 'reset' ? 'Recupera tu acceso.' : 'Qué bueno verte de nuevo.';
  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>MI CUENTA</p><h1>{title}</h1><p>{recovering ? 'Actualiza tu contraseña para volver a tu aprendizaje.' : user ? 'Administra tu perfil y vuelve a lo que quieres aprender.' : 'Guarda tus prácticas y lleva tu aprendizaje contigo.'}</p></div>{user && !recovering && <span className={styles.badge}>{roleLoading ? 'Comprobando permisos…' : ({ user: 'Aprendiz', admin: 'Administrador', superadmin: 'Superadmin' }[user.role])}</span>}</header>
    <div className={user && !recovering ? styles.profileLayout : styles.accessLayout}>
      {!user && !recovering && <aside className={styles.welcomePanel}><span className={styles.welcomeMark} aria-hidden="true">Kai.</span><h2>Un lugar para<br />seguir creciendo.</h2><p>Tu constancia tiene un espacio aquí. Retoma tus prácticas y consulta los resultados que vas construyendo.</p><ul><li>Guarda el progreso de tus nuevas prácticas.</li><li>Consulta tus resultados desde otros dispositivos.</li><li>Aprende a tu ritmo, una seña a la vez.</li></ul><Link to="/">Explorar como invitado →</Link></aside>}
      <section className={styles.formPanel} aria-labelledby="account-form-title">
        <div className={styles.panelHeading}><p className={styles.eyebrow}>{user && !recovering ? 'TU PERFIL' : recovering ? 'RECUPERACIÓN DE CUENTA' : 'BIENVENIDO A KAI SEÑAS'}</p><h2 id="account-form-title">{recovering ? 'Nueva contraseña' : user ? 'Información personal' : mode === 'signup' ? 'Crear cuenta' : mode === 'reset' ? 'Recuperar acceso' : 'Iniciar sesión'}</h2><p>{user && !recovering ? 'Este nombre aparecerá en tu perfil.' : mode === 'reset' && !recovering ? 'Te enviaremos un enlace para restablecer tu contraseña.' : 'Completa tus datos para continuar.'}</p></div>
        {!user && !recovering && mode !== 'reset' && <div className={styles.modeSwitch} aria-label="Opciones de acceso"><button type="button" aria-pressed={mode === 'signin'} disabled={busy} onClick={() => changeMode('signin')}>Iniciar sesión</button><button type="button" aria-pressed={mode === 'signup'} disabled={busy} onClick={() => changeMode('signup')}>Crear cuenta</button></div>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.info} role="status">{message}</p>}
        {identityError && user && <p className={styles.error} role="alert">{identityError} <button type="button" onClick={refreshIdentity}>Reintentar permisos</button></p>}
        {user && !recovering && <div className={styles.identity}><span className={styles.avatar} aria-hidden="true">{(user.displayName || 'K').slice(0,1).toUpperCase()}</span><div><strong>{user.displayName}</strong><span>{user.email}</span></div></div>}
        <form onSubmit={submit}><fieldset disabled={busy || !!user && !recovering && roleLoading}>
          {user && !recovering ? <><label className={styles.field} htmlFor="account-name">Nombre visible<input id="account-name" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={40} required autoComplete="nickname" /></label><p className={styles.help}>Entre 2 y 40 caracteres. Tu correo se mantiene asociado a la cuenta.</p></> : <>
            {!recovering && <label className={styles.field} htmlFor="account-email">Correo electrónico<input id="account-email" type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" placeholder="tu@correo.com" /></label>}
            {(recovering || mode !== 'reset') && <><label className={styles.field} htmlFor="account-password">{recovering ? 'Nueva contraseña' : 'Contraseña'}<input id="account-password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} required minLength={recovering || mode === 'signup' ? 8 : undefined} maxLength={128} autoComplete={recovering || mode === 'signup' ? 'new-password' : 'current-password'} /></label>{(recovering || mode === 'signup') && <p className={styles.help}>Usa al menos 8 caracteres.</p>}</>}
            {(recovering || mode === 'signup') && <label className={styles.field} htmlFor="account-confirm">Repite la contraseña<input id="account-confirm" type={showPassword ? 'text' : 'password'} value={confirm} onChange={event => setConfirm(event.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" /></label>}
            {(recovering || mode !== 'reset') && <button className={styles.passwordToggle} type="button" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</button>}
          </>}
          <button className={styles.primary} disabled={busy || !!user && !recovering && (roleLoading || name.trim().length < 2 || name.trim() === user.displayName)} type="submit">{busy ? 'Un momento…' : recovering ? 'Guardar contraseña' : user ? 'Guardar cambios' : mode === 'signup' ? 'Crear mi cuenta' : mode === 'reset' ? 'Enviar instrucciones' : 'Entrar a mi cuenta'}</button>
        </fieldset></form>
        {!user && !recovering && <div className={styles.formLinks}><button disabled={busy} type="button" onClick={() => changeMode(mode === 'reset' ? 'signin' : 'reset')}>{mode === 'reset' ? '← Volver al acceso' : 'Olvidé mi contraseña'}</button><Link to="/">Seguir explorando</Link></div>}
      </section>
      {user && !recovering && <aside className={styles.sideColumn}><section className={styles.quickPanel}><p className={styles.eyebrow}>SIGUE TU CAMINO</p><h2>Tu siguiente paso</h2><Link to="/progreso"><span><strong>Mi progreso</strong><small>Resultados y sesiones recientes</small></span><span aria-hidden="true">↗</span></Link><Link to="/"><span><strong>Explorar prácticas</strong><small>Encuentra una seña para hoy</small></span><span aria-hidden="true">↗</span></Link>{!roleLoading && canManage(user.role) && <Link to="/administracion"><span><strong>Administración</strong><small>Prácticas, muestras y modelos</small></span><span aria-hidden="true">↗</span></Link>}</section><section className={styles.sessionPanel}><h2>Tu sesión</h2><p>Al salir, el progreso ya sincronizado seguirá guardado en tu cuenta. Las sesiones pendientes permanecen en este navegador.</p><button className={styles.secondary} type="button" disabled={busy} onClick={() => { setBusy(true); void signOut().catch(e => setError(authMessage(e))).finally(() => setBusy(false)); }}>Cerrar sesión</button></section></aside>}
    </div>
  </div>;
}
