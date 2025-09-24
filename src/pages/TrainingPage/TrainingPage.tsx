// src/pages/TrainingPage/TrainingPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getSignsByCategory } from '../../data/signData';
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import styles from './TrainingPage.module.css';
import { useSpeech } from '../../context/SpeechContext';
import { speak } from '../../utils/speech';

type Landmark = { x: number; y: number; z: number };
type TrainingSample = { landmarks: Landmark[]; label: string };

const SAMPLES_PER_BURST = 30;
const CAPTURE_INTERVAL_MS = 100;

const TrainingPage: React.FC = () => {
  // Obtiene la categoría de la URL (ej: "vocales", "numeros")
  const { category } = useParams<{ category: string }>();
  const { isSpeechEnabled } = useSpeech();
  const navigate = useNavigate();

  const [categoryLabels, setCategoryLabels] = useState<string[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isCameraOnRef = useRef(false);
  const animationFrameId = useRef<number | null>(null);
  
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [trainingData, setTrainingData] = useState<TrainingSample[]>([]);
  const [lastCapturedHand, setLastCapturedHand] = useState<Landmark[] | null>(null);
  
  const [isBursting, setIsBursting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // Carga las etiquetas correspondientes a la categoría de la URL
    if (category) {
      const signs = getSignsByCategory(category);
      const labels = signs.map(sign => sign.label);
      const allLabels = [...labels, 'Nulo']; // Siempre añadimos 'Nulo' para robustez
      setCategoryLabels(allLabels);
      if (allLabels.length > 0) {
        setSelectedLabel(allLabels[0]);
      }

      if(isSpeechEnabled) speak(`Entrenando la categoría ${category}.`);
    }

    const createHandLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" },
        runningMode: "VIDEO", numHands: 1,
      });
      setHandLandmarker(landmarker);
    };
    createHandLandmarker();
    return () => stopCamera();
  }, [category, isSpeechEnabled]);

  const handleGoHome = () => {
    stopCamera();
    navigate('/');
  }

  const startCamera = async () => {
    if (navigator.mediaDevices?.getUserMedia && videoRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", () => {
        setIsCameraOn(true);
        isCameraOnRef.current = true;
        predictWebcam();

        if(isSpeechEnabled) speak("Cámara encendida. Selecciona una etiqueta y captura muestras.");
      });
    }
  };

  const stopCamera = () => {
    if (!isCameraOnRef.current) {
      if(isSpeechEnabled) speak("La cámara ya está apagada.");
    }
    isCameraOnRef.current = false;
    setIsCameraOn(false);
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const predictWebcam = () => {
    if (!isCameraOnRef.current || !handLandmarker || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) {
      animationFrameId.current = requestAnimationFrame(predictWebcam);
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const drawingUtils = new DrawingUtils(ctx);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const results = handLandmarker.detectForVideo(video, performance.now());
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (results.landmarks && results.landmarks.length > 0) {
      setLastCapturedHand(results.landmarks[0]);
      for (const landmarks of results.landmarks) {
        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 5 });
        drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 2 });
      }
    } else {
      setLastCapturedHand(null);
    }
    if (isCameraOnRef.current) {
      animationFrameId.current = requestAnimationFrame(predictWebcam);
    }
  };

  const normalizeLandmarks = (landmarks: Landmark[]): Landmark[] => {
    const baseX = landmarks[0].x;
    const baseY = landmarks[0].y;
    return landmarks.map(lm => ({ x: lm.x - baseX, y: lm.y - baseY, z: lm.z }));
  };

  const getSampleCount = (label: string) => {
    return trainingData.filter(d => d.label === label).length;
  };
  
  const handleCapture = () => {
    if (lastCapturedHand) {
      const normalizedLandmarks = normalizeLandmarks(lastCapturedHand);
      const newSample: TrainingSample = { landmarks: normalizedLandmarks, label: selectedLabel };
      setTrainingData(prevData => [...prevData, newSample]);
    }
  };
  
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const handleLabelSelect = (label: string) => {
    setSelectedLabel(label);
    if(isSpeechEnabled) speak(`Seleccionado: ${label}`);
  }

  const handleClearData = () => {
    setTrainingData([]);
    setFeedbackMessage('');
    if(isSpeechEnabled) speak("Datos de entrenamiento limpiados.");
  }

  const handleBurstCapture = async () => {
    if (!lastCapturedHand) {
      setFeedbackMessage('Mano no detectada. Asegúrate de que tu mano esté visible.');
      setTimeout(() => setFeedbackMessage(''), 3000);
      return;
    }
    setIsBursting(true);

    if(isSpeechEnabled) speak("Iniciando captura en ráfaga.");

    for (let i = 3; i > 0; i--) {
      setFeedbackMessage(`Prepárate en ${i}...`);
      await delay(1000);
    }
    setFeedbackMessage(`¡Capturando ${SAMPLES_PER_BURST} muestras! Mantén la pose...`);
    await new Promise<void>(resolve => {
      let captureCount = 0;
      const intervalId = setInterval(() => {
        handleCapture();
        captureCount++;
        if (captureCount >= SAMPLES_PER_BURST) {
          clearInterval(intervalId);
          resolve();
        }
      }, CAPTURE_INTERVAL_MS);
    });
    const completionMessage = `Captura de ${selectedLabel} completada.`;
    setFeedbackMessage(completionMessage);
    if(isSpeechEnabled) speak(completionMessage);
    setIsBursting(false);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };
  
  const handleSendDataAndTrain = async () => {
    if (trainingData.length === 0) return alert("No hay datos para enviar.");
    
    // Elige qué servidor usar
    const final_url = "http://localhost:5001/receive_data"; // O tu URL de Render

    setIsSending(true);
    setFeedbackMessage('Enviando datos al servidor...');
    if(isSpeechEnabled) speak("Enviando datos para entrenar el modelo.");

    try {
      const payload = {
        category: category,
        data: trainingData
      };
      const response = await fetch(final_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);
      setFeedbackMessage('¡Datos enviados! Revisa la terminal del servidor para ver el progreso.');
    } catch (error) {
      console.error('Error al enviar datos:', error);
      setFeedbackMessage('Error al conectar con el servidor. ¿Está en ejecución?');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.trainingPanel}>
        <div className={styles.videoContainer}>
          <video ref={videoRef} autoPlay playsInline className={styles.video}></video>
          <canvas ref={canvasRef} className={styles.canvas}></canvas>
          {feedbackMessage && <div className={styles.feedbackOverlay}>{feedbackMessage}</div>}
          {!isCameraOn && !feedbackMessage && <div className={styles.placeholder}>Cámara apagada</div>}
        </div>

        <div className={styles.controls}>
          <h1 className={styles.title}>
            Entrenando Categoría: <span className={styles.highlight}>{category}</span>
          </h1>
          <p>Selecciona una seña de esta categoría y captura muestras.</p>
          
          <div className={styles.labelSelector}>
            {categoryLabels.map(label => (
              <button 
                key={label} 
                onClick={() => handleLabelSelect(label)}
                className={`${styles.labelButton} ${selectedLabel === label ? styles.selected : ''} ${label === 'Nulo' ? styles.nuloButton : ''}`}
                disabled={isBursting || isSending}
              >
                {label} ({getSampleCount(label)})
              </button>
            ))}
          </div>

          <div className={styles.actions}>
            <button onClick={handleGoHome} className={styles.backButton}>
              ← Volver al Inicio
            </button>
            <hr className={styles.divider}/>
            {!isCameraOn ? 
              <button onClick={startCamera} className={styles.actionButton} disabled={isBursting || isSending}>Encender Cámara</button> :
              <button onClick={stopCamera} className={`${styles.actionButton} ${styles.stopButton}`} disabled={isBursting || isSending}>Apagar Cámara</button>
            }
            <button onClick={handleBurstCapture} disabled={!isCameraOn || isBursting || isSending} className={`${styles.actionButton} ${styles.burstButton}`}>
              Capturar Ráfaga ({SAMPLES_PER_BURST})
            </button>
            <button onClick={handleClearData} disabled={trainingData.length === 0 || isBursting || isSending} className={`${styles.actionButton} ${styles.clearButton}`}>
              Limpiar Datos ({trainingData.length})
            </button>
            <hr className={styles.divider}/>
            <button onClick={handleSendDataAndTrain} disabled={trainingData.length === 0 || isBursting || isSending} className={`${styles.actionButton} ${styles.sendButton}`}>
              {isSending ? 'Enviando...' : `Enviar y Entrenar (${trainingData.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingPage;

