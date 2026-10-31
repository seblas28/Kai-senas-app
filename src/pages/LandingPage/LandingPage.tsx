// src/pages/LandingPage/LandingPage.tsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './LandingPage.module.css';
import CategoryCard from '../../components/CategoryCard/CategoryCard';
import { categoryData } from '../../data/signData';
import { speak } from '../../utils/speech';
import { useAuth } from '../../context/AuthContext';
import { practiceBlock } from '../../domain/modules';
import { useCatalog } from '../../context/CatalogContext';
import { useSpeech } from '../../context/SpeechContext';

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const { states: moduleStates, loading, error, refresh } = useCatalog();
  const { isSpeechEnabled } = useSpeech();

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
      <section className={styles.hero} aria-labelledby="welcome-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>UN NUEVO MODO DE CONECTAR</p>
          <h1 id="welcome-title">Cada seña abre<br />una <span>conversación.</span></h1>
          <p className={styles.intro}>Acércate a la lengua de señas a tu ritmo. Descubre, practica con tu cámara y construye tu aprendizaje, una seña a la vez.</p>
          <div className={styles.actions}>
            <a href="#cursos" className={styles.primaryAction}>Explorar prácticas <span aria-hidden="true">↗</span></a>
            <a href="#como-funciona" className={styles.secondaryAction}>¿Cómo funciona?</a>
          </div>
          <p className={styles.heroNote}>Puedes explorar sin cuenta. La cámara se solicita al practicar.</p>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.visualTop}><span>KAI / EXPLORA</span><span>01 — 05</span></div>
          <div className={styles.letterComposition}><span>A</span><span>E</span><span>I</span><span>O</span><span>U</span></div>
          <div className={styles.visualBottom}><span>Pequeños pasos.<br /><strong>Nuevas formas de expresarte.</strong></span><span className={styles.visualArrow}>↗</span></div>
        </div>
      </section>

      <section id="como-funciona" className={styles.howSection} aria-labelledby="how-title">
        <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>A TU RITMO</p><h2 id="how-title">Tu primer paso empieza aquí.</h2></div><p>No necesitas experiencia previa.<br />Solo curiosidad y un espacio para practicar.</p></div>
        <ol className={styles.steps}>
          <li><span className={styles.stepNumber}>01</span><h3>Descubre una seña</h3><p>Elige una categoría y consulta la referencia del ejercicio.</p></li>
          <li><span className={styles.stepNumber}>02</span><h3>Prueba con tu cámara</h3><p>Coloca tu mano frente a la cámara y mantén la seña para recibir una respuesta.</p></li>
          <li><span className={styles.stepNumber}>03</span><h3>Sigue avanzando</h3><p>Revisa tus resultados, repite y guarda tu progreso con una cuenta.</p></li>
        </ol>
      </section>

      <section id="cursos" className={styles.coursesSection} aria-labelledby="courses-title">
        <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>ENCUENTRA TU PUNTO DE PARTIDA</p><h2 id="courses-title">¿Qué quieres practicar hoy?</h2></div><p>Explora los ejercicios disponibles.<br />Algunos módulos siguen en desarrollo.</p></div>
        <div className={styles.cardGrid}>
          {loading && <p role="status">Cargando cursos…</p>}
          {error && <p role="alert">{error} <button onClick={() => void refresh()}>Reintentar</button></p>}
          {!loading && !error && !categoryData.some(category => moduleStates[category.id].visibility === 'visible') && <p>No hay prácticas disponibles por el momento. Vuelve pronto.</p>}
          {categoryData.filter(() => !loading && !error).filter(category => moduleStates[category.id].visibility === 'visible').map((category) => (
            <CategoryCard
              key={category.id}
              title={category.title}
              imageSrc={category.imageSrc}
              practiceLink={category.id === 'matematicas' ? '/practice/matematicas' : `/practice/${category.id}`}
              tag={moduleStates[category.id].stage === 'stable' ? undefined : moduleStates[category.id].stage}
              maintenanceReason={practiceBlock(moduleStates[category.id]) || undefined}
            />
          ))}
        </div>
      </section>
      <section className={styles.nextSection} aria-label="Continúa tu experiencia">
        <div><p className={styles.eyebrow}>CADA INTENTO CUENTA</p><h2>Tu aprendizaje tiene su propio ritmo.</h2><p>{user ? 'Consulta tus resultados y vuelve a las señas que quieres reforzar.' : 'Crea tu cuenta para guardar tus resultados y consultarlos desde otros dispositivos.'}</p><Link className={styles.textLink} to={user ? '/progreso' : '/login'}>{user ? 'Ver mi progreso' : 'Conocer mi cuenta'} <span aria-hidden="true">→</span></Link></div>
        <div className={styles.competition}><span className={styles.soon}>EN PREPARACIÓN</span><h3>Un nuevo reto, juntos.</h3><p>La competición llegará a Kai Señas. Pronto podrás comparar tus mejores resultados con otros aprendices.</p><Link className={styles.textLink} to="/ranking">Sobre la competición <span aria-hidden="true">→</span></Link></div>
      </section>
    </div>
  );
};

export default LandingPage;

