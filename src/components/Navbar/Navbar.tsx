// src/components/Navbar/Navbar.tsx
import React from 'react';
import styles from './Navbar.module.css';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <a href="/" className={styles.brand}>
           KaiSeñas 👋
        </a>
        <ul className={styles.navLinks}>
          <li><Link to="/">Inicio</Link></li>
          <li><Link to="/progreso">Mi Progreso</Link></li> 
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;