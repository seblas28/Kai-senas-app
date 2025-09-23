// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SpeechProvider } from './context/SpeechContext';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import LandingPage from './pages/LandingPage/LandingPage';
import PracticePage from './pages/PracticePage/PracticePage';
import ProgressPage from './pages/ProgressPage/ProgressPage';
import LoginPage from './pages/LoginPage/LoginPage';
import TrainingPage from './pages/TrainingPage/TrainingPage';
import CategoryPracticePage from './pages/CategoryPracticePage/CategoryPracticePage'; // Nueva página

const App: React.FC = () => {
  return (
    <SpeechProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/practice/:category" element={<CategoryPracticePage />} />
              <Route path="/practice/:category/:sign" element={<PracticePage />} />
              <Route path="/progreso" element={<ProgressPage />} />
              <Route path="/training/:category" element={<TrainingPage />} /> 
              <Route path="/training-login" element={<LoginPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </SpeechProvider>
  );
};

export default App;

