// src/pages/LoginPage/LoginPage.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './LoginPage.module.css';
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { useSpeech } from '../../context/SpeechContext';
import { speak } from '../../utils/speech';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


type FaceLandmark = { x: number; y: number; z: number };

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { login } = useAuth();
  const { isSpeechEnabled } = useSpeech();

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Cargando modelos de IA...');
  const [isCameraOn, setIsCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const lastCapturedFace = useRef<FaceLandmark[] | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);

  useEffect(() => {
    const setupFaceLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });
        faceLandmarkerRef.current = landmarker;
        setIsLoading(false);
        setInfo('Modelos cargados. Inicia la cámara para continuar.');
      } catch (error) {
        console.error("Error al inicializar FaceLandmarker:", error);
        setError("No se pudo cargar el modelo de IA facial.");
      }
    };
    setupFaceLandmarker();
  }, []);
  
  const startCamera = async () => {
    if (navigator.mediaDevices?.getUserMedia && videoRef.current) {
      setInfo('Iniciando cámara...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", () => {
        setIsCameraOn(true);
        if (isSpeechEnabled) speak("Cámara encendida");
        predictWebcam();
      });
    }
  };

  const stopCamera = () => {
    setIsCameraOn(false);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const predictWebcam = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !faceLandmarkerRef.current) return;
    if (video.readyState < 2) {
      animationFrameId.current = requestAnimationFrame(predictWebcam);
      return;
    }
    if (!drawingUtilsRef.current) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        drawingUtilsRef.current = new DrawingUtils(ctx);
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());
    const ctx = canvas.getContext('2d');
    if (ctx && results.faceLandmarks && results.faceLandmarks.length > 0) {
        lastCapturedFace.current = results.faceLandmarks[0];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const landmarks of results.faceLandmarks) {
            drawingUtilsRef.current.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#C0C0C070", lineWidth: 1 });
        }
    } else {
        lastCapturedFace.current = null;
    }
    if (isCameraOn) {
      animationFrameId.current = requestAnimationFrame(predictWebcam);
    }
  }, [isCameraOn]);
  
  useEffect(() => {
    if (isCameraOn) predictWebcam();
    else if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
  }, [isCameraOn, predictWebcam]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = login(username, password);
    if (!success) setError('Usuario o contraseña incorrectos.');
  };

  const handleRegisterFace = async () => {
    setError('');
    setInfo('');
    if (!username) return setError("Por favor, ingresa tu nombre de usuario primero.");
    if (!lastCapturedFace.current) return setError("No se detecta ningún rostro.");

    const adminPassword = prompt("Ingresa la contraseña de administrador ('senati'):");
    if (adminPassword === "senati") {
        setInfo("Contraseña correcta. Registrando rostro en Firebase...");
        try {
            const userDocRef = doc(db, "usuarios", username.toLowerCase());
            
            await setDoc(userDocRef, {
                nombre: username,
                rostro_data: JSON.stringify(lastCapturedFace.current)
            });

            setInfo("¡Rostro registrado con éxito en la nube!");
            if (isSpeechEnabled) speak("Rostro registrado con éxito");

        } catch (err) {
            console.error(err);
            setError("Error al conectar con Firebase.");
        }
    } else {
        setError("Contraseña de administrador incorrecta.");
    }
  };
  
  const handleFacialLogin = async () => {
    setError('');
    setInfo('');
    if (!username) return setError("Ingresa tu nombre de usuario para el login facial.");
    if (!lastCapturedFace.current) return setError("No se detecta rostro para iniciar sesión.");
    
    setInfo("Verificando rostro con Firebase...");
    try {
        const userDocRef = doc(db, "usuarios", username.toLowerCase());
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const storedFaceData = JSON.parse(docSnap.data().rostro_data);
            
            const currentFaceData = lastCapturedFace.current;
            let totalDistance = 0;
            const pointsCount = storedFaceData.length;

            for (let i = 0; i < pointsCount; i++) {
                const p1 = storedFaceData[i];
                const p2 = currentFaceData[i];
                totalDistance += Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
            }
            const averageDistance = totalDistance / pointsCount;
            const threshold = 0.01;

            if (averageDistance < threshold) {
                if (isSpeechEnabled) speak(`Bienvenido, ${username}`);
                login(username, 'facial_login_placeholder');
            } else {
                setError("Reconocimiento facial fallido. Inténtalo de nuevo.");
                if (isSpeechEnabled) speak("Rostro no reconocido");
            }
        } else {
            setError("Usuario no encontrado o sin registro facial.");
        }
    } catch (err) {
        console.error(err);
        setError("Error al conectar con el servidor de autenticación.");
    }
  };

  return (
    <div className={styles.wrapper}>
      <form className={styles.loginForm} onSubmit={handleLogin}>
        <h1 className={styles.title}>Acceso de Administrador</h1>
        
        <div className={styles.mediaContainer}>
            <video ref={videoRef} autoPlay playsInline className={styles.video}></video>
            <canvas ref={canvasRef} className={styles.canvas}></canvas>
            {isLoading && <div className={styles.placeholder}>{loadingMessage}</div>}
            {!isLoading && !isCameraOn && <div className={styles.placeholder}>Cámara apagada</div>}
        </div>

        <div className={styles.cameraControls}>
            <button type="button" onClick={isCameraOn ? stopCamera : startCamera} disabled={isLoading} className={styles.cameraButton}>
                {isLoading ? 'Cargando...' : (isCameraOn ? 'Apagar Cámara' : 'Iniciar Cámara')}
            </button>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="username">Usuario</label>
          <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>

        <div className={styles.facialActions}>
            <button type="button" onClick={handleFacialLogin} className={styles.facialButton} disabled={!isCameraOn}>
                Ingresar con Rostro
            </button>
            <button type="button" onClick={handleRegisterFace} className={`${styles.facialButton} ${styles.registerButton}`} disabled={!isCameraOn}>
                Registrar Rostro
            </button>
        </div>

        <p className={styles.separator}>o ingresa con tu contraseña</p>

        <div className={styles.inputGroup}>
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        
        {error && <p className={styles.error}>{error}</p>}
        {info && <p className={styles.info}>{info}</p>}
        <button type="submit" className={styles.loginButton}>Ingresar</button>
      </form>
    </div>
  );
};

export default LoginPage;
