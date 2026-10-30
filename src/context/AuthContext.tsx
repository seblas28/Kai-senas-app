import React, { createContext, useContext } from 'react';
import type { AppRole } from '../domain/modules';
export interface AppUser { id: string; role: AppRole }
const AuthContext = createContext<{ user: AppUser | null }>({ user: null });
// Conectar Supabase al finalizar el backend. No aceptar roles de sessionStorage.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthContext.Provider value={{ user: null }}>{children}</AuthContext.Provider>
);
export const useAuth = () => useContext(AuthContext);
