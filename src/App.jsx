import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Navbar from './components/Navbar/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx';
import AuthPage from './pages/AuthPage/AuthPage.jsx';
import AccountPage from './pages/AccountPage/AccountPage.jsx';
import TranslatePage from './pages/TranslatePage/TranslatePage.jsx';
import styles from './App.module.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className={styles.appShell}>
          <Navbar />
          <main className={styles.mainContent}>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/translate"
                element={
                  <ProtectedRoute>
                    <TranslatePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/translate" replace />} />
              <Route path="*" element={<Navigate to="/translate" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
