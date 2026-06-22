import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import Departments from './pages/Departments';
import Employees from './pages/Employees';
import Tasks from './pages/Tasks';
import Evaluation from './pages/Evaluation';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        setUser(JSON.parse(userStr));
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    } catch {
      setIsLoggedIn(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f7f4' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #f0f0f0', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color: '#888', fontSize: '14px' }}>جارٍ التحميل...</div>
        </div>
      </div>
    );
  }

  const isEmployee = user?.role === 'employee';
  const isManager = user?.role === 'manager';

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/" replace /> : <Login onLogin={checkAuth} />}
        />

        <Route
          path="/"
          element={isLoggedIn ? <Layout /> : <Navigate to="/login" replace />}
        >
          <Route
            index
            element={isEmployee ? <EmployeeDashboard /> : isManager ? <ManagerDashboard /> : <Dashboard />}
          />
          <Route path="departments" element={isEmployee || isManager ? <Navigate to="/" replace /> : <Departments />} />
          <Route path="employees" element={isEmployee || isManager ? <Navigate to="/" replace /> : <Employees />} />
          <Route path="tasks" element={isEmployee || isManager ? <Navigate to="/" replace /> : <Tasks />} />
          <Route path="evaluation" element={isEmployee || isManager ? <Navigate to="/" replace /> : <Evaluation />} />
          <Route path="attendance" element={isEmployee || isManager ? <Navigate to="/" replace /> : <Attendance />} />
          <Route path="reports" element={isEmployee || isManager ? <Navigate to="/" replace /> : <Reports />} />
          <Route path="users" element={isEmployee || isManager ? <Navigate to="/" replace /> : <UserManagement />} />
          <Route path="messages" element={<Messages />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;