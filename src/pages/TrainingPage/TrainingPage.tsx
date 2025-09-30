// src/pages/TrainingPage/TrainingPage.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSignsByCategory, allSignData } from '../../data/signData';
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import styles from './TrainingPage.module.css';
import { useSpeech } from '../../context/SpeechContext';
import { speak } from '../../utils/speech';
import TrainingSummaryCard from '../../components/TrainingSummaryCard/TrainingSummaryCard';

const drawingOptions = {
  connector: { color: "#00FF00", lineWidth: 2 },
  landmark: { color: "#FF0000", radius: 2 },
};

type Landmark = { x: number; y: number; z: number };
type Frame = Landmark[];
type TrainingSample = { landmarks: Landmark[]; label: string };
const SAMPLES_PER_BURST = 30;

const TrainingPage: React.FC = () => {
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
  const [lastCapturedHands, setLastCapturedHands] = useState<Frame[] | null>(null);
  
  const [isBursting, setIsBursting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [trainingSummary, setTrainingSummary] = useState<{ [key: string]: number }>({});

  const fetchSummary = useCallback(async () => {
    try {
      // Usamos un timestamp para evitar la caché del navegador
      const response = await fetch(`/training_summary.json?t=${new Date().getTime()}`);
      if (response.ok) {
        const data = await response.json();
        setTrainingSummary(data);
      }
    } catch (error) {
      console.log("No se encontró resumen de entrenamiento, se creará uno nuevo.");
      setTrainingSummary({});
    }
  }, []);

  useEffect(() => {
    if (category) {
      const signs = getSignsByCategory(category);
      const labels = signs.map(sign => sign.label);
      const allLabels = [...labels, 'Nulo'];
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
        runningMode: "VIDEO",
        numHands: 2, // Creamos un motor potente que puede ver hasta 2 manos desde el principio
      });
      setHandLandmarker(landmarker);
      console.log("HandLandmarker inicializado una sola vez.");
    };
    
    createHandLandmarker();
    
    return () => {
      stopCamera(false);
      handLandmarker?.close();
    };
  }, [category, isSpeechEnabled, fetchSummary]);

  const handleGoHome = () => {
    stopCamera(true);
    setTimeout(() => navigate('/'), 700);
  };

  const startCamera = async () => {
    if (navigator.mediaDevices?.getUserMedia && videoRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", () => {
        setIsCameraOn(true);
        isCameraOnRef.current = true;
        predictWebcam();
        if(isSpeechEnabled) speak("Cámara encendida.");
      });
    }
  };

  const stopCamera = (shouldSpeak: boolean = true) => {
    if (!isCameraOnRef.current) return;
    if (shouldSpeak && isSpeechEnabled) speak("Cámara apagada.");
    isCameraOnRef.current = false;
    setIsCameraOn(false);
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const predictWebcam = useCallback(() => {
    if (!isCameraOnRef.current || !handLandmarker || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0) {
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
      setLastCapturedHands(results.landmarks);
      for (const landmarks of results.landmarks) {
        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, drawingOptions.connector);
        drawingUtils.drawLandmarks(landmarks, drawingOptions.landmark);
      }
    } else {
      setLastCapturedHands(null);
    }
    if (isCameraOnRef.current) {
      animationFrameId.current = requestAnimationFrame(predictWebcam);
    }
  }, [handLandmarker]);

  useEffect(() => {
    if (isCameraOn) {
        predictWebcam();
    }
  }, [isCameraOn, predictWebcam]);


  const normalizeLandmarks = (landmarks: Landmark[]): Landmark[] => {
    if (landmarks.length === 0) return [];
    const baseX = landmarks[0].x;
    const baseY = landmarks[0].y;
    return landmarks.map(lm => ({ x: lm.x - baseX, y: lm.y - baseY, z: lm.z }));
  };

  const getSampleCount = (label: string) => trainingData.filter(d => d.label === label).length;
  const handleLabelSelect = (label: string) => { setSelectedLabel(label); if(isSpeechEnabled) speak(`Seleccionado: ${label}`); };
 
  const handleCapture = () => {
    if (lastCapturedHands && lastCapturedHands.length > 0) {
      const combinedLandmarks = lastCapturedHands.flat();
      const normalizedLandmarks = normalizeLandmarks(combinedLandmarks);
      const newSample: TrainingSample = { landmarks: normalizedLandmarks, label: selectedLabel };
      setTrainingData(prevData => [...prevData, newSample]);
    }
  };
  
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const handleBurstCapture = async () => {
    if (!lastCapturedHands) {
      setFeedbackMessage('Mano no detectada.');
      setTimeout(() => setFeedbackMessage(''), 3000);
      return;
    }
    setIsBursting(true);
    if(isSpeechEnabled) speak("Iniciando captura en ráfaga.");
    for (let i = 3; i > 0; i--) {
      setFeedbackMessage(`Prepárate en ${i}...`);
      await delay(1000);
    }
    setFeedbackMessage(`¡Capturando ${SAMPLES_PER_BURST} muestras!`);
    await new Promise<void>(resolve => {
      let captureCount = 0;
      const intervalId = setInterval(() => {
        handleCapture();
        captureCount++;
        if (captureCount >= SAMPLES_PER_BURST) {
          clearInterval(intervalId);
          resolve();
        }
      }, 100);
    });
    const completionMessage = `Captura de ${selectedLabel} completada.`;
    setFeedbackMessage(completionMessage);
    if(isSpeechEnabled) speak(completionMessage);
    setIsBursting(false);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };
  
  const handleSendDataAndTrain = async () => {
    if (trainingData.length === 0) return alert("No hay datos para enviar.");
    const final_url = "http://localhost:5001/receive_data";
    setIsSending(true);
    setFeedbackMessage('Enviando datos al servidor...');
    if(isSpeechEnabled) speak("Enviando datos para entrenar el modelo.");
    try {
      const payload = { category: category, data: trainingData };
      const response = await fetch(final_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);
      setFeedbackMessage('¡Datos enviados! Revisa la terminal del servidor.');
      if(isSpeechEnabled) speak("Datos enviados con éxito.");
    } catch (error) {
      console.error('Error al enviar datos:', error);
      setFeedbackMessage('Error al conectar con el servidor. ¿Está en ejecución?');
      if(isSpeechEnabled) speak("Error al conectar con el servidor.");
    } finally {
      setIsSending(false);
    }
  };

  const handleClearSelectedLabelData = () => {
    const samplesToKeep = trainingData.filter(sample => sample.label !== selectedLabel);
    const samplesRemovedCount = trainingData.length - samplesToKeep.length;
    setTrainingData(samplesToKeep);
    if (isSpeechEnabled && samplesRemovedCount > 0) {
      speak(`Se eliminaron ${samplesRemovedCount} muestras para ${selectedLabel}.`);
    }
  };

  const handleClearAllData = () => {
    setTrainingData([]);
    setFeedbackMessage('');
    if(isSpeechEnabled) speak("Todos los datos de entrenamiento han sido limpiados.");
  };

  const sortedSummary = Object.entries(trainingSummary).sort(([,a], [,b]) => b - a);

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
                disabled={isBursting || isSending }
              >
                {label} ({getSampleCount(label)})
              </button>
            ))}
          </div>

          {/* --- SECCIÓN DE ACCIONES REDISEÑADA --- */}
          <div className={styles.actions}>
            {/* 1. Botones de Iconos para acciones principales */}
            <div className={styles.iconActions}>
              <button onClick={!isCameraOn ? startCamera : () => stopCamera(true)} className={styles.iconButton} disabled={isBursting || isSending} title={isCameraOn ? "Apagar Cámara" : "Encender Cámara"}>
                {isCameraOn ? 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16l-4-4m0 0L8 8m4 4l4-4m-4 4l-4 4"></path><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                  : 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                }
              </button>
              <button onClick={handleBurstCapture} className={`${styles.iconButton} ${styles.primary}`} disabled={!isCameraOn || isBursting || isSending} title="Capturar Ráfaga">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              </button>
              <button onClick={handleSendDataAndTrain} disabled={trainingData.length === 0 || isBursting || isSending} className={styles.iconButton} title="Enviar y Entrenar">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2.8-3.3-4.9-6.3-4.9h-1.3c-.3-1.3-1-2.4-2-3.2-1.4-1.1-3.1-1.8-5-1.8-3.4 0-6.2 2.7-6.5 6.1-.3 2.5 1 4.9 2.8 6.4"></path><path d="M16 16v6m-4-3l4 3 4-3"></path></svg>
              </button>
            </div>
            
            <hr className={styles.divider}/>

            {/* 2. Botones de Texto para acciones secundarias */}
            <div className={styles.textActions}>
              <button onClick={handleClearSelectedLabelData} className={styles.textButton} disabled={getSampleCount(selectedLabel) === 0 || isBursting || isSending}>
                Limpiar {selectedLabel} ({getSampleCount(selectedLabel)})
              </button>
              <button onClick={handleClearAllData} className={`${styles.textButton} ${styles.dangerText}`} disabled={trainingData.length === 0 || isBursting || isSending}>
                Limpiar Todo
              </button>
            </div>
            
            <button onClick={handleGoHome} className={styles.backButton}>
              ← Volver al Inicio
            </button>
          </div>
        </div>
      </div>
      {sortedSummary.length > 0 &&(
        <div className={styles.sumaryPanel}>
          <h2 className={styles.sumaryTitle}>Resultados del Entrenamiento</h2>
          <div className={styles.sumaryGrid}>
            {sortedSummary.map(([cat, acc])=> (
              <TrainingSummaryCard key={cat} category={cat} accuracy={acc} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingPage;

