import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Settings() {
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [form, setForm] = useState({
    name: storedUser.name || '',
    email: storedUser.email || '',
    department: storedUser.department || '',
    currentPassword: '',
    newPassword: '',
  });
  const [tog1, setTog1] = useState(true);
  const [tog2, setTog2] = useState(true);
  const [tog3, setTog3] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // جلب أحدث بيانات المستخدم من قاعدة البيانات
  useEffect(() => {
    api.get('/users/profile').then(res => {
      const u = res.data.user;
      setForm(prev => ({
        ...prev,
        name: u.name || '',
        email: u.email || '',
        department: u.department || '',
      }));
    }).catch(console.error);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    setError('');

    try {
      const payload = {
        name: form.name,
        email: form.email,
        department: form.department,
      };

      if (form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }

      const res = await api.put('/users/profile', payload);

      // تحديث localStorage بالبيانات الجديدة
      const updatedUser = { ...storedUser, ...res.data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setMsg('تم حفظ التغييرات بنجاح ✓');
      setForm(prev => ({ ...prev, currentPassword: '', newPassword: '' }));

    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const Toggle = ({ value, onChange }) => (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: '40px', height: '22px',
        background: value ? '#1D9E75' : '#ddd',
        borderRadius: '999px', position: 'relative',
        cursor: 'pointer', transition: 'background 0.2s'
      }}
    >
      <div style={{
        width: '18px', height: '18px', background: 'white',
        borderRadius: '50%', position: 'absolute',
        top: '2px', left: value ? '20px' : '2px',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }} />
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>الإعدادات</h1>

      {msg && (
        <div style={{ background: '#E1F5EE', color: '#0F6E56', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', border: '1px solid #b2dfdb' }}>
          ✓ {msg}
        </div>
      )}
      {error && (
        <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', border: '1px solid #f5c2c2' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* معلومات الحساب */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #eee' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '16px' }}>معلومات الحساب</h3>

          {/* صورة المستخدم */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', padding: '14px', background: '#f9f9f9', borderRadius: '10px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#E1F5EE', color: '#0F6E56', fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {form.name.slice(0, 2) || 'مد'}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600' }}>{form.name}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{storedUser.role === 'admin' ? 'مدير النظام' : 'مدير'}</div>
              <div style={{ fontSize: '12px', color: '#1D9E75', marginTop: '2px' }}>{form.email}</div>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>الاسم الكامل</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'rtl' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>البريد الإلكتروني</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'ltr' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>القسم</label>
              <select
                value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', direction: 'rtl' }}
              >
                {['الموارد البشرية', 'تقنية المعلومات', 'المالية', 'المبيعات', 'خدمة العملاء'].map(d => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px', marginTop: '4px' }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px', fontWeight: '500' }}>
                تغيير كلمة المرور (اختياري)
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>كلمة المرور الحالية</label>
                <input
                  type="password"
                  value={form.currentPassword}
                  onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                  placeholder="أدخل كلمة المرور الحالية"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={e => setForm({ ...form, newPassword: e.target.value })}
                  placeholder="اتركها فارغة إن لم ترد التغيير"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ padding: '11px', background: loading ? '#aaa' : '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500', marginTop: '4px' }}
            >
              {loading ? '⏳ جارٍ الحفظ...' : 'حفظ التغييرات'}
            </button>
          </form>
        </div>

        {/* إعدادات النظام */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #eee' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '16px' }}>إعدادات النظام</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              ['الإشعارات الفورية', 'تلقي إشعارات عند تحديث المهام', tog1, setTog1],
              ['تذكير المهام المتأخرة', 'إرسال تنبيه يومي للمهام المتأخرة', tog2, setTog2],
              ['تقارير تلقائية', 'إنشاء تقارير شهرية تلقائياً', tog3, setTog3],
            ].map(([label, desc, val, setter]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f5f5f5' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>{label}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{desc}</div>
                </div>
                <Toggle value={val} onChange={setter} />
              </div>
            ))}

            <div style={{ marginTop: '16px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>اللغة</label>
              <select style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>
                <option>العربية</option>
                <option>English</option>
              </select>

              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>المنطقة الزمنية</label>
              <select style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                <option>Asia/Riyadh (GMT+3)</option>
                <option>UTC</option>
              </select>

              <button
                onClick={() => { setMsg('تم حفظ إعدادات النظام ✓'); setTimeout(() => setMsg(''), 3000); }}
                style={{ width: '100%', padding: '11px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
              >
                حفظ إعدادات النظام
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}