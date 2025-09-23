// src/components/SpeechToggleButton/SpeechToggleButton.tsx
import React from 'react';
import { useSpeech } from '../../context/SpeechContext';
import styles from './SpeechToggleButton.module.css';

const SpeechToggleButton: React.FC = () => {
  const { isSpeechEnabled, toggleSpeech } = useSpeech();

  return (
    <button
      className={styles.toggleButton}
      onClick={toggleSpeech}
      aria-label={isSpeechEnabled ? "Desactivar voz" : "Activar voz"}
      title={isSpeechEnabled ? "Desactivar voz" : "Activar voz"}
    >
      {/* Usamos SVGs para los íconos de altavoz, que se ven más profesionales */}
      {isSpeechEnabled ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
      )}
    </button>
  );
};

export default SpeechToggleButton;

