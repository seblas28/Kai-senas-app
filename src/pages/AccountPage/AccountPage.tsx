import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, authMessage } from '../../lib/supabase';
import styles from './LoginPage/LoginPage.module.css';

export default function AccountPage() {
  const { user, error: identityError, roleLoading, refreshIdentity, recovering, finishRecovery, signOut } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
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
  const changeMode = (value: typeof mode) => { setMode(value); setPassword(''); setConfirm(''); setError(null); setMessage(null); };
  return <div className={styles.wrapper}><section className={styles.loginForm}>
    <h1 className={styles.title}>{recovering ? 'Nueva contraseña' : user ? 'Mi cuenta' : mode === 'signup' ? 'Crea tu cuenta' : mode === 'reset' ? 'Recuperar acceso' : 'Bienvenido a Kai Señas'}</h1>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={styles.info} role="status">{message}</p>}
    {identityError && user && <p role="alert">{identityError} <button type="button" onClick={refreshIdentity}>Reintentar permisos</button></p>}
    {user && !recovering && <p>{user.email}<br />{roleLoading ? 'Comprobando permisos…' : ({ user: 'Usuario', admin: 'Administrador', superadmin: 'Superadministrador' }[user.role])}</p>}
    <form onSubmit={submit}>
      {user && !recovering ? <div className={styles.inputGroup}><label htmlFor="account-name">Nombre visible</label><input id="account-name" value={name} placeholder={user.displayName} onChange={event => setName(event.target.value)} minLength={2} maxLength={40} required autoComplete="nickname" /></div> : <>
        {!recovering && <div className={styles.inputGroup}><label htmlFor="account-email">Correo electrónico</label><input id="account-email" type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" /></div>}
        {(recovering || mode !== 'reset') && <div className={styles.inputGroup}><label htmlFor="account-password">Contraseña</label><input id="account-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={recovering || mode === 'signup' ? 8 : undefined} maxLength={128} autoComplete={recovering || mode === 'signup' ? 'new-password' : 'current-password'} /></div>}
        {(recovering || mode === 'signup') && <div className={styles.inputGroup}><label htmlFor="account-confirm">Repite la contraseña</label><input id="account-confirm" type="password" value={confirm} onChange={event => setConfirm(event.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" /></div>}
      </>}
      <button className={styles.loginButton} disabled={busy} type="submit">{busy ? 'Un momento…' : recovering ? 'Guardar contraseña' : user ? 'Guardar nombre' : mode === 'signup' ? 'Crear cuenta' : mode === 'reset' ? 'Enviar instrucciones' : 'Iniciar sesión'}</button>
    </form>
    {!user && !recovering && <div className="kai-account-actions">
      <button disabled={busy} type="button" onClick={() => changeMode(mode === 'signup' ? 'signin' : 'signup')}>{mode === 'signup' ? 'Ya tengo cuenta' : 'Crear una cuenta'}</button>
      <button disabled={busy} type="button" onClick={() => changeMode(mode === 'reset' ? 'signin' : 'reset')}>{mode === 'reset' ? 'Volver al acceso' : 'Olvidé mi contraseña'}</button>
    </div>}
    {user && !recovering && <div className="kai-account-actions"><Link to="/progreso">Ver mi progreso</Link><button type="button" disabled={busy} onClick={() => { setBusy(true); void signOut().catch(e => setError(authMessage(e))).finally(() => setBusy(false)); }}>Cerrar sesión</button></div>}
    {!user && <p><Link to="/">Practicar como invitado</Link></p>}
  </section></div>;
}
