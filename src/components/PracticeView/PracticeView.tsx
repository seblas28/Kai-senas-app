// src/components/PracticeView/PracticeView.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from 'react-router-dom';
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import * as tf from '@tensorflow/tfjs';
import styles from "./PracticeView.module.css";
import { speak } from '../../utils/speech';
import { useSpeech } from "../../context/SpeechContext";
import { allSignData } from "../../data/signData";
import { saveAttempt } from '../../domain/progress';
import { useAuth } from '../../context/AuthContext';
import { emptyValidation, validateSign, VALIDATION_HOLD_MS, VALIDATION_CONFIDENCE, VALIDATION_MAX_GAP_MS, type SignPrediction } from '../../domain/signValidation';

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
  const { user } = useAuth();
  const componentActive = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const savedSessionRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isScanningRef = useRef(false);
  const sessionStartTimeRef = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);
  const validationRef = useRef(emptyValidation());
  const scanActiveRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const [holdProgress, setHoldProgress] = useState(0);
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
    componentActive.current = true;
    setIsCameraOn(false);
    setIsScanning(false);
    scanActiveRef.current = false;
    validationRef.current = emptyValidation();
    lastVideoTimeRef.current = -1;
    setHoldProgress(0);
    setIsTaskCompleted(false);
    setPredictedSign('...');
    setConfidence(0);
    setLabels([]);
    let cancelled = false;
    let ownedLandmarker: HandLandmarker | null = null;
    let ownedModel: tf.LayersModel | null = null;
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
        if (cancelled) { landmarker.close(); return; }
        ownedLandmarker = landmarker;
        setHandLandmarker(landmarker);

        const modelUrl = `/tfjs_${category}/model.json`;
        const labelsUrl = `/labels_${category}.json`;
        
        setLoadingMessage("Cargando modelo de IA...");
        const model = await tf.loadLayersModel(modelUrl);
        if (cancelled) { model.dispose(); return; }
        ownedModel = model;
        setIaModel(model);
        
        setLoadingMessage("Cargando etiquetas...");
        const labelsResponse = await fetch(labelsUrl);
        if (!labelsResponse.ok) throw new Error('Etiquetas no disponibles');
        const labelsData: unknown = await labelsResponse.json();
        if (!Array.isArray(labelsData) || !labelsData.every(label => typeof label === 'string') || labelsData.length !== model.outputs[0].shape[1]) throw new Error('Modelo y etiquetas incompatibles');
        if (cancelled) return;
        setLabels(labelsData);

        setIsLoading(false);

      } catch (error) {
        if (cancelled) return;
        console.error(`Error fatal durante la inicialización para [${category}]:`, error);
        setLoadingMessage("Error al cargar modelos. Verifica los archivos en /public.");
      }
    };
    setup();
    return () => {
      cancelled = true;
      componentActive.current = false;
      isScanningRef.current = false;
      scanActiveRef.current = false;
      validationRef.current = emptyValidation();
      if (animationFrameId.current !== null) cancelAnimationFrame(animationFrameId.current);
      if (debounceTimeout.current !== null) clearTimeout(debounceTimeout.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      ownedLandmarker?.close();
      ownedModel?.dispose();
    };
  }, [category, sign]);

  const startCamera = async () => {
    try {
    if (navigator.mediaDevices?.getUserMedia && videoRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (!componentActive.current || !videoRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      lastVideoTimeRef.current = -1;
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", () => {
        setIsCameraOn(true);
        if (isSpeechEnabled) speak("Cámara encendida.");
        isScanningRef.current = true; // Empezamos a dibujar el esqueleto en cuanto se enciende

      }, { once: true });
    }
    } catch { setSaveError('No se pudo acceder a la cámara. Comprueba sus permisos e inténtalo de nuevo.'); }
  };

  const stopCamera = () => {
    if (scanActiveRef.current) stopScan();
    isScanningRef.current = false;
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    if (isSpeechEnabled) speak("Cámara apagada.");
  };

  const startScan = () => {
    savedSessionRef.current = false;
    setSaveError(null);
    setIsTaskCompleted(false);
    setIsScanning(true);
    scanActiveRef.current = true;
    validationRef.current = emptyValidation();
    setHoldProgress(0);
    setPredictedSign('...');
    setConfidence(0);
    sessionStartTimeRef.current = Date.now();
    if(isSpeechEnabled) speak("Iniciando escaneo.");
  };

  const stopScan = () => {
    if (!scanActiveRef.current) return;
    scanActiveRef.current = false;
    setIsScanning(false);
    if (!onPrediction && !validationRef.current.completed) {
      const sessionTime = (Date.now() - sessionStartTimeRef.current) / 1000;
      saveProgress(0, sessionTime, false);
      validationRef.current = emptyValidation();
      setHoldProgress(0);
      setPredictedSign('...');
      setConfidence(0);
    }
    if (isSpeechEnabled) speak('Escaneo detenido');
  };

  const saveProgress = (currentScore: number, practiceTime: number, completed: boolean) => {
    if (!sign || !category || savedSessionRef.current) return;
    savedSessionRef.current = true;
    if (!saveAttempt(category, sign, currentScore, practiceTime, user?.id, completed)) setSaveError('No se pudo guardar la sesión en este navegador.');
  };

  const processPracticePrediction = (prediction: SignPrediction | null, now: number, frame: number) => {
    if (!scanActiveRef.current || document.hidden) return;
    setPredictedSign(prediction?.sign || '...');
    setConfidence((prediction?.confidence || 0) * 100);
    const next = validateSign(validationRef.current, sign, prediction, now, frame);
    validationRef.current = next;
    setHoldProgress(next.progress);
    if (next.completed) {
      // La referencia detiene el intento antes de que React actualice el estado.
      scanActiveRef.current = false;
      setIsScanning(false);
      setIsTaskCompleted(true);
      saveProgress(next.score, (Date.now() - sessionStartTimeRef.current) / 1000, true);
      if (isSpeechEnabled) speak('¡Muy bien! Has validado ' + sign);
    }
  };

  useEffect(() => {
    const resetOnHide = () => {
      if (!document.hidden || !scanActiveRef.current) return;
      validationRef.current = emptyValidation();
      setHoldProgress(0);
      setPredictedSign('...');
      setConfidence(0);
    };
    document.addEventListener('visibilitychange', resetOnHide);
    return () => document.removeEventListener('visibilitychange', resetOnHide);
  }, []);

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
      const now = performance.now();
      if (video.currentTime === lastVideoTimeRef.current) {
        if (!onPrediction && validationRef.current.lastTimestamp !== null && now - validationRef.current.lastTimestamp > VALIDATION_MAX_GAP_MS) processPracticePrediction(null, now, video.currentTime);
        if (isScanningRef.current) animationFrameId.current = requestAnimationFrame(predictWebcam);
        return;
      }
      lastVideoTimeRef.current = video.currentTime;
      const results = handLandmarker.detectForVideo(video, now);
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
        } else {
          processPracticePrediction(prediction, now, video.currentTime);
        }
        for (const landmarks of results.landmarks) {
          drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, drawingOptions.connector);
          drawingUtils.drawLandmarks(landmarks, drawingOptions.landmark);
        }
      } else {
        lastCapturedHands.current = null;
        if (!onPrediction) processPracticePrediction(null, now, video.currentTime);
      }
    } catch (error) {
      console.error("¡ERROR ATRAPADO EN EL BUCLE DE ANIMACIÓN!", error);
      stopScan();
    }
    if (isScanningRef.current) {
      animationFrameId.current = requestAnimationFrame(predictWebcam);
    }
  }, [handLandmarker, labels, sign, isSpeechEnabled, onPrediction, iaModel, category, user?.id]);
  
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
    if (flattened.length !== expectedSize || flattened.some(value => !Number.isFinite(value))) return null;
    const data = tf.tidy(() => {
      const inputTensor = tf.tensor2d([flattened]);
      const predictionTensor = iaModel.predict(inputTensor) as tf.Tensor;
      return Array.from(predictionTensor.dataSync());
    });
    const index = data.indexOf(Math.max(...data));
    return index < 0 || index >= labels.length ? null : { sign: labels[index], confidence: data[index] };
  };

  return (
    <div className={styles.container}>
      {saveError && <p role="alert">{saveError}</p>}
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
                  <button onClick={startScan} className={styles.primaryIconButton} title={isTaskCompleted ? "Practicar de nuevo" : "Iniciar Escaneo"} aria-label={isTaskCompleted ? "Practicar de nuevo" : "Iniciar Escaneo"}>
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
          <p className={styles.validationStatus} role="status">
            {isTaskCompleted ? 'Seña validada. Puedes practicar de nuevo.' : !isScanning ? 'Inicia el escaneo para validar la seña.' : predictedSign === '...' || predictedSign === 'Nulo' ? 'Coloca la mano frente a la cámara.' : predictedSign !== sign ? 'Se detectó ' + predictedSign + '. Realiza la seña de ' + sign + '.' : confidence < VALIDATION_CONFIDENCE * 100 ? 'La detección aún no es suficiente. Ajusta la postura.' : 'Mantén ' + sign + ' durante ' + (VALIDATION_HOLD_MS / 1000).toLocaleString('es') + ' segundos sin interrupción.'}
          </p>
          <div className={styles.progressBarBackground} role="progressbar" aria-label="Validación sostenida de la seña" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(holdProgress)}>
            <div className={styles.progressBarFill + (holdProgress > 0 ? ' ' + styles.correct : '')} style={{ width: holdProgress + '%' }} />
          </div>
          <p className={styles.validationHint}>La barra muestra el tiempo de validación. La confianza indica la seguridad del modelo, no un porcentaje de ejecución correcta.</p>
        </div>
      )}
    </div>
  );
};

export default PracticeView;

