import React, { useEffect, useState } from 'react';
import api from '../api';

const statusMap = {
  active: { label: 'نشط', color: '#1D9E75', bg: '#E1F5EE' },
  absent: { label: 'غائب', color: '#A32D2D', bg: '#FCEBEB' },
  on_leave: { label: 'إجازة', color: '#BA7517', bg: '#FAEEDA' },
  terminated: { label: 'منتهي', color: '#666', bg: '#f0f0f0' }
};

const emptyForm = {
  name: '',
  email: '',
  department: '',
  position: '',
  phone: '',
  hireDate: new Date().toISOString().split('T')[0],
  status: 'active'
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/employees'),
      api.get('/departments')
    ]).then(([empRes, deptRes]) => {
      setEmployees(empRes.data.employees || []);
      setDepartments(deptRes.data.departments || []);
    }).catch(() => setError('فشل تحميل البيانات'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = employees.filter(e => {
    const matchSearch =
      e.name?.includes(search) ||
      e.employeeId?.includes(search) ||
      e.position?.includes(search);
    const matchDept = deptFilter === '' || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMsg('');

    if (!form.name.trim()) { setError('الاسم مطلوب'); setSaving(false); return; }
    if (!form.email.trim()) { setError('البريد الإلكتروني مطلوب'); setSaving(false); return; }
    if (!form.department) { setError('يرجى اختيار القسم'); setSaving(false); return; }
    if (!form.position.trim()) { setError('المسمى الوظيفي مطلوب'); setSaving(false); return; }
    if (!form.hireDate) { setError('تاريخ التعيين مطلوب'); setSaving(false); return; }

    try {
      const res = await api.post('/employees', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        department: form.department,
        position: form.position.trim(),
        phone: form.phone.trim(),
        hireDate: form.hireDate,
        status: form.status,
      });

      const { loginInfo } = res.data;
      setMsg(
        `✓ تم إضافة "${form.name}" — بيانات الدخول: ${loginInfo.email} / ${loginInfo.password}`
      );
      setForm({ ...emptyForm, department: form.department });
      setShowForm(false);
      load();
      setTimeout(() => setMsg(''), 15000);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

 /* const handleDelete = async (id, name) => {
    if (!window.confirm(`هل تريد إنهاء خدمة "${name}"؟`)) return;
    try {
      await api.delete(`/employees/${id}`);
      setMsg(`تم إنهاء خدمة ${name}`);
      load();
    } catch (err) {
      setError('فشل الحذف');
    }
  };*/
  const handleDelete = async (id, name, email) => {
  if (!window.confirm(`⚠ هل تريد حذف "${name}" نهائياً؟\n\nسيتم حذف بريده (${email}) وحسابه وجميع بياناته نهائياً، ويمكن استخدام نفس البريد لموظف آخر لاحقاً.`)) return;
  try {
    const res = await api.delete(`/employees/${id}`);
    setMsg(`✓ ${res.data.message}`);
    load();
    setTimeout(() => setMsg(''), 5000);
  } catch (err) {
    setError(err.response?.data?.message || 'فشل الحذف');
  }
};

  return (
    <div style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif', direction: 'rtl' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>الموظفون</h1>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
            إجمالي: {employees.length} موظف
          </div>
        </div>
        <button
          onClick={() => {
            if (departments.length === 0) {
              setError('يرجى إضافة قسم أولاً من صفحة الأقسام');
              return;
            }
            setShowForm(!showForm);
            setError('');
          }}
          style={{ padding: '9px 18px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
        >
          {showForm ? '✕ إغلاق' : '+ موظف جديد'}
        </button>
      </div>

      {/* تنبيه إذا لم توجد أقسام */}
      {departments.length === 0 && !loading && (
        <div style={{ background: '#FAEEDA', border: '1px solid #f0d9a0', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px', fontSize: '13px', color: '#633806', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>⚠</span>
          <div>
            <strong>لا توجد أقسام بعد.</strong> يجب إضافة قسم أولاً قبل إضافة موظفين.
            <a href="/departments" style={{ color: '#534AB7', marginRight: '8px', fontWeight: '500' }}>
              اذهب إلى صفحة الأقسام ←
            </a>
          </div>
        </div>
      )}

      {/* Alerts */}
      {msg && (
        <div style={{ background: '#E1F5EE', color: '#0F6E56', padding: '12px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', border: '1px solid #b2dfdb', lineHeight: '1.6' }}>
          {msg}
        </div>
      )}
      {error && (
        <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', border: '1px solid #f5c2c2' }}>
          ⚠ {error}
          <button onClick={() => setError('')} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', color: '#A32D2D' }}>✕</button>
        </div>
      )}

      {/* نموذج الإضافة */}
      {showForm && departments.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #ddd', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
            إضافة موظف جديد
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

              <div>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  الاسم الكامل <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: سارة أحمد"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'rtl' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  البريد الإلكتروني <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="sara@company.com"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'ltr' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  القسم <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', direction: 'rtl' }}
                >
                  <option value="">اختر القسم</option>
                  {departments.map(d => (
                    <option key={d._id} value={d.name}>
                      {d.icon} {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  المسمى الوظيفي <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  value={form.position}
                  onChange={e => setForm({ ...form, position: e.target.value })}
                  placeholder="مثال: مطور برمجيات"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'rtl' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  رقم الهاتف
                </label>
                <input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="+966501234567"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'ltr' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  تاريخ التعيين <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="date"
                  value={form.hireDate}
                  onChange={e => setForm({ ...form, hireDate: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  الحالة
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px' }}
                >
                  <option value="active">نشط</option>
                  <option value="absent">غائب</option>
                  <option value="on_leave">إجازة</option>
                </select>
              </div>

            </div>

            {/* معاينة بيانات الدخول */}
            {form.name && (
              <div style={{ marginTop: '12px', padding: '10px 14px', background: '#E1F5EE', borderRadius: '8px', fontSize: '12px', color: '#0F6E56' }}>
                🔑 كلمة المرور الافتراضية ستكون: <strong>{form.name.replace(/\s+/g, '').slice(0, 6) + '123'}</strong>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(emptyForm); setError(''); }}
                style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px' }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '9px 24px', background: saving ? '#aaa' : '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500' }}
              >
                {saving ? '⏳ جارٍ الحفظ...' : '✓ إضافة الموظف'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* فلاتر */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
        <input
          placeholder="🔍 ابحث بالاسم أو الرقم الوظيفي..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
        />
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', minWidth: '180px' }}
        >
          <option value="">جميع الأقسام</option>
          {departments.map(d => (
            <option key={d._id} value={d.name}>{d.icon} {d.name}</option>
          ))}
        </select>
      </div>

      {/* الجدول */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>جارٍ التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>
              {employees.length === 0 ? 'لا يوجد موظفون بعد' : 'لا توجد نتائج للبحث'}
            </div>
            {employees.length === 0 && departments.length > 0 && (
              <div style={{ fontSize: '12px', color: '#bbb', marginTop: '6px' }}>
                اضغط "موظف جديد" لإضافة أول موظف
              </div>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['الموظف', 'الرقم الوظيفي', 'القسم', 'الوظيفة', 'الحالة', 'معدل الإنجاز', 'إجراءات'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'right', fontWeight: '500', color: '#666', borderBottom: '1px solid #eee', fontSize: '12px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => {
                const s = statusMap[emp.status] || statusMap.active;
                const dept = departments.find(d => d.name === emp.department);
                return (
                  <tr key={emp._id} style={{ borderBottom: '1px solid #f5f5f5' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: (dept?.color || '#1D9E75') + '20', color: dept?.color || '#085041', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {emp.name?.slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500' }}>{emp.name}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#888', fontFamily: 'monospace' }}>
                      {emp.employeeId}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: (dept?.color || '#888') + '15', color: dept?.color || '#888', padding: '3px 10px', borderRadius: '6px', fontSize: '12px' }}>
                        {dept?.icon} {emp.department}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#555' }}>{emp.position}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '500' }}>
                        ● {s.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '80px', height: '6px', background: '#f0f0f0', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: `${emp.taskCompletionRate || 0}%`, height: '100%', background: (emp.taskCompletionRate || 0) >= 80 ? '#1D9E75' : (emp.taskCompletionRate || 0) >= 50 ? '#EF9F27' : '#E24B4A', borderRadius: '999px' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: '#555' }}>{emp.taskCompletionRate || 0}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                    <button onClick={() => handleDelete(emp._id, emp.name, emp.email)} style={{ padding: '4px 10px', background: '#FCEBEB', color: '#A32D2D', border: '1px solid #f5c2c2', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
  🗑 حذف نهائي
</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}