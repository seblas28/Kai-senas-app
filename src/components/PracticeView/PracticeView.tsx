// src/components/PracticeView/PracticeView.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from 'react-router-dom';
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import * as tf from '@tensorflow/tfjs';
import styles from "./PracticeView.module.css";
import { speak } from '../../utils/speech';
import { useSpeech } from "../../context/SpeechContext";
import { allSignData } from "../../data/signData";

interface PracticeViewProps {
  category?: 'vocales' | 'numeros' | 'matematicas';
  onPrediction?: (sign: string) => void;
}

export interface PracticeViewRef {
  captureAndPredict: () => Promise<string | null>;
}

type Landmark = { x: number; y: number; z: number };
type Frame = Landmark[];
const drawingOptions = {
  connector: { color: "#00FF00", lineWidth: 2 },
  landmark: { color: "#FF0000", radius: 2 },
};

const PracticeView: React.FC<PracticeViewProps> = ({ category: propCategory, onPrediction }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isScanningRef = useRef(false);
  const sessionStartTimeRef = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);
  const bestSessionScoreRef = useRef<number>(0);
  const lastCapturedHands = useRef<Frame[] | null>(null);
  const debounceTimeout = useRef<number | null>(null);

  const { category: urlCategory, sign } = useParams<{ category: string; sign: string }>();
  const { isSpeechEnabled } = useSpeech();

  const category = propCategory || urlCategory;
  
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

  const CONFIDENCE_THRESHOLD = 70;

  useEffect(() => {
    if (sign && !onPrediction){
      if (isSpeechEnabled) speak(`Vamos a practicar ${sign}`);
    }
    const setup = async () => {
      try {
        if(!category) return;
        setIsLoading(true);
        const signInfo = allSignData.find(s => s.label === sign);
        const handsToDetect = onPrediction ? 2 : (signInfo?.isTwoHanded ? 2 : 1);
        
        setLoadingMessage("Cargando detector de manos...");
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: handsToDetect,
        });
        setHandLandmarker(landmarker);

        const modelUrl = `/tfjs_${category}/model.json`;
        const labelsUrl = `/labels_${category}.json`;
        
        setLoadingMessage("Cargando modelo de IA...");
        const model = await tf.loadLayersModel(modelUrl);
        setIaModel(model);
        
        setLoadingMessage("Cargando etiquetas...");
        const labelsData = await fetch(labelsUrl).then(res => res.json());
        setLabels(labelsData);

        setIsLoading(false);

      } catch (error) {
        console.error(`Error fatal durante la inicialización para [${category}]:`, error);
        setLoadingMessage("Error al cargar modelos. Verifica los archivos en /public.");
      }
    };
    setup();
  }, [category, sign, isSpeechEnabled, onPrediction]);

  const startCamera = async () => {
    if (navigator.mediaDevices?.getUserMedia && videoRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", () => {
        setIsCameraOn(true);
        if (isSpeechEnabled) speak("Cámara encendida.");
        isScanningRef.current = true; // Empezamos a dibujar el esqueleto en cuanto se enciende
        predictWebcam();
      });
    }
  };

  const stopCamera = () => {
    if (isScanning) stopScan();
    isScanningRef.current = false;
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    if (isSpeechEnabled) speak("Cámara apagada.");
  };

  const startScan = () => {
    setIsTaskCompleted(false);
    setIsScanning(true);
    bestSessionScoreRef.current = 0;
    sessionStartTimeRef.current = Date.now();
    if(isSpeechEnabled) speak("Iniciando escaneo.");
  };

  const stopScan = () => {
    setIsScanning(false);
    if (!onPrediction && !isTaskCompleted) {
      const sessionTime = (Date.now() - sessionStartTimeRef.current) / 1000;
      saveProgress(bestSessionScoreRef.current, sessionTime);
    }
    if(isSpeechEnabled) speak("Escaneo detenido");
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
  };

  const predictWebcam = useCallback(() => {
    if (!isScanningRef.current || !handLandmarker || !videoRef.current || !canvasRef.current) return;
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
        lastCapturedHands.current = results.landmarks;
        const combinedLandmarks = results.landmarks.flat();
        const prediction = predictSign(combinedLandmarks);
        
        if (onPrediction) {
          // MODO CALCULADORA
          if (!debounceTimeout.current) {
            if (prediction && prediction.confidence > 0.9 && prediction.sign !== "Nulo") {
              onPrediction(prediction.sign);
              debounceTimeout.current = window.setTimeout(() => {
                debounceTimeout.current = null;
              }, 1500);
            }
          }
        } else if (isScanning) {
          // MODO PRÁCTICA NORMAL (solo si está escaneando)
          if (prediction) {
            const currentConfidence = prediction.confidence * 100;
            setPredictedSign(prediction.sign);
            setConfidence(currentConfidence);
            if (!isTaskCompleted && prediction.sign === sign && currentConfidence >= 97) {
              setIsTaskCompleted(true);
              if(isSpeechEnabled) speak(`¡Muy bien! Has completado ${sign}`);
              const sessionTime = (Date.now() - sessionStartTimeRef.current) / 1000;
              saveProgress(currentConfidence, sessionTime);
            }
            if (prediction.sign === sign && currentConfidence > bestSessionScoreRef.current){
               bestSessionScoreRef.current = currentConfidence;
            }
          }
        }
        for (const landmarks of results.landmarks) {
          drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, drawingOptions.connector);
          drawingUtils.drawLandmarks(landmarks, drawingOptions.landmark);
        }
      } else {
        lastCapturedHands.current = null;
      }
    } catch (error) {
      console.error("¡ERROR ATRAPADO EN EL BUCLE DE ANIMACIÓN!", error);
      stopScan();
    }
    if (isScanningRef.current) {
      animationFrameId.current = requestAnimationFrame(predictWebcam);
    }
  }, [handLandmarker, labels, sign, isSpeechEnabled, onPrediction, iaModel, isScanning]);
  
  useEffect(() => {
    isScanningRef.current = isCameraOn; // El bucle ahora depende solo de si la cámara está encendida
    if (isCameraOn) {
        animationFrameId.current = requestAnimationFrame(predictWebcam);
    }
    return () => {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    }
  }, [isCameraOn, predictWebcam]);

  const predictSign = (landmarks: Landmark[]) => {
    if (!iaModel || !labels || labels.length === 0) return null;
    const baseX = landmarks[0].x;
    const baseY = landmarks[0].y;
    const normalized = landmarks.map(lm => ({ x: lm.x - baseX, y: lm.y - baseY, z: lm.z }));
    let flattened = normalized.flatMap(lm => [lm.x, lm.y, lm.z]);
    const expectedSize = iaModel.inputs[0].shape[1] || 126;
    while(flattened.length < expectedSize){
      flattened.push(0);
    }
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
        {!isLoading && !isCameraOn && <div className={styles.placeholder}>Enciende la cámara</div>}
      </div>
      
      {/* --- ¡LA CORRECCIÓN ESTÁ AQUÍ! --- */}
      {/* El div de controles ahora se muestra siempre */}
      <div className={styles.controls}>
        {!isCameraOn ? 
          <button onClick={startCamera} className={styles.primaryIconButton} disabled={isLoading} title="Encender Cámara">
            {isLoading ? <div className={styles.spinner}></div> : <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>}
          </button> :
          // Si estamos en modo calculadora, los botones de escanear no aplican, solo el de apagar
          onPrediction ? (
            <button onClick={stopCamera} className={styles.secondaryIconButton} title="Apagar Cámara">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16l-4-4m0 0L8 8m4 4l4-4m-4 4l-4 4"></path><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
            </button>
          ) : (
            // Si estamos en modo práctica, mostramos los controles completos
            <div className={styles.activeControls}>
               <button onClick={stopCamera} className={styles.secondaryIconButton} title="Apagar Cámara">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16l-4-4m0 0L8 8m4 4l4-4m-4 4l-4 4"></path><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
               </button>
               {isScanning ? 
                  <button onClick={stopScan} className={`${styles.primaryIconButton} ${styles.stopState}`} title="Detener Escaneo">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                  </button> :
                  <button onClick={startScan} className={styles.primaryIconButton} title="Iniciar Escaneo">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </button>
               }
            </div>
          )
        }
      </div>
      
      {/* La barra de progreso solo se muestra en modo práctica */}
      {!onPrediction && (
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
      )}
    </div>
  );
};

export default PracticeView;

