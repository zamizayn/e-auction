import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Auction } from './pages/Auction';
import { Teams } from './pages/Teams';
import { Players } from './pages/Players';
import { Games } from './pages/Games';
import { Fixtures } from './pages/Fixtures';
import { Standings } from './pages/Standings';
import { Roadmap } from './pages/Roadmap';
import { Tournament } from './pages/Tournament';
import { Settings } from './pages/Settings';

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/auction" element={<Auction />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/players" element={<Players />} />
              <Route path="/games" element={<Games />} />
              <Route path="/fixtures" element={<Fixtures />} />
              <Route path="/standings" element={<Standings />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/tournament" element={<Tournament />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AppProvider>
  );
};

export default App;
