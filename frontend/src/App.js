import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Employees from './pages/Employees';
import Tasks from './pages/Tasks';
import Evaluation from './pages/Evaluation';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';

// ── helpers ──────────────────────────────────────
const getUser = () => {
  try {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
};

const getToken = () => localStorage.getItem('token');

// ── Guards ───────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const token = getToken();
  const user = getUser();
  if (!token || !user) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const token = getToken();
  const user = getUser();
  if (token && user) return <Navigate to="/" replace />;
  return children;
};

const HomeRoute = () => {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'employee') return <EmployeeDashboard />;
  return <Dashboard />;
};

const AdminRoute = ({ children }) => {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'employee') return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<HomeRoute />} />
          <Route path="employees" element={<AdminRoute><Employees /></AdminRoute>} />
          <Route path="tasks" element={<AdminRoute><Tasks /></AdminRoute>} />
          <Route path="evaluation" element={<AdminRoute><Evaluation /></AdminRoute>} />
          <Route path="attendance" element={<AdminRoute><Attendance /></AdminRoute>} />
          <Route path="reports" element={<AdminRoute><Reports /></AdminRoute>} />
          <Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          <Route path="messages" element={<Messages />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;