// src/pages/ProgressPage/ProgressPage.tsx
import React, { useCallback, useEffect, useState } from 'react';
import styles from './ProgressPage.module.css';
import { categoryData, getSignsByCategory } from '../../data/signData';
import StatCard from '../../components/StatCard/StatCard';
import CategoryProgressCard from '../../components/CategoryProgressCard/CategoryProgressCard';
import { useSpeech } from '../../context/SpeechContext';
import { speak } from '../../utils/speech';

// Interfaces para los datos de progreso
interface SignProgress {
  bestScore: number;
  sessions: number;
  totalTime: number;
}
interface RecentSession {
  label: string;
  score: number;
  timestamp: number;
}
interface CategoryStats {
  completed: number;
  total: number;
}

const ProgressPage: React.FC = () => {
  const { isSpeechEnabled } = useSpeech();
  const [summary, setSummary] = useState({ completedCourses: 0, avgPercentage: 0, totalSessions: 0, totalTime: "0m 0s" });
  const [progressStats, setProgressStats] = useState<{ [key: string]: CategoryStats }>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);

  const loadProgress = useCallback(() => {
    const progressData: { [key: string]: SignProgress } = JSON.parse(localStorage.getItem('progressData') || '{}');
    const recentData: RecentSession[] = JSON.parse(localStorage.getItem('recentSessions') || '[]');
    const newStats: { [key: string]: CategoryStats } = {};

    let totalScore = 0, totalSessions = 0, totalTime = 0;
    const practicedSigns = Object.keys(progressData);

    // Calcular estadísticas por categoría
    categoryData.forEach(category => {
      const signsInCategory = getSignsByCategory(category.id);
      const completedCount = signsInCategory.filter(
        sign => (progressData[sign.label]?.bestScore || 0) >= 97
      ).length;
      newStats[category.id] = { completed: completedCount, total: signsInCategory.length };
    });
    
    // Calcular estadísticas generales
    practicedSigns.forEach(label => {
      if (progressData[label]) {
        totalScore += progressData[label].bestScore;
        totalSessions += progressData[label].sessions;
        totalTime += progressData[label].totalTime;
      }
    });

    const completedCoursesCount = Object.values(newStats).filter(stat => stat.completed === stat.total && stat.total > 0).length;
    const avgPercentage = practicedSigns.length > 0 ? totalScore / practicedSigns.length : 0;
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    
    setRecentSessions(recentData.slice(0, 5));
    setProgressStats(newStats);
    setSummary({ completedCourses: completedCoursesCount, avgPercentage: parseFloat(avgPercentage.toFixed(1)), totalSessions, totalTime: `${minutes}m ${seconds}s` });
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    if (categoryData.length === 0) return;
    const welcomeTimeout = setTimeout(() => {
      if (summary.completedCourses === categoryData.length && categoryData.length > 0) {
        if (isSpeechEnabled) speak("¡Felicidades! Has completado todos los cursos.");
      } else {
        if (isSpeechEnabled) speak("Este es tu panel de progreso. ¡Sigue aprendiendo!");
      }
    }, 500);
    return () => clearTimeout(welcomeTimeout);
  }, [summary.completedCourses, isSpeechEnabled]);

  const handleClearProgress = () => {
    localStorage.removeItem('progressData');
    localStorage.removeItem('recentSessions');
    setShowConfirm(false);
    loadProgress();
    if (isSpeechEnabled) speak("Todo tu progreso ha sido reiniciado.");
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.pageWrapper}>
      <h1 className={styles.title}>Mi Progreso</h1>
      <p className={styles.subtitle}>
        Aquí puedes ver tu progreso general y el historial de tus sesiones de práctica.
      </p>

      {/* SECCIÓN DE ESTADÍSTICAS GENERALES */}
      <section className={styles.section}>
        <div className={styles.statsGrid}>
          <StatCard label="Cursos Completados" value={`${summary.completedCourses} / ${categoryData.length}`} icon="🏆" />
          <StatCard label="Promedio General" value={`${summary.avgPercentage}%`} icon="📊" />
          <StatCard label="Sesiones Totales" value={summary.totalSessions} icon="🔄" />
          <StatCard label="Tiempo Total" value={summary.totalTime} icon="⏱️" />
        </div>
      </section>

      {/* SECCIÓN DE RESUMEN DE CURSOS */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Resumen de Cursos</h2>
        <div className={styles.categoryGrid}>
          {categoryData.map(category => {
            const stats = progressStats[category.id] || { completed: 0, total: getSignsByCategory(category.id).length };
            return (
              <CategoryProgressCard
                key={category.id}
                title={category.title}
                imageSrc={category.imageSrc}
                completedCount={stats.completed}
                totalCount={stats.total}
                practiceLink={`/practice/${category.id}`}
              />
            );
          })}
        </div>
      </section>
      
      {/* SECCIÓN DE SESIONES RECIENTES */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Sesiones Recientes</h2>
        <div className={styles.list}>
          {recentSessions.length > 0 ? recentSessions.map((session, index) => (
            <div key={index} className={styles.listItem}>
              <span>Practicaste: <strong>{session.label}</strong></span>
              <span className={styles.score}>{session.score.toFixed(1)}%</span>
              <span className={styles.timestamp}>{formatTimestamp(session.timestamp)}</span>
            </div>
          )) : <p className={styles.noHistory}>Aún no hay sesiones recientes.</p>}
        </div>
      </section>

      {/* SECCIÓN DE OPCIONES */}
      <section className={`${styles.section} ${styles.dangerZone}`}>
        <h2 className={styles.sectionTitle}>Opciones</h2>
        <p>Si deseas comenzar de nuevo, puedes eliminar todo tu progreso de práctica.</p>
        <button onClick={() => setShowConfirm(true)} className={styles.resetButton}>
          Reiniciar Todo el Progreso
        </button>
      </section>

      {/* MODAL DE CONFIRMACIÓN */}
      {showConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmModal}>
            <h3>¿Estás seguro?</h3>
            <p>Esta acción eliminará permanentemente todos tus datos de práctica.</p>
            <div className={styles.confirmActions}>
              <button onClick={() => setShowConfirm(false)} className={styles.cancelButton}>Cancelar</button>
              <button onClick={handleClearProgress} className={styles.confirmButton}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressPage;

