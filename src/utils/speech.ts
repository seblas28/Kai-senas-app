// src/utils/speech.ts

export const speak = (text: string, rate: number = 0.9) => {
  // --- ¡CAMBIO CLAVE! ---
  // Antes de hacer nada, revisamos la preferencia guardada en localStorage.
  const isSpeechEnabled = JSON.parse(localStorage.getItem('speechEnabled') || 'true');

  // Si la voz está desactivada, simplemente no hacemos nada.
  if (!isSpeechEnabled) {
    return;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(voice => voice.lang === 'es-ES' || voice.lang === 'es-US');
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("La API de Síntesis de Voz no es compatible con este navegador.");
  }
};

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}
