// src/pages/ProgressPage/ProgressPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ProgressPage.module.css';
import StatCard from '../../components/StatCard/StatCard';
import VowelCard from '../../components/VowelCard/VowelCard';
import { vowelData, VowelInfo } from '../../data/vowelData';

interface VowelProgress {
  bestScore: number;
  sessions: number;
  totalTime: number; // en segundos
}

interface RecentSession {
  vowel: string;
  score: number;
  timestamp: number;
}

const ProgressPage: React.FC = () => {
  const allVowels = ['A', 'E', 'I', 'O', 'U'];
  const [summary, setSummary] = useState({
    completed: 0,
    avgPercentage: 0,
    totalSessions: 0,
    totalTime: "0m 0s",
  });
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [vowelsToPractice, setVowelsToPractice] = useState<VowelInfo[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const progressData: { [key: string]: VowelProgress } = JSON.parse(localStorage.getItem('progressData') || '{}');
    const recentData: RecentSession[] = JSON.parse(localStorage.getItem('recentSessions') || '[]');

    const uncompletedVowels = vowelData.filter(data => 
      (progressData[data.vowel]?.bestScore || 0) < 97
    );
    setVowelsToPractice(uncompletedVowels);

    let totalScore = 0;
    let totalSessions = 0;
    let totalTime = 0;
    let completedCount = 0;
    const practicedVowels = Object.keys(progressData);

    practicedVowels.forEach(vowel => {
      totalScore += progressData[vowel].bestScore;
      totalSessions += progressData[vowel].sessions;
      totalTime += progressData[vowel].totalTime;
      if (progressData[vowel].bestScore >= 97) {
        completedCount++;
      }
    });

    const avgPercentage = practicedVowels.length > 0 ? totalScore / practicedVowels.length : 0;
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    
    setSummary({
      completed: completedCount,
      avgPercentage: parseFloat(avgPercentage.toFixed(1)),
      totalSessions: totalSessions,
      totalTime: `${minutes}m ${seconds}s`,
    });

    setRecentSessions(recentData.slice(0, 5));
  }, []);

  const handleClearProgress = () => {
    // 1. Borra los datos del almacenamiento local
    localStorage.removeItem('progressData');
    localStorage.removeItem('recentSessions');
    
    // 2. Cierra el modal de confirmación
    setShowConfirm(false);
    
    // 3. Reinicia los estados del componente para forzar una re-renderización
    //    y mostrar la página en su estado inicial (vacío).
    setSummary({
      completed: 0,
      avgPercentage: 0,
      totalSessions: 0,
      totalTime: "0m 0s",
    });
    setRecentSessions([]);
    // Como no hay progreso, todas las vocales están disponibles para practicar.
    setVowelsToPractice(vowelData); 
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.pageWrapper}>
      <h1 className={styles.title}>Mi Progreso</h1>
      
      {/* SECCIÓN 1: Resumen General */}
      <section className={styles.section}>
        <div className={styles.statsGrid}>
          <StatCard label="Cursos Completados" value={`${summary.completed} / ${allVowels.length}`} icon="🏆" />
          <StatCard label="Promedio General" value={`${summary.avgPercentage}%`} icon="📊" />
          <StatCard label="Sesiones Totales" value={summary.totalSessions} icon="🔄" />
          <StatCard label="Tiempo Total" value={summary.totalTime} icon="⏱️" />
        </div>
      </section>

      {/* SECCIÓN 2: Sesiones Recientes y Continuar Práctica */}
      <div className={styles.columns}>
        <section className={`${styles.section} ${styles.column}`}>
          <h2 className={styles.subtitle}>Sesiones Recientes</h2>
          <div className={styles.list}>
            {recentSessions.length > 0 ? recentSessions.map((session, index) => (
              <div key={index} className={styles.listItem}>
                <span>Practicaste la vocal <strong>{session.vowel}</strong></span>
                <span className={styles.score}>{session.score.toFixed(1)}%</span>
                <span className={styles.timestamp}>{formatTimestamp(session.timestamp)}</span>
              </div>
            )) : <p>Aún no hay sesiones recientes.</p>}
          </div>
        </section>

        <section className={`${styles.section} ${styles.column}`}>
          <h2 className={styles.subtitle}>Continuar Práctica</h2>
          <div className={styles.vowelsGrid}>
            {vowelsToPractice.length > 0 ? vowelsToPractice.map(data => (
              <Link to={`/practice/${data.vowel}`} key={data.vowel} className={styles.vowelLink}>
                <VowelCard 
                  vowel={data.vowel}
                  imageSrc={data.imageSrc}
                  description={data.description}
                />
              </Link>
            )) : <p className={styles.allCompleted}>¡Felicidades! Has completado todas las vocales. 🥳</p>}
          </div>
        </section>
      </div>

      <section className={`${styles.section} ${styles.dangerZone}`}>
        <h2 className={styles.subtitle}>Opciones</h2>
        <p>Si deseas comenzar de nuevo, puedes eliminar todo tu progreso de práctica.</p>
        <button onClick={() => setShowConfirm(true)} className={styles.resetButton}>
          Reiniciar Todo el Progreso
        </button>
      </section>

      {showConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmModal}>
            <h3>¿Estás seguro?</h3>
            <p>Esta acción eliminará permanentemente todos tus datos de práctica, incluyendo puntuaciones y tiempo. No se puede deshacer.</p>
            <div className={styles.confirmActions}>
              <button onClick={() => setShowConfirm(false)} className={styles.cancelButton}>
                Cancelar
              </button>
              <button onClick={handleClearProgress} className={styles.confirmButton}>
                Sí, eliminar mi progreso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressPage;

