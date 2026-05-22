import React, { useEffect, useState } from 'react';
import api from '../api';

const statusMap = { present: { label: 'حاضر', color: '#1D9E75', bg: '#E1F5EE' }, absent: { label: 'غائب', color: '#A32D2D', bg: '#FCEBEB' }, on_leave: { label: 'إجازة', color: '#BA7517', bg: '#FAEEDA' }, late: { label: 'متأخر', color: '#534AB7', bg: '#EEEDFE' } };

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});

  useEffect(() => {
    api.get('/attendance/today').then(res => { setRecords(res.data.records); setSummary(res.data.summary); }).catch(console.error);
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>سجل الحضور</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '20px' }}>
        {[['حاضر', summary.present || 0, '#1D9E75', '#E1F5EE'], ['غائب', summary.absent || 0, '#A32D2D', '#FCEBEB'], ['إجازة', summary.on_leave || 0, '#BA7517', '#FAEEDA'], ['متأخر', summary.late || 0, '#534AB7', '#EEEDFE']].map(([label, val, color, bg]) => (
          <div key={label} style={{ background: 'white', borderRadius: '12px', padding: '18px', border: '1px solid #eee', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color }}>{val}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '500' }}>حضور اليوم — {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead><tr style={{ background: '#fafafa' }}>{['الموظف', 'القسم', 'وقت الدخول', 'الحالة'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '500', color: '#666', borderBottom: '1px solid #eee' }}>{h}</th>)}</tr></thead>
          <tbody>
            {records.map(r => {
              const s = statusMap[r.status] || statusMap.present;
              return (
                <tr key={r._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#E1F5EE', color: '#085041', fontSize: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.employee?.name?.slice(0, 2)}</div>
                      {r.employee?.name}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#666' }}>{r.employee?.department}</td>
                  <td style={{ padding: '12px 14px', color: '#555' }}>{r.checkIn || '—'}</td>
                  <td style={{ padding: '12px 14px' }}><span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '500' }}>{s.label}</span></td>
                </tr>
              );
            })}
            {records.length === 0 && <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#aaa' }}>لا توجد سجلات لليوم</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}