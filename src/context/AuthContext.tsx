import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AppRole } from '../domain/modules';
import { supabase } from '../lib/supabase';

export interface AppUser { id: string; email: string; role: AppRole; displayName: string }
interface AuthValue {
  user: AppUser | null;
  loading: boolean;
  roleLoading: boolean;
  error: string | null;
  recovering: boolean;
  refreshIdentity: () => void;
  finishRecovery: () => void;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<{ id: string; role: AppRole; displayName: string } | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [revision, setRevision] = useState(0);
  const refreshIdentity = useCallback(() => { setRoleLoading(true); setRevision(v => v + 1); }, []);
  useEffect(() => {
    let active = true;
    let events = 0;
    // El callback es síncrono. Las consultas de identidad se hacen en otro efecto.
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      events++;
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
      setSession(next);
      setLoading(false);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || events > 0) return;
      setSession(data.session);
      if (error) setError('No se pudo recuperar la sesión. Vuelve a iniciar sesión.');
      setLoading(false);
    }).catch(() => { if (active) { setError('No se pudo recuperar la sesión.'); setLoading(false); } });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  const id = session?.user.id;
  const token = session?.access_token;
  useEffect(() => {
    let active = true;
    if (!id) { setIdentity(null); setRoleLoading(false); return; }
    setRoleLoading(true);
    void (async () => {
      try {
        const [profile, role] = await Promise.all([
          supabase.from('profiles').select('display_name').eq('id', id).single(),
          supabase.from('user_roles').select('role').eq('user_id', id).single(),
        ]);
        if (!active) return;
        if (profile.error || role.error) throw new Error('identity');
        const value = role.data.role;
        setIdentity({ id, displayName: profile.data.display_name, role: value === 'admin' || value === 'superadmin' ? value : 'user' });
        setError(null);
      } catch {
        if (active) { setIdentity({ id, role: 'user', displayName: 'Aprendiz' }); setError('No se pudieron comprobar los permisos de tu cuenta. Puedes reintentarlo.'); }
      } finally { if (active) setRoleLoading(false); }
    })();
    return () => { active = false; };
  }, [id, token, revision]);
  useEffect(() => {
    const refresh = () => { if (id && !document.hidden) refreshIdentity(); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [id, refreshIdentity]);
  const user: AppUser | null = session ? {
    id: session.user.id, email: session.user.email || '',
    role: identity?.id === session.user.id ? identity.role : 'user',
    displayName: identity?.id === session.user.id ? identity.displayName : 'Aprendiz',
  } : null;
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setIdentity(null);
    setSession(null);
    setRecovering(false);
  };
  return <AuthContext.Provider value={{ user, loading, roleLoading, error, recovering, refreshIdentity, finishRecovery: () => setRecovering(false), signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider missing'); return value; }
