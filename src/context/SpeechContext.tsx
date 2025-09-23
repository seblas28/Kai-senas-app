// src/context/SpeechContext.tsx
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

// Define la forma de nuestro contexto
interface SpeechContextType {
  isSpeechEnabled: boolean;
  toggleSpeech: () => void;
}

// Creamos el contexto
const SpeechContext = createContext<SpeechContextType | undefined>(undefined);

// Creamos el "Proveedor" que envolverá nuestra aplicación
export const SpeechProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Inicializamos el estado leyendo la preferencia guardada del usuario, o 'true' por defecto
  const [isSpeechEnabled, setIsSpeechEnabled] = useState<boolean>(() => {
    const savedPreference = localStorage.getItem('speechEnabled');
    return savedPreference ? JSON.parse(savedPreference) : true;
  });

  // Función para cambiar el estado y guardarlo
  const toggleSpeech = useCallback(() => {
    setIsSpeechEnabled(prevState => {
      const newState = !prevState;
      localStorage.setItem('speechEnabled', JSON.stringify(newState));
      return newState;
    });
  }, []);

  return (
    <SpeechContext.Provider value={{ isSpeechEnabled, toggleSpeech }}>
      {children}
    </SpeechContext.Provider>
  );
};

// Creamos un "hook" personalizado para acceder fácilmente al contexto
export const useSpeech = (): SpeechContextType => {
  const context = useContext(SpeechContext);
  if (!context) {
    throw new Error('useSpeech debe ser usado dentro de un SpeechProvider');
  }
  return context;
};
