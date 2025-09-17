// src/pages/LandingPage/LandingPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './LandingPage.module.css';
import VowelCard from '../../components/VowelCard/VowelCard';
import { vowelData } from '../../data/vowelData';

const LandingPage: React.FC = () => {

  return (
    <div className={styles.pageContainer}>
      {/* Sección Principal (Hero) */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Aprende Lenguaje de Señas de Forma Interactiva</h1>
        <p className={styles.heroSubtitle}>
          Usa tu cámara para practicar las señas de las vocales y recibe retroalimentación 
          en tiempo real gracias a nuestra IA. ¡Mejora tu fluidez desde hoy!
        </p>
        <button className={styles.ctaButton} onClick={() => document.getElementById('cursos')?.scrollIntoView({ behavior: 'smooth' })}>
          ¡Comienza a Practicar!
        </button>
      </section>

      {/* Sección de Cursos (Vocales) */}
      <section id="cursos" className={styles.coursesSection}>
        <h2 className={styles.sectionTitle}>Elige una Vocal para Empezar</h2>
        <div className={styles.vowelsGrid}>
          {vowelData.map((data) => (
            <Link to={`/practice/${data.vowel}`} key={data.vowel} className={styles.vowelLink}>
              <VowelCard 
                vowel={data.vowel} 
                imageSrc={data.imageSrc}
                description={data.description}
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;