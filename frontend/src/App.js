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

// داخل Routes أضف:

// ── helpers ──────────────────────────────────────────
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const getToken = () => localStorage.getItem('token');

// ── Guards ───────────────────────────────────────────

// إذا لم يكن مسجلاً → اذهب لصفحة الدخول
const PrivateRoute = ({ children }) => {
  return getToken() && getUser() ? children : <Navigate to="/login" replace />;
};

// إذا كان مسجلاً بالفعل → لا ترجع لصفحة الدخول
const PublicRoute = ({ children }) => {
  return getToken() && getUser() ? <Navigate to="/" replace /> : children;
};

// الصفحة الرئيسية حسب الدور
const HomeRoute = () => {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'employee') return <EmployeeDashboard />;
  return <Dashboard />;
};

// حماية الصفحات الإدارية من الموظف
const AdminRoute = ({ children }) => {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'employee') return <Navigate to="/" replace />;
  return children;
};

// ── App ──────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* صفحة الدخول — عامة فقط */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* الصفحات المحمية */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          {/* الصفحة الرئيسية — حسب الدور */}
          <Route index element={<HomeRoute />} />

          {/* صفحات إدارية فقط */}
          <Route path="employees" element={<AdminRoute><Employees /></AdminRoute>} />
          <Route path="tasks" element={<AdminRoute><Tasks /></AdminRoute>} />
          <Route path="evaluation" element={<AdminRoute><Evaluation /></AdminRoute>} />
          <Route path="attendance" element={<AdminRoute><Attendance /></AdminRoute>} />
          <Route path="reports" element={<AdminRoute><Reports /></AdminRoute>} />
<Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          {/* صفحات مشتركة للجميع */}
          <Route path="messages" element={<Messages />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* أي مسار غير معروف → الرئيسية */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;