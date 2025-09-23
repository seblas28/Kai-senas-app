// src/components/CategoryProgressCard/CategoryProgressCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './CategoryProgressCard.module.css';

interface CategoryProgressCardProps {
  title: string;
  imageSrc: string;
  completedCount: number;
  totalCount: number;
  practiceLink: string;
}

const CategoryProgressCard: React.FC<CategoryProgressCardProps> = ({
  title,
  imageSrc,
  completedCount,
  totalCount,
  practiceLink,
}) => {
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className={styles.card}>
      <img src={imageSrc} alt={`Categoría ${title}`} className={styles.cardImage} />
      <div className={styles.cardContent}>
        <h2 className={styles.cardTitle}>{title}</h2>
        <div className={styles.progressInfo}>
          <p>{completedCount} de {totalCount} completados</p>
          <div className={styles.progressBarBackground}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        <Link to={practiceLink} className={styles.practiceButton}>
          Practicar Categoría
        </Link>
      </div>
    </div>
  );
};

export default CategoryProgressCard;