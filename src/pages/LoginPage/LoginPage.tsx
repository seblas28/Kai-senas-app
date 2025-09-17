// src/pages/LoginPage/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LoginPage.module.css';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Credenciales hardcodeadas como se solicitó
    if (username === 'admin' && password === 'senati') {
      // Guardar un token simple en sessionStorage para "proteger" la ruta
      sessionStorage.setItem('auth-token', 'supersecrettoken');
      navigate('/training');
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
  };

  return (
    <div className={styles.wrapper}>
      <form className={styles.loginForm} onSubmit={handleLogin}>
        <h1 className={styles.title}>Acceso de Entrenamiento</h1>
        <p className={styles.subtitle}>Ingresa tus credenciales para acceder al panel de entrenamiento de la IA.</p>
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
