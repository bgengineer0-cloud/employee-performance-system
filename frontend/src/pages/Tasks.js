import React, { useEffect, useState } from 'react';
import api from '../api';

const statusMap = {
  pending: { label: 'قيد الانتظار', color: '#534AB7', bg: '#EEEDFE' },
  in_progress: { label: 'قيد التنفيذ', color: '#BA7517', bg: '#FAEEDA' },
  completed: { label: 'منجزة', color: '#1D9E75', bg: '#E1F5EE' },
  overdue: { label: 'متأخرة', color: '#A32D2D', bg: '#FCEBEB' },
  postponed: { label: 'مؤجلة', color: '#666', bg: '#f0f0f0' }
};

const priorityMap = {
  low: { label: 'منخفضة', color: '#888' },
  medium: { label: 'متوسطة', color: '#BA7517' },
  high: { label: 'عالية', color: '#E24B4A' },
  critical: { label: 'حرجة', color: '#791F1F' }
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
    steps: []
  });
  const [newStep, setNewStep] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/tasks')
      .then(res => setTasks(res.data.tasks || []))
      .catch(console.error);
    api.get('/employees')
      .then(res => setEmployees(res.data.employees || []))
      .catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all'
    ? tasks
    : tasks.filter(t => t.status === filter);

  const openEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      assignedTo: task.assignedTo?._id || '',
      priority: task.priority || 'medium',
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split('T')[0]
        : '',
      steps: task.steps || [],
      status: task.status,
      managerNotes: task.managerNotes || '',
    });
    setError('');
  };

  const addStep = () => {
    if (!newStep.trim()) return;
    setForm(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          stepNumber: prev.steps.length + 1,
          description: newStep.trim(),
          isCompleted: false
        }
      ]
    }));
    setNewStep('');
  };

  const removeStep = (index) => {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, stepNumber: i + 1 }))
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('عنوان المهمة مطلوب'); return; }
    if (!form.assignedTo) { setError('يرجى اختيار موظف'); return; }
    if (!form.dueDate) { setError('الموعد النهائي مطلوب'); return; }

    setSaving(true);
    setError('');
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, form);
        setMsg('✓ تم تحديث المهمة بنجاح');
      } else {
        await api.post('/tasks', form);
        setMsg('✓ تم إنشاء المهمة بنجاح — ستظهر في صفحة الموظف تلقائياً');
      }
      setShowForm(false);
      setEditingTask(null);
      setForm({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '', steps: [] });
      load();
      setTimeout(() => setMsg(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      setMsg(`✓ تم تغيير الحالة إلى: ${statusMap[newStatus]?.label}`);
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setError('فشل تغيير الحالة');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل تريد حذف هذه المهمة؟')) return;
    try {
      await api.delete(`/tasks/${id}`);
      setMsg('✓ تم حذف المهمة');
      load();
    } catch (err) {
      setError('فشل الحذف');
    }
  };

  const counts = {
    all: tasks.length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    postponed: tasks.filter(t => t.status === 'postponed').length,
  };

  return (
    <div style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif', direction: 'rtl' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>المهام</h1>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
            إجمالي {tasks.length} مهمة
          </div>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingTask(null);
            setForm({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '', steps: [] });
            setError('');
          }}
          style={{ padding: '9px 18px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
        >
          {showForm ? '✕ إغلاق' : '+ مهمة جديدة'}
        </button>
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
          <button onClick={() => setError('')} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700' }}>✕</button>
        </div>
      )}

      {/* Form إضافة/تعديل */}
      {(showForm || editingTask) && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #ddd', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
            {editingTask ? `تعديل: ${editingTask.title}` : 'إضافة مهمة جديدة'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>

              {/* العنوان */}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  عنوان المهمة <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="أدخل عنوان المهمة"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'rtl' }}
                />
              </div>

              {/* الوصف */}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  وصف المهمة
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="تفاصيل المهمة..."
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', minHeight: '70px', resize: 'vertical', direction: 'rtl' }}
                />
              </div>

              {/* الموظف */}
              <div>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  تكليف الموظف <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={form.assignedTo}
                  onChange={e => setForm({ ...form, assignedTo: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', direction: 'rtl' }}
                >
                  <option value="">اختر موظفاً</option>
                  {employees.map(e => (
                    <option key={e._id} value={e._id}>
                      {e.name} — {e.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* الأولوية */}
              <div>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  الأولوية
                </label>
                <select
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px' }}
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                  <option value="critical">حرجة</option>
                </select>
              </div>

              {/* الموعد */}
              <div>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  الموعد النهائي <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm({ ...form, dueDate: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>

              {/* الحالة — عند التعديل فقط */}
              {editingTask && (
                <div>
                  <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    الحالة
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px' }}
                  >
                    <option value="pending">قيد الانتظار</option>
                    <option value="in_progress">قيد التنفيذ</option>
                    <option value="completed">منجزة</option>
                    <option value="postponed">مؤجلة</option>
                  </select>
                </div>
              )}

              {/* ملاحظات المدير */}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  ملاحظات المدير
                </label>
                <textarea
                  value={form.managerNotes || ''}
                  onChange={e => setForm({ ...form, managerNotes: e.target.value })}
                  placeholder="ملاحظات إضافية للموظف..."
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', minHeight: '60px', resize: 'vertical', direction: 'rtl' }}
                />
              </div>

              {/* الخطوات */}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  خطوات المهمة
                </label>
                {form.steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#E1F5EE', color: '#0F6E56', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, padding: '7px 10px', background: '#f9f9f9', borderRadius: '6px', fontSize: '13px' }}>
                      {step.description}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      style={{ background: '#FCEBEB', color: '#A32D2D', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    value={newStep}
                    onChange={e => setNewStep(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStep())}
                    placeholder="أضف خطوة جديدة..."
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', direction: 'rtl' }}
                  />
                  <button
                    type="button"
                    onClick={addStep}
                    style={{ padding: '8px 16px', background: '#EEEDFE', color: '#534AB7', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                  >
                    + إضافة
                  </button>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '14px', borderTop: '1px solid #f0f0f0' }}>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingTask(null); setError(''); }}
                style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px' }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '9px 24px', background: saving ? '#aaa' : '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500' }}
              >
                {saving ? '⏳...' : editingTask ? '✓ حفظ التعديلات' : '✓ إنشاء المهمة'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          ['all', 'الكل'],
          ['pending', 'قيد الانتظار'],
          ['in_progress', 'قيد التنفيذ'],
          ['completed', 'منجزة'],
          ['overdue', 'متأخرة'],
          ['postponed', 'مؤجلة'],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            style={{
              padding: '7px 14px', borderRadius: '8px',
              border: '1px solid',
              borderColor: filter === val ? '#1D9E75' : '#ddd',
              background: filter === val ? '#1D9E75' : 'white',
              color: filter === val ? 'white' : '#555',
              cursor: 'pointer', fontSize: '12px', fontWeight: '500'
            }}
          >
            {label}
            <span style={{ marginRight: '6px', background: filter === val ? 'rgba(255,255,255,0.25)' : '#f0f0f0', color: filter === val ? 'white' : '#888', fontSize: '10px', padding: '1px 6px', borderRadius: '999px' }}>
              {counts[val]}
            </span>
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(task => {
          const s = statusMap[task.status] || statusMap.pending;
          const p = priorityMap[task.priority] || priorityMap.medium;
          const stepsTotal = task.steps?.length || 0;
          const stepsDone = task.steps?.filter(s => s.isCompleted).length || 0;
          const progress = stepsTotal > 0
            ? Math.round((stepsDone / stepsTotal) * 100)
            : task.status === 'completed' ? 100 : 0;

          return (
            <div
              key={task._id}
              style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #eee', transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              {/* رأس المهمة */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#222' }}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '3px', lineHeight: '1.5' }}>
                      {task.description}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginRight: '12px', flexShrink: 0 }}>
                  <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '500' }}>
                    {s.label}
                  </span>
                  <span style={{ fontSize: '11px', color: p.color, fontWeight: '500' }}>
                    {p.label}
                  </span>
                </div>
              </div>

              {/* شريط التقدم */}
              {stepsTotal > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                    <span>التقدم: {stepsDone}/{stepsTotal} خطوات</span>
                    <span>{progress}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#1D9E75' : '#534AB7', borderRadius: '999px', transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}

              {/* الخطوات */}
              {task.steps?.length > 0 && (
                <div style={{ marginBottom: '10px', padding: '10px', background: '#fafafa', borderRadius: '8px' }}>
                  {task.steps.map((step, i) => (
                    <div key={step._id || i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: i < task.steps.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: step.isCompleted ? '#1D9E75' : '#eee', color: step.isCompleted ? 'white' : '#999', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: '600' }}>
                        {step.isCompleted ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: '12px', color: step.isCompleted ? '#aaa' : '#444', textDecoration: step.isCompleted ? 'line-through' : 'none', flex: 1 }}>
                        {step.description}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ملاحظات المدير */}
              {task.managerNotes && (
                <div style={{ marginBottom: '10px', padding: '8px 12px', background: '#FAEEDA', borderRadius: '8px', fontSize: '12px', color: '#633806' }}>
                  <strong>ملاحظة المدير:</strong> {task.managerNotes}
                </div>
              )}

              {/* معلومات المهمة */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#888', paddingTop: '10px', borderTop: '1px solid #f5f5f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#E1F5EE', color: '#085041', fontSize: '9px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {task.assignedTo?.name?.slice(0, 2)}
                  </div>
                  <span>{task.assignedTo?.name || '—'}</span>
                </div>
                <span style={{ color: task.status === 'overdue' ? '#A32D2D' : '#888' }}>
                  📅 {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ar-SA') : '—'}
                </span>
              </div>

              {/* أزرار الإجراءات */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f5f5f5', flexWrap: 'wrap' }}>
                {/* تغيير الحالة */}
                <select
                  value={task.status}
                  onChange={e => handleStatusChange(task._id, e.target.value)}
                  style={{ padding: '5px 10px', border: `1px solid ${s.color}`, borderRadius: '6px', fontSize: '11px', color: s.color, background: s.bg, cursor: 'pointer', fontWeight: '500' }}
                >
                  <option value="pending">قيد الانتظار</option>
                  <option value="in_progress">قيد التنفيذ</option>
                  <option value="completed">منجزة</option>
                  <option value="postponed">مؤجلة</option>
                  <option value="overdue">متأخرة</option>
                </select>

                <button
                  onClick={() => { openEdit(task); setShowForm(true); }}
                  style={{ padding: '5px 12px', background: '#EEEDFE', color: '#534AB7', border: '1px solid #d5d3f5', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500' }}
                >
                  ✏ تعديل
                </button>

                <button
                  onClick={() => handleDelete(task._id)}
                  style={{ padding: '5px 12px', background: '#FCEBEB', color: '#A32D2D', border: '1px solid #f5c2c2', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500' }}
                >
                  🗑 حذف
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', border: '1px solid #eee' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <div style={{ color: '#888', fontSize: '14px' }}>
              {filter === 'all' ? 'لا توجد مهام بعد' : `لا توجد مهام ${statusMap[filter]?.label}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}