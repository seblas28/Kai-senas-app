// src/components/Navbar/Navbar.tsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { canManage } from '../../domain/modules';
import { Link } from 'react-router-dom';

import styles from './Navbar.module.css';
import SpeechToggleButton from '../SpeechToggleButton/SpeechToggleButton';
import ThemeToggleButton from '../ThemeToggleButton/ThemeToggleButton';

const Navbar: React.FC = () => {
  const { user, roleLoading } = useAuth();


  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/" className={styles.brand}> KaiSeñas 👋 </Link>
        <div className={styles.navItems}>
          <ul className={styles.navLinks}>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/progreso">Mi Progreso</Link></li>
            <li><Link to="/ranking">Competición</Link></li>
            {!roleLoading && canManage(user?.role) && <li><Link to="/training/vocales">Capturar muestras</Link></li>} 
          {!roleLoading && canManage(user?.role) && <li><Link to="/administracion">Administración</Link></li>}
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

