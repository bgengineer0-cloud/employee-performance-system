import React, { useState } from 'react';
import api from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      const { token, user } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      if (onLogin) onLogin();

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'لا يمكن الاتصال بالخادم — تأكد أن الباكند يعمل'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f7f4, #e8f4f0)',
      fontFamily: 'Segoe UI, Tahoma, sans-serif',
      direction: 'rtl'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '20px',
        width: '420px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px', height: '60px',
            background: 'linear-gradient(135deg, #1D9E75, #0F6E56)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            fontSize: '26px',
          }}>⊞</div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0F6E56', margin: 0 }}>
            نظام إدارة أداء الموظفين
          </h1>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '6px' }}>
            واستمرارية العمل
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="email"
              style={{ fontSize: '13px', color: '#444', display: 'block', marginBottom: '6px', fontWeight: '500' }}
            >
              البريد الإلكتروني
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="أدخل بريدك الإلكتروني"
              autoComplete="email"
              required
              style={{
                width: '100%', padding: '11px 14px',
                border: '1.5px solid #e0e0e0',
                borderRadius: '10px', fontSize: '14px',
                direction: 'ltr', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label
              htmlFor="password"
              style={{ fontSize: '13px', color: '#444', display: 'block', marginBottom: '6px', fontWeight: '500' }}
            >
              كلمة المرور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              autoComplete="current-password"
              required
              style={{
                width: '100%', padding: '11px 14px',
                border: '1.5px solid #e0e0e0',
                borderRadius: '10px', fontSize: '14px',
                direction: 'ltr', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#FCEBEB', color: '#A32D2D',
              padding: '11px 14px', borderRadius: '10px',
              fontSize: '13px', marginBottom: '16px',
              border: '1px solid #f5c2c2',
            }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px',
              background: loading ? '#aaa' : '#1D9E75',
              color: 'white', border: 'none',
              borderRadius: '10px', fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? '⏳ جارٍ التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div style={{
          marginTop: '20px', padding: '12px',
          background: '#f8f9fa', borderRadius: '10px',
          border: '1px dashed #ddd',
        }}>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '8px' }}>
            🔑 بيانات الدخول التجريبية:
          </div>
          {[
            { role: 'مدير النظام', email: 'admin@company.com', pass: 'admin123', color: '#534AB7' },
          ].map(item => (
            <div
              key={item.email}
              onClick={() => { setEmail(item.email); setPassword(item.pass); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 10px', borderRadius: '8px', cursor: 'pointer',
                border: '1px solid #eee', background: 'white',
                marginBottom: '4px',
              }}
            >
              <span style={{
                background: item.color, color: 'white',
                fontSize: '10px', padding: '2px 8px',
                borderRadius: '999px', fontWeight: '600',
              }}>
                {item.role}
              </span>
              <span style={{ fontSize: '12px', color: '#555', direction: 'ltr' }}>
                {item.email}
              </span>
              <span style={{ fontSize: '11px', color: '#aaa', marginRight: 'auto' }}>
                انقر للملء
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}