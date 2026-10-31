// src/components/Navbar/Navbar.tsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { canManage } from '../../domain/modules';
import { Link, NavLink } from 'react-router-dom';

import styles from './Navbar.module.css';
import ThemeToggleButton from '../ThemeToggleButton/ThemeToggleButton';

const Navbar: React.FC = () => {
  const { user, roleLoading } = useAuth();


  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/" className={styles.brand}> KaiSeñas 👋 </Link>
        <div className={styles.navItems}>
          <ul className={styles.navLinks}>
            <li><NavLink to="/" end>Inicio</NavLink></li>
            <li><NavLink to="/progreso">Mi Progreso</NavLink></li>
            <li><NavLink to="/ranking">Competición</NavLink></li> 
          {!roleLoading && canManage(user?.role) && <li><NavLink to="/administracion">Administración</NavLink></li>}
          </ul>
          <ThemeToggleButton />
          {/* Lógica condicional para mostrar Login o Logout */}
          <Link to="/login" className={styles.loginLink}>Mi cuenta</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

