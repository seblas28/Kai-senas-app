import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Clave publicable: la autorización está en Auth y RLS, nunca en esta clave.
const projectUrl = 'https://sfcgfxawpdnpaeewtnrh.supabase.co';
const publishableKey = 'sb_publishable_77TLGl1wyFxQFMghYAKqeg_qaFgi-m5';
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL || projectUrl,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || publishableKey,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);

export function authMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'invalid_credentials') return 'El correo o la contraseña no son correctos.';
  if (code === 'email_not_confirmed') return 'Confirma tu correo antes de iniciar sesión.';
  if (code.includes('rate_limit')) return 'Hay demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  if (code === 'weak_password') return 'Elige una contraseña más segura.';
  return 'No se pudo completar la solicitud. Comprueba la conexión e inténtalo de nuevo.';
}
