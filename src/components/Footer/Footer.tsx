// src/components/Footer/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom'; // <-- 1. Importa el componente Link
import styles from './Footer.module.css';

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <p>&copy; {new Date().getFullYear()} KaiSeñas. Todos los derechos reservados.</p>
      
      {/* 2. Añade el contenedor y el enlace para el login de entrenamiento */}
      <div className={styles.adminLinkContainer}>}
        <Link to="/training-login" className={styles.adminLink}>
          Acceso de Entrenamiento ⚙️
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
