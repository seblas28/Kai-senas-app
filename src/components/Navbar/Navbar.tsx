// src/components/Navbar/Navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // <-- Usamos nuestro hook
import styles from './Navbar.module.css';
import SpeechToggleButton from '../SpeechToggleButton/SpeechToggleButton';
import ThemeToggleButton from '../ThemeToggleButton/ThemeToggleButton';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/" className={styles.brand}> KaiSeñas 👋 </Link>
        <div className={styles.navItems}>
          <ul className={styles.navLinks}>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/progreso">Mi Progreso</Link></li> 
          </ul>
          <SpeechToggleButton />
          <ThemeToggleButton />
          {/* Lógica condicional para mostrar Login o Logout */}
          {user?.role === 'admin' ? (
            <button onClick={logout} className={styles.logoutButton}>Cerrar Sesión</button>
          ) : (
            <Link to="/login" className={styles.loginLink}>Admin Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

