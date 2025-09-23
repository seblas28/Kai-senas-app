// src/components/PracticeCard/PracticeCard.tsx
import React from 'react';
import styles from './PracticeCard.module.css';

interface PracticeCardProps {
  label: string;
  imageSrc: string;
  description: string;
  isCompleted?: boolean;
}

const PracticeCard: React.FC<PracticeCardProps> = ({ label, imageSrc, description, isCompleted }) => {
  return (
    <div className={`${styles.card} ${isCompleted ? styles.completed : ''}`}>
      {/* Mostramos el check de completado si la prop es true */}
      {isCompleted && <div className={styles.checkmark}>✓</div>}
      
      <img src={imageSrc} alt={`Seña para ${label}`} className={styles.cardImage} />
      <h3 className={styles.cardLabel}>{label}</h3>
      <p className={styles.cardDescription}>{description}</p>
    </div>
  );
};

export default PracticeCard;
