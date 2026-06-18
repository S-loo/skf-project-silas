import React, { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ReminderBanner from './components/ReminderBanner';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Tasks from './pages/Tasks';
import TeamManagement from './pages/TeamManagement';
import Notifications from './pages/Notifications';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import GitHubDashboard from './pages/GitHubDashboard';

function ProtectedLayout({ children, pageTitle }) {
  const { user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#F8FAFC',
      }}
    >
      {/* Sidebar controls its own width */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Content automatically adjusts — NO marginLeft */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0, // IMPORTANT (prevents overflow white space)
          transition: 'all 280ms ease',
        }}
      >
        <Header pageTitle={pageTitle} />

        <ReminderBanner />

        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            background: '#F8FAFC',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
        }}
      >
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? <Navigate to="/dashboard" replace /> : <Login />
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedLayout pageTitle="Dashboard">
            <Dashboard />
          </ProtectedLayout>
        }
      />

      <Route
        path="/projects"
        element={
          <ProtectedLayout pageTitle="Projects">
            <Projects />
          </ProtectedLayout>
        }
      />

      <Route
        path="/projects/:id"
        element={
          <ProtectedLayout pageTitle="Project Details">
            <ProjectDetails />
          </ProtectedLayout>
        }
      />

      <Route
        path="/tasks"
        element={
          <ProtectedLayout pageTitle="Tasks">
            <Tasks />
          </ProtectedLayout>
        }
      />

      <Route
        path="/team"
        element={
          <ProtectedLayout pageTitle="Team Management">
            <TeamManagement />
          </ProtectedLayout>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedLayout pageTitle="Notifications">
            <Notifications />
          </ProtectedLayout>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedLayout pageTitle="Reports & Analytics">
            <Analytics />
          </ProtectedLayout>
        }
      />

      <Route
        path="/github-dashboard"
        element={
          <ProtectedLayout pageTitle="GitHub Repository Dashboard">
            <GitHubDashboard />
          </ProtectedLayout>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedLayout pageTitle="Settings">
            <Settings />
          </ProtectedLayout>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}