// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type UserRole = 'user' | 'admin';

interface User {
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (user: string, pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Revisa si hay un rol guardado en la sesión al cargar la página
    const storedRole = sessionStorage.getItem('userRole') as UserRole;
    if (storedRole) {
      setUser({ role: storedRole });
    }
  }, []);

  const login = (username: string, pass: string): boolean => {
    // Lógica de autenticación simple
    if (username === 'admin' && pass === 'senati') {
      const adminUser: User = { role: 'admin' };
      sessionStorage.setItem('userRole', 'admin'); // Guarda el rol en la sesión
      setUser(adminUser);
      navigate('/'); // Redirige al inicio
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem('userRole'); // Limpia el rol de la sesión
    setUser(null);
    navigate('/'); // Redirige al inicio
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para acceder fácilmente al contexto
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
