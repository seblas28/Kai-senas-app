// src/components/TrainingSummaryCard/TrainingSummaryCard.tsx
import React from 'react';
import styles from './TrainingSummaryCard.module.css';

interface TrainingSummaryCardProps {
  category: string;
  accuracy: number;
}

const TrainingSummaryCard: React.FC<TrainingSummaryCardProps> = ({ category, accuracy }) => {
  return (
    <div className={styles.card}>
      <h3 className={styles.categoryTitle}>{category}</h3>
      <div className={styles.progressInfo}>
        <span>Precisión del Modelo</span>
        <strong>{accuracy.toFixed(2)}%</strong>
      </div>
      <div className={styles.progressBarBackground}>
        <div
          className={styles.progressBarFill}
          style={{ width: `${accuracy}%` }}
        />
      </div>
    </div>
  );
};

export default TrainingSummaryCard;
