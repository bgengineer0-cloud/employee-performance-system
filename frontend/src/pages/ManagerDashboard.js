import React, { useState, useEffect ,  useCallback } from 'react';
import api from '../api';

const statusMap = {
  pending: { label: 'قيد الانتظار', color: '#534AB7', bg: '#EEEDFE' },
  in_progress: { label: 'قيد التنفيذ', color: '#BA7517', bg: '#FAEEDA' },
  completed: { label: 'منجزة', color: '#1D9E75', bg: '#E1F5EE' },
  overdue: { label: 'متأخرة', color: '#A32D2D', bg: '#FCEBEB' },
  postponed: { label: 'مؤجلة', color: '#666', bg: '#f0f0f0' },
};

const empStatusMap = {
  active: { label: 'نشط', color: '#1D9E75', bg: '#E1F5EE' },
  absent: { label: 'غائب', color: '#A32D2D', bg: '#FCEBEB' },
  on_leave: { label: 'إجازة', color: '#BA7517', bg: '#FAEEDA' },
};

const emptyEmpForm = {
  name: '',
  email: '',
  position: '',
  phone: '',
  hireDate: new Date().toISOString().split('T')[0],
  status: 'active',
};

const emptyTaskForm = {
  title: '',
  description: '',
  assignedTo: '',
  priority: 'medium',
  dueDate: '',
  steps: [],
  managerNotes: '',
};

export default function ManagerDashboard() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [tab, setTab] = useState('overview');
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Employee form
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [empForm, setEmpForm] = useState(emptyEmpForm);
  const [empMsg, setEmpMsg] = useState('');
  const [empError, setEmpError] = useState('');
  const [savingEmp, setSavingEmp] = useState(false);

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [editingTask, setEditingTask] = useState(null);
  const [newStep, setNewStep] = useState('');
  const [taskMsg, setTaskMsg] = useState('');
  const [taskError, setTaskError] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  // Credentials popup
  const [newCredentials, setNewCredentials] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // جلب بيانات القسم
      const deptsRes = await api.get('/departments');
      const myDept = deptsRes.data.departments?.find(
        d => d.name === currentUser.department
      );
      setDepartment(myDept);

      // جلب موظفي القسم فقط
      const empsRes = await api.get('/employees/my-department');
      const deptEmployees = empsRes.data.employees || [];
      setEmployees(deptEmployees);

      // جلب مهام موظفي القسم
      const allTasks = [];
      for (const emp of deptEmployees) {
        try {
          const t = await api.get(`/tasks?assignedTo=${emp._id}`);
          allTasks.push(...(t.data.tasks || []));
        } catch {}
      }
      setTasks(allTasks);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.department]);



useEffect(() => {
  loadData();
}, [loadData]);

  // ── إضافة موظف ──────────────────────────────────
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!empForm.name.trim()) { setEmpError('الاسم مطلوب'); return; }
    if (!empForm.email.trim()) { setEmpError('البريد الإلكتروني مطلوب'); return; }
    if (!empForm.position.trim()) { setEmpError('المسمى الوظيفي مطلوب'); return; }

    setSavingEmp(true);
    setEmpError('');
    try {
      const res = await api.post('/employees/my-department', empForm);
      setNewCredentials(res.data.loginInfo);
      setEmpMsg(`✓ تم إضافة "${empForm.name}" إلى قسم ${currentUser.department}`);
      setEmpForm(emptyEmpForm);
      setShowEmpForm(false);
      loadData();
      setTimeout(() => setEmpMsg(''), 10000);
    } catch (err) {
      setEmpError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setSavingEmp(false);
    }
  };

  // ── إضافة / تعديل مهمة ─────────────────────────
  const addStep = () => {
    if (!newStep.trim()) return;
    setTaskForm(prev => ({
      ...prev,
      steps: [...prev.steps, {
        stepNumber: prev.steps.length + 1,
        description: newStep.trim(),
        isCompleted: false
      }]
    }));
    setNewStep('');
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) { setTaskError('عنوان المهمة مطلوب'); return; }
    if (!taskForm.assignedTo) { setTaskError('يرجى اختيار موظف من القسم'); return; }
    if (!taskForm.dueDate) { setTaskError('الموعد النهائي مطلوب'); return; }

    setSavingTask(true);
    setTaskError('');
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, taskForm);
        setTaskMsg('✓ تم تحديث المهمة');
      } else {
        await api.post('/tasks', taskForm);
        setTaskMsg('✓ تم إنشاء المهمة — ستظهر في صفحة الموظف تلقائياً');
      }
      setTaskForm(emptyTaskForm);
      setEditingTask(null);
      setShowTaskForm(false);
      loadData();
      setTimeout(() => setTaskMsg(''), 5000);
    } catch (err) {
      setTaskError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setSavingTask(false);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status });
      loadData();
    } catch {}
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('هل تريد حذف هذه المهمة؟')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTaskMsg('✓ تم حذف المهمة');
      loadData();
    } catch {}
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      assignedTo: task.assignedTo?._id || '',
      priority: task.priority || 'medium',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      steps: task.steps || [],
      managerNotes: task.managerNotes || '',
      status: task.status,
    });
    setShowTaskForm(true);
    setTaskError('');
  };

  // إحصائيات
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  //const overdueTasks = tasks.filter(t => t.status === 'overdue').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const deptColor = department?.color || '#1D9E75';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', flexDirection: 'column', gap: '12px' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid #f0f0f0', borderTop: `3px solid ${deptColor}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ color: '#888', fontSize: '13px' }}>جارٍ تحميل بيانات القسم...</div>
    </div>
  );

  return (
    <div style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif', direction: 'rtl' }}>

      {/* بطاقة الترحيب */}
      <div style={{
        background: `linear-gradient(135deg, ${deptColor}, ${deptColor}cc)`,
        borderRadius: '14px', padding: '20px 24px',
        marginBottom: '20px', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontSize: '40px' }}>{department?.icon || '🏢'}</div>
          <div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>مدير القسم</div>
            <div style={{ fontSize: '20px', fontWeight: '700' }}>{currentUser.name}</div>
            <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '2px' }}>
              قسم {currentUser.department}
            </div>
            {department?.description && (
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                {department.description}
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', opacity: 0.9 }}>{employees.length}</div>
          <div style={{ fontSize: '12px', opacity: 0.75 }}>موظف في القسم</div>
        </div>
      </div>

      {/* بيانات الدخول الجديدة */}
      {newCredentials && (
        <div style={{ background: '#E1F5EE', border: '1px solid #b2dfdb', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F6E56', marginBottom: '8px' }}>
            ✅ تم إنشاء حساب دخول للموظف — احفظ هذه البيانات:
          </div>
          <div style={{ display: 'flex', gap: '20px', fontSize: '13px', marginBottom: '8px' }}>
            <div>📧 <strong>البريد:</strong> <code style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: '4px' }}>{newCredentials.email}</code></div>
            <div>🔑 <strong>كلمة المرور:</strong> <code style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: '4px' }}>{newCredentials.password}</code></div>
          </div>
          <button onClick={() => setNewCredentials(null)} style={{ background: 'none', border: '1px solid #1D9E75', color: '#1D9E75', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
            فهمت — إغلاق
          </button>
        </div>
      )}

      {/* إحصائيات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'موظفو القسم', value: employees.length, color: deptColor, bg: deptColor + '15', icon: '👥' },
          { label: 'المهام الكلية', value: tasks.length, color: '#0C447C', bg: '#E6F1FB', icon: '📋' },
          { label: 'قيد التنفيذ', value: inProgressTasks, color: '#BA7517', bg: '#FAEEDA', icon: '⏳' },
          { label: 'المنجزة', value: completedTasks, color: '#1D9E75', bg: '#E1F5EE', icon: '✅' },
        ].map(card => (
          <div key={card.label} style={{ background: 'white', borderRadius: '12px', padding: '14px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: card.color }}>{card.value}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* تبويبات */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'white', padding: '4px', borderRadius: '10px', border: '1px solid #eee', width: 'fit-content' }}>
        {[
          ['overview', '📊 نظرة عامة'],
          ['employees', `👥 الموظفون (${employees.length})`],
          ['tasks', `📋 المهام (${tasks.length})`],
        ].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', background: tab === val ? deptColor : 'transparent', color: tab === val ? 'white' : '#666', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ تبويب نظرة عامة ══ */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

          {/* حالة المهام */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '18px', border: '1px solid #eee' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '16px', color: '#222' }}>حالة مهام القسم</h3>
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#aaa', padding: '20px', fontSize: '13px' }}>لا توجد مهام بعد</div>
            ) : (
              Object.entries(statusMap).map(([key, s]) => {
                const count = tasks.filter(t => t.status === key).length;
                const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0;
                return (
                  <div key={key} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                      <span style={{ color: '#444' }}>{s.label}</span>
                      <span style={{ color: s.color, fontWeight: '600' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '7px', background: '#f0f0f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: s.color, borderRadius: '999px', transition: 'width 0.4s' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* أداء الموظفين */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '18px', border: '1px solid #eee' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '16px', color: '#222' }}>أداء موظفي القسم</h3>
            {employees.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#aaa', padding: '20px', fontSize: '13px' }}>لا يوجد موظفون بعد</div>
            ) : (
              employees.map(emp => {
                const empTasks = tasks.filter(t =>
                  t.assignedTo?._id === emp._id ||
                  t.assignedTo === emp._id
                );
                const done = empTasks.filter(t => t.status === 'completed').length;
                const rate = empTasks.length > 0 ? Math.round((done / empTasks.length) * 100) : 0;
                return (
                  <div key={emp._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: deptColor + '20', color: deptColor, fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {emp.name?.slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '500' }}>{emp.name}</span>
                        <span style={{ color: deptColor, fontWeight: '600' }}>{rate}%</span>
                      </div>
                      <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${rate}%`, height: '100%', background: rate >= 70 ? deptColor : '#EF9F27', borderRadius: '999px', transition: 'width 0.4s' }} />
                      </div>
                      <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>
                        {empTasks.length} مهمة — {done} منجزة
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ══ تبويب الموظفون ══ */}
      {tab === 'employees' && (
        <div>
          {/* Alerts */}
          {empMsg && <div style={{ background: '#E1F5EE', color: '#0F6E56', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', border: '1px solid #b2dfdb', lineHeight: '1.7' }}>{empMsg}</div>}
          {empError && <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', border: '1px solid #f5c2c2' }}>⚠ {empError} <button onClick={() => setEmpError('')} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', color: '#A32D2D' }}>✕</button></div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', color: '#888' }}>
              موظفو قسم <strong style={{ color: deptColor }}>{currentUser.department}</strong> فقط
            </div>
            <button
              onClick={() => { setShowEmpForm(!showEmpForm); setEmpError(''); }}
              style={{ padding: '9px 18px', background: deptColor, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
            >
              {showEmpForm ? '✕ إغلاق' : '+ إضافة موظف للقسم'}
            </button>
          </div>

          {/* نموذج إضافة موظف */}
          {showEmpForm && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: `1px solid ${deptColor}40`, marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>

              {/* تنبيه القسم التلقائي */}
              <div style={{ background: deptColor + '15', border: `1px solid ${deptColor}40`, borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: deptColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>{department?.icon || '🏢'}</span>
                <span>سيتم إضافة الموظف تلقائياً إلى قسم <strong>{currentUser.department}</strong></span>
              </div>

              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px' }}>بيانات الموظف الجديد</h3>

              <form onSubmit={handleAddEmployee}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                  <div>
                    <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      الاسم الكامل <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      value={empForm.name}
                      onChange={e => setEmpForm({ ...empForm, name: e.target.value })}
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
                      value={empForm.email}
                      onChange={e => setEmpForm({ ...empForm, email: e.target.value })}
                      placeholder="sara@company.com"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'ltr' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      المسمى الوظيفي <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      value={empForm.position}
                      onChange={e => setEmpForm({ ...empForm, position: e.target.value })}
                      placeholder="مثال: مطور برمجيات"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'rtl' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      رقم الهاتف
                    </label>
                    <input
                      value={empForm.phone}
                      onChange={e => setEmpForm({ ...empForm, phone: e.target.value })}
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
                      value={empForm.hireDate}
                      onChange={e => setEmpForm({ ...empForm, hireDate: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      الحالة
                    </label>
                    <select
                      value={empForm.status}
                      onChange={e => setEmpForm({ ...empForm, status: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px' }}
                    >
                      <option value="active">نشط</option>
                      <option value="absent">غائب</option>
                      <option value="on_leave">إجازة</option>
                    </select>
                  </div>

                </div>

                {/* معاينة كلمة المرور */}
                {empForm.name && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', background: deptColor + '10', borderRadius: '8px', fontSize: '12px', color: deptColor, border: `1px solid ${deptColor}30` }}>
                    🔑 كلمة المرور الافتراضية: <strong>{empForm.name.replace(/\s+/g, '').slice(0, 6) + '123'}</strong>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f0f0f0' }}>
                  <button
                    type="button"
                    onClick={() => { setShowEmpForm(false); setEmpForm(emptyEmpForm); setEmpError(''); }}
                    style={{ padding: '9px 18px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px' }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={savingEmp}
                    style={{ padding: '9px 22px', background: savingEmp ? '#aaa' : deptColor, color: 'white', border: 'none', borderRadius: '8px', cursor: savingEmp ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500' }}
                  >
                    {savingEmp ? '⏳ جارٍ الحفظ...' : '✓ إضافة للقسم'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* جدول الموظفين */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
            {employees.length === 0 ? (
              <div style={{ padding: '50px', textAlign: 'center', color: '#aaa' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#888' }}>لا يوجد موظفون في القسم بعد</div>
                <div style={{ fontSize: '12px', marginTop: '6px' }}>اضغط "إضافة موظف للقسم" لإضافة أول موظف</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    {['الموظف', 'المسمى الوظيفي', 'الحالة', 'المهام', 'معدل الإنجاز'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'right', fontWeight: '500', color: '#666', borderBottom: '1px solid #eee', fontSize: '12px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => {
                    const empTasks = tasks.filter(t =>
                      t.assignedTo?._id === emp._id ||
                      t.assignedTo === emp._id
                    );
                    const done = empTasks.filter(t => t.status === 'completed').length;
                    const rate = empTasks.length > 0 ? Math.round((done / empTasks.length) * 100) : 0;
                    const s = empStatusMap[emp.status] || empStatusMap.active;
                    return (
                      <tr key={emp._id} style={{ borderBottom: '1px solid #f5f5f5' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: deptColor + '20', color: deptColor, fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {emp.name?.slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontWeight: '500' }}>{emp.name}</div>
                              <div style={{ fontSize: '11px', color: '#888', direction: 'ltr' }}>{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#555' }}>{emp.position}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '500' }}>
                            ● {s.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#555', fontSize: '12px' }}>
                          {empTasks.length} مهمة
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '80px', height: '6px', background: '#f0f0f0', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ width: `${rate}%`, height: '100%', background: rate >= 70 ? deptColor : '#EF9F27', borderRadius: '999px' }} />
                            </div>
                            <span style={{ fontSize: '12px', color: '#555' }}>{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══ تبويب المهام ══ */}
      {tab === 'tasks' && (
        <div>
          {/* Alerts */}
          {taskMsg && <div style={{ background: '#E1F5EE', color: '#0F6E56', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', border: '1px solid #b2dfdb' }}>{taskMsg}</div>}
          {taskError && <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', border: '1px solid #f5c2c2' }}>⚠ {taskError} <button onClick={() => setTaskError('')} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', color: '#A32D2D' }}>✕</button></div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', color: '#888' }}>
              مهام موظفي قسم <strong style={{ color: deptColor }}>{currentUser.department}</strong>
            </div>
            <button
              onClick={() => {
                if (employees.length === 0) {
                  setTaskError('يجب إضافة موظفين للقسم أولاً');
                  return;
                }
                setShowTaskForm(!showTaskForm);
                setEditingTask(null);
                setTaskForm(emptyTaskForm);
                setTaskError('');
              }}
              style={{ padding: '9px 18px', background: deptColor, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
            >
              {showTaskForm ? '✕ إغلاق' : '+ مهمة جديدة'}
            </button>
          </div>

          {/* نموذج المهمة */}
          {showTaskForm && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: `1px solid ${deptColor}40`, marginBottom: '14px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
                {editingTask ? `تعديل: ${editingTask.title}` : 'إضافة مهمة جديدة'}
              </h3>
              <form onSubmit={handleSaveTask}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>

                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>عنوان المهمة *</label>
                    <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="أدخل عنوان المهمة" style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'rtl' }} />
                  </div>

                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>الوصف</label>
                    <textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="تفاصيل المهمة..." style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', minHeight: '70px', resize: 'vertical', direction: 'rtl' }} />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      الموظف المكلف * <span style={{ color: deptColor, fontSize: '11px' }}>(من قسمك فقط)</span>
                    </label>
                    <select value={taskForm.assignedTo} onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px' }}>
                      <option value="">اختر موظفاً</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name} — {emp.position}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>الأولوية</label>
                    <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px' }}>
                      <option value="low">🟢 منخفضة</option>
                      <option value="medium">🟡 متوسطة</option>
                      <option value="high">🟠 عالية</option>
                      <option value="critical">🔴 حرجة</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>الموعد النهائي *</label>
                    <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                  </div>

                  {editingTask && (
                    <div>
                      <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>الحالة</label>
                      <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px' }}>
                        <option value="pending">قيد الانتظار</option>
                        <option value="in_progress">قيد التنفيذ</option>
                        <option value="completed">منجزة</option>
                        <option value="postponed">مؤجلة</option>
                      </select>
                    </div>
                  )}

                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>ملاحظات للموظف</label>
                    <input value={taskForm.managerNotes} onChange={e => setTaskForm({ ...taskForm, managerNotes: e.target.value })} placeholder="ملاحظات إضافية تظهر للموظف..." style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'rtl' }} />
                  </div>

                  {/* خطوات المهمة */}
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '6px', fontWeight: '500' }}>خطوات المهمة</label>
                    {taskForm.steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: deptColor + '20', color: deptColor, fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, padding: '7px 10px', background: '#f9f9f9', borderRadius: '6px', fontSize: '13px' }}>{step.description}</div>
                        <button type="button" onClick={() => setTaskForm(prev => ({ ...prev, steps: prev.steps.filter((_, j) => j !== i) }))} style={{ background: '#FCEBEB', color: '#A32D2D', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <input value={newStep} onChange={e => setNewStep(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStep())} placeholder="اكتب خطوة واضغط Enter أو إضافة..." style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'rtl' }} />
                      <button type="button" onClick={addStep} style={{ padding: '8px 14px', background: deptColor + '20', color: deptColor, border: `1px solid ${deptColor}40`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>+ إضافة</button>
                    </div>
                  </div>

                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '14px', borderTop: '1px solid #f0f0f0' }}>
                  <button type="button" onClick={() => { setShowTaskForm(false); setEditingTask(null); setTaskError(''); }} style={{ padding: '9px 18px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>إلغاء</button>
                  <button type="submit" disabled={savingTask} style={{ padding: '9px 22px', background: savingTask ? '#aaa' : deptColor, color: 'white', border: 'none', borderRadius: '8px', cursor: savingTask ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500' }}>
                    {savingTask ? '⏳...' : editingTask ? '✓ حفظ التعديلات' : '✓ إنشاء المهمة'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* قائمة المهام */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tasks.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', border: '1px solid #eee' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                <div style={{ color: '#888', fontSize: '14px' }}>لا توجد مهام في القسم بعد</div>
              </div>
            ) : tasks.map(task => {
              const s = statusMap[task.status] || statusMap.pending;
              const stepsTotal = task.steps?.length || 0;
              const stepsDone = task.steps?.filter(s => s.isCompleted).length || 0;
              const progress = stepsTotal > 0 ? Math.round((stepsDone / stepsTotal) * 100) : task.status === 'completed' ? 100 : 0;

              return (
                <div key={task._id} style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #eee' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1, paddingLeft: '10px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{task.title}</div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                        👤 {task.assignedTo?.name || '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                      <select
                        value={task.status}
                        onChange={e => handleStatusChange(task._id, e.target.value)}
                        style={{ padding: '4px 8px', border: `1px solid ${s.color}`, borderRadius: '6px', fontSize: '11px', color: s.color, background: s.bg, cursor: 'pointer', fontWeight: '500' }}
                      >
                        <option value="pending">قيد الانتظار</option>
                        <option value="in_progress">قيد التنفيذ</option>
                        <option value="completed">منجزة</option>
                        <option value="postponed">مؤجلة</option>
                        <option value="overdue">متأخرة</option>
                      </select>
                      <button onClick={() => openEditTask(task)} style={{ padding: '4px 10px', background: deptColor + '15', color: deptColor, border: `1px solid ${deptColor}40`, borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500' }}>✏</button>
                      <button onClick={() => handleDeleteTask(task._id)} style={{ padding: '4px 10px', background: '#FCEBEB', color: '#A32D2D', border: '1px solid #f5c2c2', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>🗑</button>
                    </div>
                  </div>

                  {task.description && <div style={{ fontSize: '12px', color: '#777', marginBottom: '8px' }}>{task.description}</div>}

                  {stepsTotal > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                        <span>{stepsDone}/{stepsTotal} خطوات</span>
                        <span style={{ color: deptColor, fontWeight: '600' }}>{progress}%</span>
                      </div>
                      <div style={{ height: '5px', background: '#f0f0f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: deptColor, borderRadius: '999px' }} />
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
                    <span>📅 {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ar-SA') : '—'}</span>
                    {task.managerNotes && <span style={{ color: '#BA7517' }}>📝 {task.managerNotes}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}