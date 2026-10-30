import { Link } from 'react-router-dom';
export default function RankingPage() {
  return <section className="kai-notice"><p className="kai-eyebrow">Competición</p><h1>Cada seña, un nuevo reto</h1>
    <p>La clasificación entre usuarios estará disponible cuando se habiliten las cuentas y las evaluaciones competitivas.</p>
    <p>Se compararán los mejores resultados de vocales, abecedario y números. Matemáticas quedará fuera durante alpha y beta.</p>
    <p>Tu progreso de práctica es personal y no se publica como un resultado competitivo.</p><Link to="/">Seguir practicando</Link>
  </section>;
}
