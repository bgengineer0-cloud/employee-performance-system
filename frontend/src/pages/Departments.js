import React, { useState, useEffect } from 'react';
import api from '../api';

const COLORS = [
  '#1D9E75', '#534AB7', '#BA7517', '#A32D2D',
  '#0C447C', '#7B2D8B', '#1565C0', '#2E7D32',
];

const ICONS = ['🏢', '💻', '💰', '📊', '🎯', '⚙️', '👥', '📱', '🔬', '📦'];

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#1D9E75',
    icon: '🏢',
    managerName: '',
    managerEmail: '',
    managerPassword: '',
  });

  const load = () => {
    setLoading(true);
    api.get('/departments')
      .then(res => setDepartments(res.data.departments || []))
      .catch(() => setError('فشل تحميل الأقسام'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({
      name: '', description: '', color: '#1D9E75', icon: '🏢',
      managerName: '', managerEmail: '', managerPassword: '',
    });
    setEditingDept(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('اسم القسم مطلوب'); return; }
    setSaving(true);
    setError('');

    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept._id}`, form);
        setMsg('✓ تم تحديث القسم بنجاح');
      } else {
        const res = await api.post('/departments', form);
        setMsg('✓ تم إنشاء القسم بنجاح');
        if (res.data.managerCredentials) {
          setNewCredentials(res.data.managerCredentials);
        }
      }
      resetForm();
      setShowForm(false);
      load();
      setTimeout(() => setMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`هل تريد حذف قسم "${dept.name}"؟`)) return;
    try {
      await api.delete(`/departments/${dept._id}`);
      setMsg(`✓ تم حذف قسم ${dept.name}`);
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل الحذف');
    }
  };

  const openEdit = (dept) => {
    setEditingDept(dept);
    setForm({
      name: dept.name,
      description: dept.description || '',
      color: dept.color || '#1D9E75',
      icon: dept.icon || '🏢',
      managerName: dept.managerName || '',
      managerEmail: dept.managerEmail || '',
      managerPassword: '',
    });
    setShowForm(true);
    setError('');
  };

  return (
    <div style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif', direction: 'rtl' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>إدارة الأقسام</h1>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
            {departments.length} قسم مسجل في النظام
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); setNewCredentials(null); }}
          style={{ padding: '9px 18px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
        >
          {showForm ? '✕ إغلاق' : '+ قسم جديد'}
        </button>
      </div>

      {/* بيانات الدخول الجديدة */}
      {newCredentials && (
        <div style={{ background: '#E1F5EE', border: '1px solid #b2dfdb', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F6E56', marginBottom: '10px' }}>
            ✅ تم إنشاء حساب مدير القسم — احفظ هذه البيانات
          </div>
          <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
            <div><strong>البريد:</strong> <code style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: '4px' }}>{newCredentials.email}</code></div>
            <div><strong>كلمة المرور:</strong> <code style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: '4px' }}>{newCredentials.password}</code></div>
          </div>
          <button
            onClick={() => setNewCredentials(null)}
            style={{ marginTop: '10px', background: 'none', border: '1px solid #1D9E75', color: '#1D9E75', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
          >
            فهمت — إغلاق
          </button>
        </div>
      )}

      {/* Alerts */}
      {msg && <div style={{ background: '#E1F5EE', color: '#0F6E56', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', border: '1px solid #b2dfdb' }}>{msg}</div>}
      {error && (
        <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', border: '1px solid #f5c2c2' }}>
          ⚠ {error}
          <button onClick={() => setError('')} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', color: '#A32D2D' }}>✕</button>
        </div>
      )}

      {/* نموذج الإضافة/التعديل */}
      {showForm && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #ddd', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
            {editingDept ? `تعديل: ${editingDept.name}` : 'إضافة قسم جديد'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>

              {/* اسم القسم */}
              <div>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  اسم القسم <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: تقنية المعلومات"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'rtl' }}
                />
              </div>

              {/* الوصف */}
              <div>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  وصف القسم
                </label>
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="وصف مختصر للقسم"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'rtl' }}
                />
              </div>

              {/* اللون */}
              <div>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  لون القسم
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <div
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid #333' : '2px solid transparent', transition: 'border 0.15s' }}
                    />
                  ))}
                </div>
              </div>

              {/* الأيقونة */}
              <div>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  أيقونة القسم
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {ICONS.map(icon => (
                    <div
                      key={icon}
                      onClick={() => setForm({ ...form, icon })}
                      style={{ width: '34px', height: '34px', borderRadius: '8px', background: form.icon === icon ? form.color + '30' : '#f5f5f5', border: form.icon === icon ? `2px solid ${form.color}` : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', transition: 'all 0.15s' }}
                    >
                      {icon}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* معلومات مدير القسم */}
            {!editingDept && (
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                  👤 بيانات مدير القسم (اختياري)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      اسم المدير
                    </label>
                    <input
                      value={form.managerName}
                      onChange={e => setForm({ ...form, managerName: e.target.value })}
                      placeholder="الاسم الكامل"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'rtl' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      value={form.managerEmail}
                      onChange={e => setForm({ ...form, managerEmail: e.target.value })}
                      placeholder="manager@company.com"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'ltr' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      كلمة المرور
                    </label>
                    <input
                      type="text"
                      value={form.managerPassword}
                      onChange={e => setForm({ ...form, managerPassword: e.target.value })}
                      placeholder="اتركها فارغة للتلقائية"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'ltr' }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
                  💡 إذا تركت هذه الحقول فارغة يمكنك إضافة مدير لاحقاً من صفحة المستخدمين
                </div>
              </div>
            )}

            {/* معاينة */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: form.color + '20', border: `2px solid ${form.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                {form.icon}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: form.color }}>{form.name || 'اسم القسم'}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>{form.description || 'وصف القسم'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>
                إلغاء
              </button>
              <button type="submit" disabled={saving} style={{ padding: '9px 24px', background: saving ? '#aaa' : '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {saving ? '⏳...' : editingDept ? '✓ حفظ التعديلات' : '✓ إنشاء القسم'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* قائمة الأقسام */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#aaa' }}>جارٍ التحميل...</div>
      ) : departments.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '12px', padding: '60px', textAlign: 'center', border: '1px solid #eee' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
          <div style={{ fontSize: '16px', fontWeight: '500', color: '#555', marginBottom: '8px' }}>
            لا توجد أقسام بعد
          </div>
          <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '16px' }}>
            أضف أول قسم في المنظمة
          </div>
          <button onClick={() => setShowForm(true)} style={{ padding: '10px 24px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
            + إضافة قسم
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {departments.map(dept => (
            <div
              key={dept._id}
              style={{ background: 'white', borderRadius: '14px', border: '1px solid #eee', overflow: 'hidden', transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              {/* رأس البطاقة */}
              <div style={{ background: dept.color + '15', padding: '16px', borderBottom: `3px solid ${dept.color}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: dept.color + '25', border: `2px solid ${dept.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                  {dept.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: dept.color }}>{dept.name}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {dept.description || 'لا يوجد وصف'}
                  </div>
                </div>
              </div>

              {/* معلومات البطاقة */}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: dept.color }}>
                      {dept.employeeCount || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888' }}>موظف</div>
                  </div>
                  <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dept.managerName || '—'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888' }}>المدير</div>
                  </div>
                </div>

                {dept.managerEmail && (
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px', direction: 'ltr', textAlign: 'right' }}>
                    📧 {dept.managerEmail}
                  </div>
                )}

                {/* الأزرار */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => openEdit(dept)}
                    style={{ flex: 1, padding: '7px', background: dept.color + '15', color: dept.color, border: `1px solid ${dept.color}40`, borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                  >
                    ✏ تعديل
                  </button>
                  <button
                    onClick={() => handleDelete(dept)}
                    style={{ flex: 1, padding: '7px', background: '#FCEBEB', color: '#A32D2D', border: '1px solid #f5c2c2', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                  >
                    🗑 حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}