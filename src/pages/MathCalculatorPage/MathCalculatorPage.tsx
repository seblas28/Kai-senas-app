// src/pages/MathCalculatorPage/MathCalculatorPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import styles from './MathCalculatorPage.module.css';
import PracticeView from '../../components/PracticeView/PracticeView';
import { speak } from '../../utils/speech';
import { useSpeech } from '../../context/SpeechContext';
import { Link } from 'react-router-dom';
import { signTypeMap } from '../../data/signData';

const CAPTURE_DELAY = 1500; // 1.5 segundos para mantener la pose
type ExpectedInput = 'number' | 'operator' | 'equal';

const MathCalculatorPage: React.FC = () => {
  const [equation, setEquation] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const { isSpeechEnabled } = useSpeech();
  
  const [livePrediction, setLivePrediction] = useState<string>('...');
  const [captureProgress, setCaptureProgress] = useState(0);
  const [expectedInput, setExpectedInput] = useState<ExpectedInput>('number');
  
  const captureTimer = useRef<number | null>(null);
  const lastSign = useRef<string | null>(null);

  useEffect(() => {
    if (isSpeechEnabled) {
      // Usamos setTimeout para asegurar que el componente se ha renderizado 
      // antes de intentar reproducir el audio.
      const timer = setTimeout(() => {
        speak("Bienvenido a la practica de mátematicas. Por favor, enciende tu cámara y comienza con el primer número.");
      }, 500); // Pequeño retraso para evitar problemas de inicialización

      return () => clearTimeout(timer); // Limpieza si el componente se desmonta
    }
  }, [isSpeechEnabled]);

  const addSignToEquation = (sign: string) => {
    setEquation(prev => [...prev, sign]);
    if (isSpeechEnabled) speak(sign);
    // Actualizamos el estado para esperar el siguiente tipo de seña
    setExpectedInput(expectedInput === 'number' ? 'operator' : 'number');
    resetCapture();
  };

  const handlePrediction = (sign: string) => {
    if (!sign || sign === 'Nulo') {
      // Si no hay seña, reseteamos el temporizador y el progreso
      if (captureTimer.current) clearTimeout(captureTimer.current);
      setCaptureProgress(0);
      lastSign.current = null;
      setLivePrediction('...');
      return;
    };
    
    setLivePrediction(sign);
    const signType = signTypeMap.get(sign);

    // Verificamos si la seña detectada es la que estamos esperando
    const isExpected = 
      (expectedInput === 'number' && signType === 'number') ||
      (expectedInput === 'operator' && signType === 'operator') ||
      (signType === 'equal' && equation.length >= 2);

    if (isExpected && sign !== lastSign.current) {
      // Si es la seña correcta y es nueva, iniciamos el temporizador
      if (captureTimer.current) clearTimeout(captureTimer.current);
      setCaptureProgress(1);
      lastSign.current = sign;

      captureTimer.current = window.setTimeout(() => {
        if (sign === 'Igual') {
          solveEquation();
        } else {
          addSignToEquation(sign);
        }
      }, CAPTURE_DELAY);
    } else if (!isExpected && sign !== lastSign.current) {
      // Si no es la seña esperada, reiniciamos
      resetCapture();
      lastSign.current = sign;
    }
  };

  const solveEquation = () => {
    if (equation.length >= 3 && equation.length % 2 !== 0) {
      try {
        const eqString = equation.join(' ').replace('Suma', '+').replace('Resta', '-');
        const calcResult = new Function('return ' + eqString)();
        setResult(calcResult.toString());
        if (isSpeechEnabled) speak(`El resultado es ${calcResult}`);
      } catch (e) { /* ... */ }
    }
    resetCapture();
  };
  
  const resetCapture = () => {
    if (captureTimer.current) clearTimeout(captureTimer.current);
    captureTimer.current = null;
    lastSign.current = null;
    setCaptureProgress(0);
  };

  // Efecto para la barra de progreso visual
  useEffect(() => {
    let interval: number | null = null;
    if (lastSign.current && lastSign.current !== 'Nulo') {
      interval = window.setInterval(() => {
        setCaptureProgress(prev => Math.min(prev + 100 / (CAPTURE_DELAY / 100), 100));
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lastSign.current]);


  const handleClear = () => {
    setEquation([]);
    setResult(null);
    setLivePrediction('...');
    setExpectedInput('number'); // Volvemos al estado inicial
    resetCapture();
    if (isSpeechEnabled) speak("Limpiado");
  };

  const getExpectedInputMessage = () => {
    if (result) return "¡Operación completada!";
    if (expectedInput === 'number') return "Esperando un número...";
    if (expectedInput === 'operator') return "Esperando un operador (+, -)...";
    return "Realiza una seña...";
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.calculatorLayout}>
        <div className={styles.videoContainer}>
          <PracticeView category="matematicas" onPrediction={handlePrediction} />
        </div>
        <div className={styles.displayPanel}>
          <div className={styles.liveDisplay}>
            <div>
              Detectando: <strong>{livePrediction}</strong>
            </div>
            <div className={styles.statusMessage}>
              {getExpectedInputMessage()}
            </div>
            <div className={styles.captureProgressBg}>
              <div className={styles.captureProgressFill} style={{ width: `${captureProgress}%` }} />
            </div>
          </div>
          <div className={styles.display}>
            <div className={styles.equation}>{equation.join(' ')}</div>
            {result !== null && <div className={styles.result}>= {result}</div>}
          </div>
          <div className={styles.secondaryActions}>
            <button onClick={handleClear} className={styles.clearButton}>Limpiar</button>
            <Link to="/" className={styles.backButton}>Volver</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathCalculatorPage;

