import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) navigate('/', { replace: true });
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/', { replace: true });

    } catch (err) {
      setError(err.response?.data?.message || 'لا يمكن الاتصال بالخادم — تأكد أن الباكند يعمل');
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
      background: 'linear-gradient(135deg, #f0f7f4 0%, #e8f4f0 50%, #f0f0f7 100%)',
      fontFamily: 'Segoe UI, Tahoma, sans-serif',
      direction: 'rtl'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '20px',
        width: '420px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        border: '1px solid #eee'
      }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px', height: '60px',
            background: 'linear-gradient(135deg, #1D9E75, #0F6E56)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            fontSize: '26px',
            boxShadow: '0 4px 12px rgba(29,158,117,0.3)'
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
            <label style={{ fontSize: '13px', color: '#444', display: 'block', marginBottom: '6px', fontWeight: '500' }}>
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="أدخل بريدك الإلكتروني"
              required
              style={{
                width: '100%', padding: '11px 14px',
                border: '1.5px solid #e0e0e0', borderRadius: '10px',
                fontSize: '14px', direction: 'ltr',
                outline: 'none', fontFamily: 'inherit'
              }}
              onFocus={e => e.target.style.borderColor = '#1D9E75'}
              onBlur={e => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ fontSize: '13px', color: '#444', display: 'block', marginBottom: '6px', fontWeight: '500' }}>
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              required
              style={{
                width: '100%', padding: '11px 14px',
                border: '1.5px solid #e0e0e0', borderRadius: '10px',
                fontSize: '14px', direction: 'ltr',
                outline: 'none', fontFamily: 'inherit'
              }}
              onFocus={e => e.target.style.borderColor = '#1D9E75'}
              onBlur={e => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          {error && (
            <div style={{
              background: '#FCEBEB', color: '#A32D2D',
              padding: '11px 14px', borderRadius: '10px',
              fontSize: '13px', marginBottom: '16px',
              border: '1px solid #f5c2c2',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px',
              background: loading ? '#aaa' : 'linear-gradient(135deg, #1D9E75, #0F6E56)',
              color: 'white', border: 'none',
              borderRadius: '10px', fontSize: '15px',
              fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(29,158,117,0.3)'
            }}
          >
            {loading ? '⏳ جارٍ التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div style={{
          marginTop: '24px', padding: '14px',
          background: '#f8f9fa', borderRadius: '10px',
          border: '1px dashed #ddd'
        }}>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '8px' }}>
            🔑 بيانات الدخول التجريبية:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { role: 'مدير النظام', email: 'admin@company.com', pass: 'admin123', color: '#534AB7' },
              { role: 'مدير', email: 'manager@company.com', pass: 'manager123', color: '#1D9E75' },
            ].map(item => (
              <div
                key={item.email}
                onClick={() => { setEmail(item.email); setPassword(item.pass); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 10px', borderRadius: '8px',
                  cursor: 'pointer',
                  border: '1px solid #eee', background: 'white'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f7f4'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <span style={{ background: item.color, color: 'white', fontSize: '10px', padding: '2px 8px', borderRadius: '999px', fontWeight: '600', flexShrink: 0 }}>
                  {item.role}
                </span>
                <span style={{ fontSize: '12px', color: '#555', direction: 'ltr' }}>{item.email}</span>
                <span style={{ fontSize: '11px', color: '#aaa', marginRight: 'auto' }}>انقر للملء</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}