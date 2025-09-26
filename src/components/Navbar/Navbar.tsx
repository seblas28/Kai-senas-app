// src/components/Navbar/Navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Navbar.module.css';
import SpeechToggleButton from '../SpeechToggleButton/SpeechToggleButton';
import ThemeToggleButton from '../ThemeToggleButton/ThemeToggleButton'; 

const Navbar: React.FC = () => {
  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/" className={styles.brand}>
           KaiSeñas 👋
        </Link>
        <div className={styles.navItems}>
          <ul className={styles.navLinks}>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/progreso">Mi Progreso</Link></li> 
          </ul>
          <SpeechToggleButton />
          {/* Añadimos el botón de cambio de tema */}
          <ThemeToggleButton />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

