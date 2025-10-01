// src/components/CategoryCard/CategoryCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './CategoryCard.module.css';

interface CategoryCardProps {
  title: string;
  imageSrc: string;
  practiceLink: string;
  trainLink: string;
  isAdmin: boolean;
  tag?: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ title, imageSrc, practiceLink, trainLink, isAdmin, tag }) => {
  return (
    <div className={styles.card}>
      <img src={imageSrc} alt={`Categoría ${title}`} className={styles.cardImage} />
      <div className={styles.titleContainer}>
        <h2 className={styles.cardTitle}>{title}</h2>
        {tag && <span className={styles.tag}>{tag}</span>}
      </div>

      <div className={styles.buttons}>
        {isAdmin && (
          <Link to={trainLink} className={styles.buttonSecondary}>
            Entrenar IA
          </Link>
        )}
        <Link to={practiceLink} className={styles.button}>
          Practicar
        </Link>
      </div>
    </div>
  );
};

export default CategoryCard;

