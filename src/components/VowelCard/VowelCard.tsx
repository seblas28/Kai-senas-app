// src/components/VowelCard/VowelCard.tsx
import React from 'react';
import styles from './VowelCard.module.css';

interface VowelCardProps {
  vowel: string;
  imageSrc: string;
  description: string;
}

const VowelCard: React.FC<VowelCardProps> = ({ vowel, imageSrc, description }) => {
  return (
    <div className={styles.card}>
      {/* Muestra la imagen de la seña */}
      <img src={imageSrc} alt={`Seña para la vocal ${vowel}`} className={styles.vowelImage} />
      
      {/* Muestra el texto descriptivo */}
      <p className={styles.vowelDescription}>{description}</p>
    </div>
  );
};

export default VowelCard;