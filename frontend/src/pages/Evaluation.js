import React, { useEffect, useState } from 'react';
import api from '../api';

const Stars = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: '4px' }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} onClick={() => onChange && onChange(i)} style={{ fontSize: '22px', cursor: onChange ? 'pointer' : 'default', color: i <= value ? '#EF9F27' : '#ddd' }}>★</span>
    ))}
  </div>
);

export default function Evaluation() {
  const [evaluations, setEvaluations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employee: '', qualityScore: 0, timeScore: 0, teamworkScore: 0, notes: '', period: 'Q2-2026' });
  const [msg, setMsg] = useState('');

  const load = () => {
    api.get('/evaluations').then(res => setEvaluations(res.data.evaluations)).catch(console.error);
    api.get('/employees').then(res => setEmployees(res.data.employees)).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.qualityScore || !form.timeScore || !form.teamworkScore) { setMsg('يرجى إكمال جميع التقييمات'); return; }
    try {
      await api.post('/evaluations', form);
      setMsg('تم حفظ التقييم بنجاح ✓');
      setForm({ employee: '', qualityScore: 0, timeScore: 0, teamworkScore: 0, notes: '', period: 'Q2-2026' });
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'حدث خطأ');
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>التقييمات</h1>
      {msg && <div style={{ background: '#E1F5EE', color: '#0F6E56', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>{msg}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #eee' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '16px' }}>تقييم جديد</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>الموظف</label>
              <select value={form.employee} onChange={e => setForm({ ...form, employee: e.target.value })} required style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px' }}>
                <option value="">اختر موظفاً</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>
            {[['qualityScore', 'جودة الإنجاز'], ['timeScore', 'الالتزام بالوقت'], ['teamworkScore', 'التعاون مع الفريق']].map(([key, label]) => (
              <div key={key}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>{label}</label>
                <Stars value={form[key]} onChange={val => setForm({ ...form, [key]: val })} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>ملاحظات</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', minHeight: '80px', resize: 'vertical' }} placeholder="أضف ملاحظاتك..." />
            </div>
            <button type="submit" style={{ padding: '10px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>حفظ التقييم</button>
          </form>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}><h3 style={{ fontSize: '14px', fontWeight: '500' }}>سجل التقييمات</h3></div>
          <div style={{ overflow: 'auto', maxHeight: '460px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr style={{ background: '#fafafa' }}>{['الموظف', 'الفترة', 'التقييم الكلي', 'الملاحظات'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '500', color: '#666', borderBottom: '1px solid #eee' }}>{h}</th>)}</tr></thead>
              <tbody>
                {evaluations.map(ev => (
                  <tr key={ev._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '12px 14px' }}>{ev.employee?.name || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#888' }}>{ev.period}</td>
                    <td style={{ padding: '12px 14px' }}><Stars value={Math.round(ev.overallScore)} /></td>
                    <td style={{ padding: '12px 14px', color: '#666', fontSize: '12px' }}>{ev.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}