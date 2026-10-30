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
  maintenanceReason?: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ title, imageSrc, practiceLink, trainLink, isAdmin, tag, maintenanceReason }) => {
  return (
    <div className={styles.card}>
      <img src={imageSrc} alt={`Categoría ${title}`} className={styles.cardImage} />
      <div className={styles.titleContainer}>
        <h2 className={styles.cardTitle}>{title}</h2>
        {title === 'Abecedario' && tag === 'beta' && <p>Modelo parcial: B y C</p>}
        {tag && <span className={styles.tag}>{tag}</span>}
      </div>

      <div className={styles.buttons}>
        {isAdmin && (
          <Link to={trainLink} className={styles.buttonSecondary}>
            Entrenar IA
          </Link>
        )}
        {maintenanceReason ? <p className="kai-maintenance" role="status">En mantenimiento: {maintenanceReason}</p> : <Link to={practiceLink} className={styles.button}>Practicar</Link>}
      </div>
    </div>
  );
};

export default CategoryCard;

