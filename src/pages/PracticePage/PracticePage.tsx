// src/pages/PracticePage/PracticePage.tsx
import React from "react";
import { Link, useParams } from "react-router-dom";
import PracticeView from "../../components/PracticeView/PracticeView";
import styles from "./PracticePage.module.css";
import { getSignsByCategory } from "../../data/signData";


const PracticePage: React.FC = () => {
  const { category, sign } = useParams<{ category: string; sign: string }>();
  const signInfo = getSignsByCategory(category || '').find(s=> s.label === sign);
  if ( !category || !sign || !signInfo) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>
          Vocal no válida o no seleccionada.
        </p>
        <Link to="/" className={styles.backButton}>Volver al inicio</Link>
      </div>
    );
  }


  return (
    <div className={styles.pageWrapper}>
      <div className={styles.practiceLayout}>
        {/* Columna Izquierda: El video y canvas de MediaPipe */}
        <div className={styles.videoContainer}>
          <PracticeView />
        </div>

        {/* Columna Derecha: El panel de control e información */}
        <div className={styles.infoPanel}>
          <h2 className={styles.title}>
            Practicando: <span className={styles.highlight}>{sign}</span>
          </h2>
          
          <p className={styles.instructions}>
            Observa la imagen de referencia y coloca tu mano frente a la cámara imitando la seña.
          </p>

          <div className={styles.referenceContainer}>
            <img 
              src={signInfo.imageSrc}
              alt={`Seña para ${sign}`}
              className={styles.referenceImage} 
            />
          </div>
          
          <Link to={`/practice/${category}`} className={styles.backButton}>
            ← Volver a la selección
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PracticePage;

