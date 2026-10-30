import { Link } from 'react-router-dom';
import styles from './LoginPage.module.css';
export default function LoginPage() {
  return <div className={styles.wrapper}><section className={styles.loginForm}>
    <h1 className={styles.title}>Tu cuenta en Kai Señas</h1>
    <p className={styles.subtitle}>El registro y el inicio de sesión estarán disponibles próximamente.</p>
    <p>Mientras tanto puedes practicar como invitado. Tu progreso se guarda en este navegador.</p>
    <Link to="/" className={styles.loginButton}>Continuar practicando</Link>
  </section></div>;
}
