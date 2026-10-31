// src/components/CategoryCard/CategoryCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './CategoryCard.module.css';

interface CategoryCardProps {
  title: string;
  imageSrc: string;
  practiceLink: string;
  tag?: string;
  maintenanceReason?: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ title, imageSrc, practiceLink, tag, maintenanceReason }) => {
  return (
    <div className={styles.card}>
      <img src={imageSrc} alt={`Categoría ${title}`} className={styles.cardImage} />
      <div className={styles.titleContainer}>
        <h2 className={styles.cardTitle}>{title}</h2>
        {title === 'Abecedario' && tag === 'beta' && <p>Modelo parcial: B y C</p>}
        {tag && <span className={styles.tag}>{tag}</span>}
      </div>

      <div className={styles.buttons}>
        {maintenanceReason ? <p className="kai-maintenance" role="status">En mantenimiento: {maintenanceReason}</p> : <Link to={practiceLink} className={styles.button}>Practicar</Link>}
      </div>
    </div>
  );
};

export default CategoryCard;

