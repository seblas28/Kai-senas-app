// src/pages/LandingPage/LandingPage.tsx
import React, { useEffect } from 'react';
import styles from './LandingPage.module.css';
import CategoryCard from '../../components/CategoryCard/CategoryCard';
import { categoryData } from '../../data/signData';
import { speak } from '../../utils/speech';

const LandingPage: React.FC = () => {
  useEffect(() => {
    const welcomeTimeout = setTimeout(() => {
      speak("Bienvenido a KaiSeñas");
    }, 500);
    return () => clearTimeout(welcomeTimeout);
  }, []);
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
          {categoryData.map((category) => (
            <CategoryCard
              key={category.id}
              title={category.title}
              imageSrc={category.imageSrc}
              practiceLink={`/practice/${category.id}`}
              trainLink={`/training/${category.id}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

