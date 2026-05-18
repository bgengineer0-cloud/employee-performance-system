import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Reports() {
  const [report, setReport] = useState([]);

  useEffect(() => {
    api.get('/reports/department-performance').then(res => setReport(res.data.report)).catch(console.error);
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>التقارير</h1>
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '500' }}>أداء الأقسام</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead><tr style={{ background: '#fafafa' }}>{['القسم', 'الموظفون', 'المهام الكلية', 'المنجزة', 'معدل الإنجاز', 'متوسط التقييم'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '500', color: '#666', borderBottom: '1px solid #eee' }}>{h}</th>)}</tr></thead>
          <tbody>
            {report.map(row => (
              <tr key={row.department} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '12px 14px', fontWeight: '500' }}>{row.department}</td>
                <td style={{ padding: '12px 14px', color: '#555' }}>{row.employeeCount}</td>
                <td style={{ padding: '12px 14px', color: '#555' }}>{row.totalTasks}</td>
                <td style={{ padding: '12px 14px', color: '#1D9E75' }}>{row.completedTasks}</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '80px', height: '6px', background: '#f0f0f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${row.completionRate}%`, height: '100%', background: row.completionRate >= 80 ? '#1D9E75' : row.completionRate >= 60 ? '#EF9F27' : '#E24B4A', borderRadius: '999px' }} />
                    </div>
                    <span>{row.completionRate}%</span>
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= Math.round(row.avgEvalScore) ? '#EF9F27' : '#ddd', fontSize: '14px' }}>★</span>)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}