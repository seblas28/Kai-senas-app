// src/pages/CategoryPracticePage/CategoryPracticePage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './CategoryPracticePage.module.css';
import { getSignsByCategory } from '../../data/signData';
import PracticeCard from '../../components/PracticeCard/PracticeCard';
import { speak } from '../../utils/speech';


interface SignProgress {  bestScore: number;}

const CategoryPracticePage: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const [progressData, setProgressData] = useState<{ [key: string]: SignProgress }>({});

  useEffect(() => {
    // Cargamos los datos de progreso del localStorage cuando la página se monta
    const loadedProgress = JSON.parse(localStorage.getItem('progressData') || '{}');
    setProgressData(loadedProgress);

    if (category){
      speak(`Practicar ${category}`);
    }
  }, [category]); // El array vacío asegura que esto solo se ejecute una vez
  
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
      <div className={styles.cardGrid}>
        {signs.map((sign) => {
          // Para cada seña, verificamos si está completada
          const isCompleted = (progressData[sign.label]?.bestScore || 0) >= 97;

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

