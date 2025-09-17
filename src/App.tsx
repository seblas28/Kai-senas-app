// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import LandingPage from './pages/LandingPage/LandingPage';
import PracticePage from './pages/PracticePage/PracticePage';
import ProgressPage from './pages/ProgressPage/ProgressPage';
//import LoginPage from './pages/LoginPage/LoginPage';
//import TrainingPage from './pages/TrainingPage/TrainingPage';

const App: React.FC = () => {
  return (
    // El componente <Router> envuelve toda tu aplicación
    <Router>
      <Navbar />
      <main>
        {/* <Routes> decide qué componente renderizar según la URL */}
        <Routes>
          {/* Ruta para la página de inicio */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Ruta para la página de práctica (con un parámetro dinámico :vowel) */}
          <Route path="/practice/:vowel" element={<PracticePage />} />
          
          {/* Ruta para la página de progreso */}
          <Route path="/progreso" element={<ProgressPage />} />

          {/* Ruta para la página de login */}
          {/*<Route path="/training-login" element={<LoginPage />} />*/}

          {/* Ruta para la página de entrenamiento */}
          {/*<Route path="/training" element={<TrainingPage />} />*/}
        </Routes>
      </main>
      <Footer />
    </Router>
  );
};

export default App;
