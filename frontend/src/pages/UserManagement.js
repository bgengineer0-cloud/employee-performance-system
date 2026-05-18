import React, { useState, useEffect } from 'react';
import api from '../api';

const roleMap = {
  admin: { label: 'مدير النظام', color: '#534AB7', bg: '#EEEDFE' },
  manager: { label: 'مدير', color: '#1D9E75', bg: '#E1F5EE' },
  employee: { label: 'موظف', color: '#BA7517', bg: '#FAEEDA' },
};

const empStatusMap = {
  active: { label: 'نشط', color: '#1D9E75', bg: '#E1F5EE' },
  absent: { label: 'غائب', color: '#A32D2D', bg: '#FCEBEB' },
  on_leave: { label: 'إجازة', color: '#BA7517', bg: '#FAEEDA' },
};

const departments = [
  'الموارد البشرية',
  'تقنية المعلومات',
  'المالية',
  'المبيعات',
  'خدمة العملاء'
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/users/from-employees')
      .then(res => setUsers(res.data.users || []))
      .catch(() => setError('فشل تحميل المستخدمين'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => {
    const matchSearch =
      u.name?.includes(search) ||
      u.email?.includes(search) ||
      u.department?.includes(search) ||
      u.employeeId?.includes(search);
    const matchRole = filterRole === '' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      department: user.department || 'الموارد البشرية',
      role: user.role || 'employee',
      isActive: user.isActive !== false,
      newPassword: '',
    });
    setMsg('');
    setError('');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError('الاسم والبريد الإلكتروني مطلوبان');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // تحديث بيانات المستخدم إن كان لديه حساب
      if (editingUser.userId) {
        const payload = {
          name: form.name,
          email: form.email,
          department: form.department,
          role: form.role,
          isActive: form.isActive,
        };
        if (form.newPassword) payload.newPassword = form.newPassword;
        await api.put(`/users/${editingUser.userId}`, payload);
      }

      // تحديث بيانات الموظف دائماً
      if (editingUser.employeeId) {
        await api.put(`/employees/${editingUser._id}`, {
          name: form.name,
          department: form.department,
        });
      }

      setMsg('✓ تم حفظ التغييرات بنجاح');
      setEditingUser(null);
      load();
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    if (!user.userId) {
      setError('هذا الموظف لا يملك حساب دخول بعد');
      setTimeout(() => setError(''), 3000);
      return;
    }
    try {
      const res = await api.patch(`/users/${user.userId}/toggle-active`);
      setMsg(`✓ ${res.data.message}`);
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setError('فشل تغيير حالة الحساب');
    }
  };

  const handleResetPassword = async (user) => {
    if (!user.userId) {
      setError('هذا الموظف لا يملك حساب دخول');
      return;
    }
    const newPass = user.name.replace(/\s+/g, '').toLowerCase().slice(0, 6) + '123';
    if (!window.confirm(`سيتم إعادة تعيين كلمة المرور إلى: ${newPass}`)) return;
    try {
      await api.put(`/users/${user.userId}`, { newPassword: newPass });
      setMsg(`✓ تم إعادة تعيين كلمة المرور إلى: ${newPass}`);
      setTimeout(() => setMsg(''), 8000);
    } catch (err) {
      setError('فشل إعادة تعيين كلمة المرور');
    }
  };

  // إحصائيات
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive !== false).length;
  const withAccount = users.filter(u => u.hasAccount).length;

  return (
    <div style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif', direction: 'rtl' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>إدارة المستخدمين</h1>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
            مستند على قائمة الموظفين — يتحدث تلقائياً عند إضافة موظف
          </div>
        </div>
        <button
          onClick={load}
          style={{ padding: '8px 16px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
        >
          🔄 تحديث
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '18px' }}>
        {[
          { label: 'إجمالي المستخدمين', value: totalUsers, color: '#534AB7', bg: '#EEEDFE', icon: '👥' },
          { label: 'حسابات نشطة', value: activeUsers, color: '#1D9E75', bg: '#E1F5EE', icon: '✓' },
          { label: 'لديهم حساب دخول', value: withAccount, color: '#BA7517', bg: '#FAEEDA', icon: '🔑' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: '12px', padding: '14px 16px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '600', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {msg && (
        <div style={{ background: '#E1F5EE', color: '#0F6E56', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', border: '1px solid #b2dfdb' }}>
          {msg}
        </div>
      )}
      {error && (
        <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', border: '1px solid #f5c2c2' }}>
          ⚠ {error}
          <button onClick={() => setError('')} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#A32D2D', fontWeight: '700' }}>✕</button>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '480px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>

            {/* Modal Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: roleMap[editingUser.role]?.bg, color: roleMap[editingUser.role]?.color, fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editingUser.name?.slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600' }}>تعديل: {editingUser.name}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>
                    {editingUser.employeeId || ''} — {editingUser.email}
                  </div>
                </div>
              </div>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#aaa' }}>✕</button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* تنبيه إن لم يكن لديه حساب */}
              {!editingUser.hasAccount && (
                <div style={{ background: '#FAEEDA', color: '#633806', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', border: '1px solid #f0d9a0' }}>
                  ⚠ هذا الموظف ليس لديه حساب دخول بعد. سيتم إنشاء الحساب تلقائياً عند الحفظ.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>الاسم الكامل</label>
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'rtl' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'ltr' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>القسم</label>
                  <select
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px' }}
                  >
                    {departments.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>الدور</label>
                  <select
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px' }}
                  >
                    <option value="employee">موظف</option>
                    <option value="manager">مدير</option>
                    <option value="admin">مدير النظام</option>
                  </select>
                </div>
              </div>

              {/* حالة الحساب */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f9f9f9', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>حالة الحساب</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    {form.isActive ? '● الحساب نشط' : '● الحساب معطّل'}
                  </div>
                </div>
                <div
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  style={{ width: '40px', height: '22px', background: form.isActive ? '#1D9E75' : '#ddd', borderRadius: '999px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
                >
                  <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: form.isActive ? '20px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>

              {/* كلمة المرور */}
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  كلمة مرور جديدة
                  <span style={{ color: '#aaa', fontWeight: '400', marginRight: '6px' }}>اتركها فارغة إن لم ترد التغيير</span>
                </label>
                <input
                  type="text"
                  value={form.newPassword}
                  onChange={e => setForm({ ...form, newPassword: e.target.value })}
                  placeholder="أدخل كلمة مرور جديدة..."
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'ltr' }}
                />
                {form.newPassword && (
                  <div style={{ fontSize: '11px', color: '#1D9E75', marginTop: '4px' }}>
                    ✓ ستُغيَّر كلمة المرور عند الحفظ
                  </div>
                )}
              </div>

              {/* عرض كلمة المرور الحالية */}
              {editingUser.hasAccount && (
                <div style={{ background: '#f5f5f5', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#666' }}>
                  <strong>كلمة المرور الافتراضية:</strong>{' '}
                  {editingUser.name?.replace(/\s+/g, '').toLowerCase().slice(0, 6) + '123'}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid #eee', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingUser(null)}
                style={{ padding: '9px 18px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px' }}
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '9px 22px', background: saving ? '#aaa' : '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500' }}
              >
                {saving ? '⏳ جارٍ الحفظ...' : '✓ حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
        <input
          placeholder="🔍 ابحث بالاسم أو البريد أو الرقم الوظيفي..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '9px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
        />
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', minWidth: '140px' }}
        >
          <option value="">جميع الأدوار</option>
          <option value="admin">مدير النظام</option>
          <option value="manager">مدير</option>
          <option value="employee">موظف</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>جارٍ التحميل...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['الموظف', 'الرقم الوظيفي', 'القسم', 'الدور', 'حالة الحساب', 'حالة الموظف', 'إجراءات'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'right', fontWeight: '500', color: '#666', borderBottom: '1px solid #eee', fontSize: '12px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => {
                const role = roleMap[user.role] || roleMap.employee;
                const empStatus = empStatusMap[user.empStatus] || empStatusMap.active;
                return (
                  <tr
                    key={user._id}
                    style={{ borderBottom: '1px solid #f5f5f5' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: role.bg, color: role.color, fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {user.name?.slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500' }}>{user.name}</div>
                          <div style={{ fontSize: '11px', color: '#888', direction: 'ltr' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#888', fontFamily: 'monospace', fontSize: '12px' }}>
                      {user.employeeId || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: '#f0f0f0', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                        {user.department || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: role.bg, color: role.color, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '500' }}>
                        {role.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {user.hasAccount ? (
                        <span style={{ background: user.isActive ? '#E1F5EE' : '#FCEBEB', color: user.isActive ? '#1D9E75' : '#A32D2D', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '500' }}>
                          {user.isActive ? '● نشط' : '● معطّل'}
                        </span>
                      ) : (
                        <span style={{ background: '#f0f0f0', color: '#999', padding: '3px 10px', borderRadius: '999px', fontSize: '11px' }}>
                          بدون حساب
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: empStatus.bg, color: empStatus.color, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '500' }}>
                        ● {empStatus.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => openEdit(user)}
                          style={{ padding: '4px 10px', background: '#E1F5EE', color: '#0F6E56', border: '1px solid #b2dfdb', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500' }}
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          style={{ padding: '4px 10px', background: user.isActive ? '#FAEEDA' : '#E1F5EE', color: user.isActive ? '#BA7517' : '#1D9E75', border: `1px solid ${user.isActive ? '#f0d9a0' : '#b2dfdb'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500' }}
                        >
                          {user.isActive ? 'تعطيل' : 'تفعيل'}
                        </button>
                        <button
                          onClick={() => handleResetPassword(user)}
                          style={{ padding: '4px 10px', background: '#EEEDFE', color: '#534AB7', border: '1px solid #d5d3f5', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500' }}
                        >
                          إعادة كلمة المرور
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>
                    لا يوجد مستخدمون
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}