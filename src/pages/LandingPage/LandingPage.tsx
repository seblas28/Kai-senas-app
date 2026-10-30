// src/pages/LandingPage/LandingPage.tsx
import React, { useEffect } from 'react';
import styles from './LandingPage.module.css';
import CategoryCard from '../../components/CategoryCard/CategoryCard';
import { categoryData } from '../../data/signData';
import { speak } from '../../utils/speech';
import { useAuth } from '../../context/AuthContext';
import { canManage, practiceBlock } from '../../domain/modules';
import { useCatalog } from '../../context/CatalogContext';
import { useSpeech } from '../../context/SpeechContext';

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const { states: moduleStates, loading, error, refresh } = useCatalog();
  const { isSpeechEnabled } = useSpeech();
  const isAdmin = canManage(user?.role);

  useEffect(() => {
    const hasWelcomed = sessionStorage.getItem('hasWelcomed');

    if (isSpeechEnabled && !hasWelcomed) {
      const welcomeTimeout = setTimeout(() => {
        speak("Bienvenido a KaiSeñas");
        sessionStorage.setItem('hasWelcomed', 'true');
      }, 500);
      return () => clearTimeout(welcomeTimeout);
    }
  }, [isSpeechEnabled]);

  return (
    <div className={styles.pageContainer}>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Aprende Lenguaje de Señas de Forma Interactiva</h1>
        <p className={styles.heroSubtitle}>
          Elige un curso, practica con nuestra IA y sigue tu progreso. ¡Mejora tu fluidez desde hoy!
        </p>
      </section>

      <section id="cursos" className={styles.coursesSection}>
        <div className={styles.cardGrid}>
          {loading && <p role="status">Cargando cursos…</p>}
          {error && <p role="alert">{error} <button onClick={() => void refresh()}>Reintentar</button></p>}
          {categoryData.filter(() => !loading && !error).filter(category => moduleStates[category.id].visibility === 'visible').map((category) => (
            <CategoryCard
              key={category.id}
              title={category.title}
              imageSrc={category.imageSrc}
              practiceLink={category.id === 'matematicas' ? '/practice/matematicas' : `/practice/${category.id}`}
              trainLink={`/training/${category.id}`}
              isAdmin={isAdmin}
              tag={moduleStates[category.id].stage === 'stable' ? undefined : moduleStates[category.id].stage}
              maintenanceReason={practiceBlock(moduleStates[category.id]) || undefined}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

