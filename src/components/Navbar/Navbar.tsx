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
        <Link to="/" className={styles.brand}> KaiSeñas 👋 </Link>
        <div className={styles.navItems}>
          <ul className={styles.navLinks}>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/progreso">Mi Progreso</Link></li>
            <li><Link to="/ranking">Competición</Link></li>
            {import.meta.env.DEV && <li><Link to="/training/vocales">Laboratorio local</Link></li>} 
          </ul>
          <SpeechToggleButton />
          <ThemeToggleButton />
          {/* Lógica condicional para mostrar Login o Logout */}
          <Link to="/login" className={styles.loginLink}>Mi cuenta</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

