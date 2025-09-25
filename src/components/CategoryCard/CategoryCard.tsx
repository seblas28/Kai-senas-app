// src/components/CategoryCard/CategoryCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './CategoryCard.module.css';

interface CategoryCardProps {
  title: string;
  imageSrc: string;
  practiceLink: string;
  trainLink: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ title, imageSrc, practiceLink, trainLink }) => {
  return (
    <div className={styles.card}>
      <img src={imageSrc} alt={`Categoría ${title}`} className={styles.cardImage} />
      <h2 className={styles.cardTitle}>{title}</h2>
      <div className={styles.buttons}>
        {/* --- ¡CAMBIO REALIZADO AQUÍ! --- */}
        {/* El botón de Entrenar ahora aparece primero */}
        <Link to={trainLink} className={styles.buttonSecondary}>
          Entrenar IA
        </Link>
        {/* El botón de Practicar ahora aparece segundo */}
        <Link to={practiceLink} className={styles.button}>
          Practicar
        </Link>
      </div>
    </div>
  );
};

export default CategoryCard;

