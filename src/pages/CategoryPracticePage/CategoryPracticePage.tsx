// src/pages/CategoryPracticePage/CategoryPracticePage.tsx
import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './CategoryPracticePage.module.css';
import { getSignsByCategory } from '../../data/signData';
import PracticeCard from '../../components/PracticeCard/PracticeCard';
import { speak } from '../../utils/speech';
import { progressKey } from '../../domain/progress';
import { isModuleId, practiceBlock } from '../../domain/modules';
import { useCatalog } from '../../context/CatalogContext';
import { useProgress } from '../../context/ProgressContext';
import { useSpeech } from '../../context/SpeechContext';



const CategoryPracticePage: React.FC = () => {
  const { states: moduleStates } = useCatalog();
  const { snapshot } = useProgress();
  const progressData = snapshot.signs;
  const { isSpeechEnabled } = useSpeech();
  const { category } = useParams<{ category: string }>();

  useEffect(() => {

    if (category && isSpeechEnabled){
      speak(`Practicar ${category}`);
    }
  }, [category, isSpeechEnabled]); // El array vacío asegura que esto solo se ejecute una vez
  
  if (!category) {
    return <div>Categoría no encontrada.</div>;
  }

  const signs = getSignsByCategory(category);

  return (
    <div className={styles.pageContainer}>
      <Link to="/" className={styles.backLink}>← Volver a Cursos</Link>
      <h1 className={styles.title}>
        Practicar: <span className={styles.highlight}>{category}</span>
      </h1>
      {category === 'abecedario' && <p>Por ahora puedes practicar B y C. Las demás señas necesitan un modelo actualizado.</p>}
      <div className={styles.cardGrid}>
        {signs.filter(sign => !isModuleId(category) || moduleStates[category].exercises?.[sign.label]?.visibility !== 'hidden').map((sign) => {
          // Para cada seña, verificamos si está completada
          const isCompleted = progressData[progressKey(category, sign.label)]?.completed === true;

          const blocked = isModuleId(category) ? practiceBlock(moduleStates[category], sign.label) : 'Curso no disponible';
          if (blocked) return <div key={sign.label} className={styles.cardLink} aria-disabled="true"><PracticeCard label={sign.label} imageSrc={sign.imageSrc} description={blocked} isCompleted={false} /></div>;
          return (
            <Link to={`/practice/${category}/${sign.label}`} key={sign.label} className={styles.cardLink}>
              {/* Pasamos la prop isCompleted a la tarjeta */}
              <PracticeCard 
                label={sign.label}
                imageSrc={sign.imageSrc}
                description={sign.description}
                isCompleted={isCompleted}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryPracticePage;

