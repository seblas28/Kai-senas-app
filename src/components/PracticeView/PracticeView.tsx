// src/components/PracticeView/PracticeView.tsx
import React, { useEffect, useRef, useState } from "react";
import { useParams } from 'react-router-dom';
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import * as tf from '@tensorflow/tfjs';
import styles from "./PracticeView.module.css";
import { speak } from '../../utils/speech';
import { useSpeech } from "../../context/SpeechContext";


type Landmark = { x: number; y: number; z: number };

const PracticeView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isScanningRef = useRef(false);
  const sessionStartTimeRef = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);
  const bestSessionScoreRef = useRef<number>(0);

  const { category, sign } = useParams<{ category: string; sign: string }>();
  const { isSpeechEnabled } = useSpeech();

  // Estado para controlar la carga inicial de los modelos
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Cargando IA y modelos...");
  const [iaModel, setIaModel] = useState<tf.LayersModel | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [predictedSign, setPredictedSign] = useState<string>('...');
  const [confidence, setConfidence] = useState<number>(0);
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);

  const CONFIDENCE_THRESHOLD = 70; // Umbral de confianza del 70%

  useEffect(() => {
    if (sign){
      speak(`Vamos a practicar ${sign}`, isSpeechEnabled);
    }

    const setup = async () => {
      try {
        if(!category) return;

        setIsLoading(true);
        setLoadingMessage("Cargando detector de manos...");
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" },
          runningMode: "VIDEO", numHands: 1,
        });
        setHandLandmarker(landmarker);

        const modelUrl = `/tfjs_${category}/model.json`;
        const labelsUrl = `/labels_${category}.json`;

        setLoadingMessage("Cargando modelo de IA...");
        const model = await tf.loadLayersModel(modelUrl);
        setIaModel(model);
        console.log(`Modelo de IA para [${category}] cargado.`);

        setLoadingMessage("Cargando etiquetas...");
        const labelsData = await fetch(labelsUrl).then(res => res.json());
        setLabels(labelsData);
        console.log(`Etiquetas para [${category}] cargadas:`, labelsData);

        setIsLoading(false);

      } catch (error) {
        console.error(`Error fatal durante la inicialización para la categoría [${category}]:`, error);
        setLoadingMessage("Error al cargar los modelos. Refresca la página.");
      }
    };
    setup();
  }, [category, sign, isSpeechEnabled]);

  const startCamera = async () => {
    if (navigator.mediaDevices?.getUserMedia && videoRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", () => {
        setIsCameraOn(true);

        speak("Cámara encendida.", isSpeechEnabled);
      });
    }
  };

  const stopCamera = () => {
    if (isScanning) stopScan();
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    speak("Cámara apagada.", isSpeechEnabled);
  };

  const startScan = () => {
    setIsTaskCompleted(false);
    setIsScanning(true);
    isScanningRef.current = true;
    bestSessionScoreRef.current = 0;
    sessionStartTimeRef.current = Date.now();
    predictWebcam();
    speak("Iniciando escaneo. Realiza la seña mostrada.", isSpeechEnabled);
  };

  const stopScan = () => {
    isScanningRef.current = false;
    setIsScanning(false);
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    const sessionTime = (Date.now() - sessionStartTimeRef.current) / 1000;
    saveProgress(bestSessionScoreRef.current, sessionTime);
    speak("Escaneo detenido", isSpeechEnabled);
  };

  const saveProgress = (currentScore: number, practiceTime: number) => {
    if (!sign) return;
    const progressData = JSON.parse(localStorage.getItem('progressData') || '{}');
    const recentSessions = JSON.parse(localStorage.getItem('recentSessions') || '[]');
    const signData = progressData[sign] || { bestScore: 0, sessions: 0, totalTime: 0 };
    signData.bestScore = Math.max(signData.bestScore, currentScore);
    signData.sessions += 1;
    signData.totalTime += Math.round(practiceTime);
    progressData[sign] = signData;
    const newSession = { label: sign, score: currentScore, timestamp: Date.now() };
    recentSessions.unshift(newSession);
    localStorage.setItem('progressData', JSON.stringify(progressData));
    localStorage.setItem('recentSessions', JSON.stringify(recentSessions.slice(0, 20)));
    console.log("Progreso guardado!", newSession);
  };

  const predictWebcam = () => {
    if (!isScanningRef.current || !handLandmarker || !videoRef.current || !canvasRef.current) {
      return;
    }
    
    try {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        if (isScanningRef.current) animationFrameId.current = requestAnimationFrame(predictWebcam);
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
        const handLandmarks = results.landmarks[0];
        const prediction = predictSign(handLandmarks);
        if (prediction) {
          const currentConfidence = prediction.confidence * 100;
          setPredictedSign(prediction.sign);
          setConfidence(currentConfidence);
          if(
            !isTaskCompleted && prediction.sign === sign && currentConfidence >= 97
          ) {
            setIsTaskCompleted(true);
            speak(`¡Muy bien! Has completado ${sign}`, isSpeechEnabled);
          }

          if (currentConfidence > bestSessionScoreRef.current){
             bestSessionScoreRef.current = currentConfidence;
          }
        }
        for (const landmarks of results.landmarks) {
          drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 5 });
          drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 2 });
        }
      }
    } catch (error) {
      console.error("¡ERROR ATRAPADO EN EL BUCLE DE ANIMACIÓN!", error);
      stopScan();
    }
    
    if (isScanningRef.current) {
      animationFrameId.current = requestAnimationFrame(predictWebcam);
    }
  };

  const predictSign = (landmarks: Landmark[]) => {
    if (!iaModel || !labels || labels.length === 0) return null;
    const baseX = landmarks[0].x;
    const baseY = landmarks[0].y;
    const normalized = landmarks.map(lm => ({ x: lm.x - baseX, y: lm.y - baseY, z: lm.z }));
    const flattened = normalized.flatMap(lm => [lm.x, lm.y, lm.z]);
    const inputTensor = tf.tensor2d([flattened]);
    const predictionTensor = iaModel.predict(inputTensor) as tf.Tensor;
    const predictionData = predictionTensor.dataSync();
    const maxConfidenceIndex = predictionData.indexOf(Math.max(...predictionData));
    if (maxConfidenceIndex < 0 || maxConfidenceIndex >= labels.length) return null;
    const predictedLabel = labels[maxConfidenceIndex];
    const maxConfidence = predictionData[maxConfidenceIndex];
    return { sign: predictedLabel, confidence: maxConfidence };
  };

  return (
    <div className={styles.container}>
      <div className={styles.mediaContainer}>
        <video ref={videoRef} autoPlay playsInline className={styles.video}></video>
        <canvas ref={canvasRef} className={styles.canvas}></canvas>
        
        {isLoading && <div className={styles.placeholder}>{loadingMessage}</div>}
        {!isLoading && !isCameraOn && <div className={styles.placeholder}>Enciende la cámara para empezar</div>}
      </div>

      <div className={styles.similarityContainer}>
        <p className={styles.similarityText}>
          {confidence > CONFIDENCE_THRESHOLD && predictedSign !== 'Nulo' ? (
            <>
              Predicción: <span className={styles.predictedSign}>{predictedSign}</span>
              (Confianza: {confidence.toFixed(0)}%)
            </>
          ) : ( "Realiza la seña..." )}
        </p>
        <div className={styles.progressBarBackground}>
          <div 
            className={`${styles.progressBarFill} ${predictedSign === sign && confidence > CONFIDENCE_THRESHOLD ? styles.correct : ''}`}
            style={{ width: `${predictedSign === 'Nulo' ? 0 : confidence}%` }}
          ></div>
        </div>
      </div>

      <div className={styles.controls}>
        {!isCameraOn ? 
          <button onClick={startCamera} className={styles.controlButton} disabled={isLoading}>
            {isLoading ? 'Cargando...' : 'Encender Cámara'}
          </button> :
          isScanning ? (
            <button onClick={stopScan} className={`${styles.controlButton} ${styles.stopButton}`}>Detener Escaneo</button>
          ) : (
            <>
              <button onClick={startScan} className={`${styles.controlButton} ${styles.scanButton}`}>Iniciar Escaneo</button>
              <button onClick={stopCamera} className={`${styles.controlButton} ${styles.offButton}`}>Apagar Cámara</button>
            </>
          )
        }
      </div>
    </div>
  );
};

export default PracticeView;

