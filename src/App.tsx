// src/App.tsx
import React from 'react';
import ModuleGate from './components/ModuleGate/ModuleGate';
import RankingPage from './pages/RankingPage/RankingPage';
import MaintenancePage from './pages/MaintenancePage/MaintenancePage';
import { useAuth } from './context/AuthContext';
import { CatalogProvider } from './context/CatalogContext';
import { ProgressProvider } from './context/ProgressContext';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import LandingPage from './pages/LandingPage/LandingPage';
import LoginPage from './pages/LoginPage/LoginPage';
import PracticePage from './pages/PracticePage/PracticePage';
import ProgressPage from './pages/ProgressPage/ProgressPage';
import TrainingPage from './pages/TrainingPage/TrainingPage';
import CategoryPracticePage from './pages/CategoryPracticePage/CategoryPracticePage'; // Nueva página
import MathCalculatorPage from './pages/MathCalculatorPage/MathCalculatorPage';

function LegacyCaptureRedirect() {
  const { category } = useParams();
  return <Navigate replace to={`/administracion/captura/${encodeURIComponent(category || 'vocales')}`} />;
}

function DataProviders({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <section className="kai-notice" role="status">Recuperando sesión…</section>;
  return <CatalogProvider key={user?.id || 'guest'}><ProgressProvider key={user?.id || 'guest'}>{children}</ProgressProvider></CatalogProvider>;
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
        <Router>
          <AuthProvider>
          <DataProviders>
            <div className="app-container">
              <Navbar />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/practice/matematicas" element={<ModuleGate><MathCalculatorPage /></ModuleGate>} />
                  <Route path="/practice/:category" element={<ModuleGate><CategoryPracticePage /></ModuleGate>} />
                  <Route path="/practice/:category/:sign" element={<ModuleGate><PracticePage /></ModuleGate>} />
                  <Route path="/progreso" element={<ProgressPage />} />
                  <Route path="/training/:category" element={<LegacyCaptureRedirect />} />
                  <Route path="/administracion/captura/:category" element={<ModuleGate training><TrainingPage /></ModuleGate>} /> 
                  <Route path="/administracion" element={<MaintenancePage />} />
                  <Route path="/ranking" element={<RankingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </DataProviders>
          </AuthProvider>
        </Router>
    </ThemeProvider>
  );
};

export default App;

