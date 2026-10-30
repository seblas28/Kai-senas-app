// src/pages/CategoryPracticePage/CategoryPracticePage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './CategoryPracticePage.module.css';
import { getSignsByCategory } from '../../data/signData';
import PracticeCard from '../../components/PracticeCard/PracticeCard';
import { speak } from '../../utils/speech';
import { readProgress, progressKey } from '../../domain/progress';
import { isModuleId, moduleStates, practiceBlock } from '../../domain/modules';
import { useAuth } from '../../context/AuthContext';
import { useSpeech } from '../../context/SpeechContext';


interface SignProgress {  bestScore: number;}

const CategoryPracticePage: React.FC = () => {
  const { user } = useAuth();
  const { isSpeechEnabled } = useSpeech();
  const { category } = useParams<{ category: string }>();
  const [progressData, setProgressData] = useState<{ [key: string]: SignProgress }>({});

  useEffect(() => {
    // Cargamos los datos de progreso del localStorage cuando la página se monta
    const loadedProgress = readProgress(user?.id).signs;
    setProgressData(loadedProgress);

    if (category && isSpeechEnabled){
      speak(`Practicar ${category}`);
    }
  }, [category, user?.id, isSpeechEnabled]); // El array vacío asegura que esto solo se ejecute una vez
  
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
          const isCompleted = (progressData[progressKey(category, sign.label)]?.bestScore || 0) >= 97;

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

