// src/pages/PracticePage/PracticePage.tsx
import React from "react";
import { Link, useParams } from "react-router-dom";
import PracticeView from "../../components/PracticeView/PracticeView";
import styles from "./PracticePage.module.css";

// --- PASO 1: Importar las imágenes ---
// Vite procesará estas importaciones y nos dará las rutas correctas.
import imageA from '../../assets/vowels/a.png';
import imageE from '../../assets/vowels/e.png';
import imageI from '../../assets/vowels/i.png';
import imageO from '../../assets/vowels/o.png';
import imageU from '../../assets/vowels/u.png';

// --- PASO 2: Crear un mapa para acceder a las imágenes fácilmente ---
const vowelImages: { [key: string]: string } = {
  a: imageA,
  e: imageE,
  i: imageI,
  o: imageO,
  u: imageU,
};


const PracticePage: React.FC = () => {
  const { vowel } = useParams<{ vowel: string }>();

  if (!vowel || !vowelImages[vowel.toLowerCase()]) {
    return (
      <div className={styles.pageWrapper}>
        <p>Vocal no válida o no seleccionada.</p>
        <Link to="/" className={styles.backButton}>Volver al inicio</Link>
      </div>
    );
  }

  // --- PASO 3: Usar el mapa para obtener la imagen correcta ---
  const referenceImageSrc = vowelImages[vowel.toLowerCase()];

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.practiceCard}>
        {/* Columna Izquierda: El video y canvas de MediaPipe */}
        <div className={styles.videoContainer}>
          <PracticeView targetVowel={vowel} />
        </div>

        {/* Columna Derecha: El panel de control e información */}
        <div className={styles.infoPanel}>
          <h2 className={styles.title}>
            Practicando: <span className={styles.highlight}>{vowel.toUpperCase()}</span>
          </h2>
          
          <p className={styles.instructions}>
            Observa la imagen de referencia y coloca tu mano frente a la cámara imitando la seña.
          </p>

          <div className={styles.referenceContainer}>
            <img 
              src={referenceImageSrc} // Se usa la variable de la imagen importada
              alt={`Seña para la vocal ${vowel}`}
              className={styles.referenceImage} 
            />
          </div>
          
          <Link to="/" className={styles.backButton}>
            ← Volver a la selección
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PracticePage;

