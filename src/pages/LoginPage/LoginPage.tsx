// src/pages/LoginPage/LoginPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './LoginPage.module.css';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Simplemente llamamos a la función de login del contexto.
    // Ella se encargará de todo: verificar, actualizar el estado y redirigir.
    const success = login(username, password);

    if (!success) {
      setError('Usuario o contraseña incorrectos.');
    }
  };

  return (
    <div className={styles.wrapper}>
      <form className={styles.loginForm} onSubmit={handleLogin}>
        <h1 className={styles.title}>Acceso de Administrador</h1>
        <p className={styles.subtitle}>Ingresa para acceder a las herramientas de entrenamiento de la IA.</p>
        <div className={styles.inputGroup}>
          <label htmlFor="username">Usuario</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.loginButton}>Ingresar</button>
      </form>
    </div>
  );
};

export default LoginPage;

