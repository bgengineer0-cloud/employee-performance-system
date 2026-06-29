import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Reports() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('completionRate');

  const load = () => {
    setLoading(true);
    api.get('/reports/department-performance')
      .then(res => setDepartments(res.data.departments || []))
      .catch(() => setError('فشل تحميل التقرير'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const sorted = [...departments].sort((a, b) => b[sortBy] - a[sortBy]);

  const totals = departments.reduce((acc, d) => ({
    employees: acc.employees + d.employeeCount,
    tasks: acc.tasks + d.totalTasks,
    completed: acc.completed + d.completedTasks,
    overdue: acc.overdue + d.overdueTasks,
  }), { employees: 0, tasks: 0, completed: 0, overdue: 0 });

  const overallRate = totals.tasks > 0 ? Math.round((totals.completed / totals.tasks) * 100) : 0;

  return (
    <div style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif', direction: 'rtl' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>تقرير الأقسام التفصيلي</h1>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
            أداء {departments.length} قسم في المنظمة
          </div>
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px' }}
        >
          <option value="completionRate">ترتيب حسب معدل الإنجاز</option>
          <option value="employeeCount">ترتيب حسب عدد الموظفين</option>
          <option value="attendanceRate">ترتيب حسب معدل الحضور</option>
          <option value="overdueTasks">ترتيب حسب المهام المتأخرة</option>
        </select>
      </div>

      {error && (
        <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', border: '1px solid #f5c2c2' }}>
          ⚠ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#aaa' }}>جارٍ التحميل...</div>
      ) : departments.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '12px', padding: '60px', textAlign: 'center', border: '1px solid #eee' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div style={{ fontSize: '16px', fontWeight: '500', color: '#555', marginBottom: '8px' }}>
            لا توجد أقسام لعرض تقاريرها
          </div>
          <div style={{ fontSize: '13px', color: '#aaa' }}>
            أضف أقساماً وموظفين أولاً لعرض التقارير
          </div>
        </div>
      ) : (
        <>
          {/* بطاقات إجمالية */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'إجمالي الأقسام', value: departments.length, color: '#534AB7', bg: '#EEEDFE', icon: '🏢' },
              { label: 'إجمالي الموظفين', value: totals.employees, color: '#0C447C', bg: '#E6F1FB', icon: '👥' },
              { label: 'إجمالي المهام', value: totals.tasks, color: '#BA7517', bg: '#FAEEDA', icon: '📋' },
              { label: 'معدل الإنجاز العام', value: `${overallRate}%`, color: '#1D9E75', bg: '#E1F5EE', icon: '✅' },
              { label: 'مهام متأخرة', value: totals.overdue, color: '#A32D2D', bg: '#FCEBEB', icon: '⚠' },
            ].map(card => (
              <div key={card.label} style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #eee' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '10px' }}>
                  {card.icon}
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: card.color }}>{card.value}</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* مخطط مقارنة الأقسام */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #eee', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '18px' }}>مقارنة معدل إنجاز المهام بين الأقسام</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '180px', paddingTop: '10px' }}>
              {sorted.map(dept => (
                <div key={dept._id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: dept.color }}>{dept.completionRate}%</div>
                  <div style={{
                    width: '100%',
                    maxWidth: '50px',
                    height: `${Math.max(dept.completionRate, 4)}px`,
                    background: `linear-gradient(180deg, ${dept.color}, ${dept.color}aa)`,
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.4s'
                  }} />
                  <div style={{ fontSize: '16px' }}>{dept.icon}</div>
                  <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {dept.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* بطاقات تفصيلية لكل قسم */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            {sorted.map(dept => (
              <div key={dept._id} style={{ background: 'white', borderRadius: '14px', border: '1px solid #eee', overflow: 'hidden' }}>

                {/* رأس البطاقة */}
                <div style={{ background: dept.color + '12', padding: '16px 18px', borderBottom: `3px solid ${dept.color}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: dept.color + '20', border: `2px solid ${dept.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                    {dept.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: dept.color }}>{dept.name}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                      👤 {dept.managerName || 'بدون مدير'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: dept.color }}>{dept.employeeCount}</div>
                    <div style={{ fontSize: '10px', color: '#888' }}>موظف</div>
                  </div>
                </div>

                {/* المحتوى */}
                <div style={{ padding: '16px 18px' }}>

                  {/* معدل إنجاز المهام */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ color: '#444' }}>معدل إنجاز المهام</span>
                      <span style={{ color: dept.color, fontWeight: '700' }}>{dept.completionRate}%</span>
                    </div>
                    <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${dept.completionRate}%`, height: '100%', background: dept.color, borderRadius: '999px', transition: 'width 0.4s' }} />
                    </div>
                  </div>

                  {/* معدل الحضور */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ color: '#444' }}>معدل الحضور (30 يوم)</span>
                      <span style={{ color: '#1D9E75', fontWeight: '700' }}>{dept.attendanceRate}%</span>
                    </div>
                    <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${dept.attendanceRate}%`, height: '100%', background: '#1D9E75', borderRadius: '999px', transition: 'width 0.4s' }} />
                    </div>
                  </div>

                  {/* إحصائيات المهام */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div style={{ background: '#EEEDFE', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#534AB7' }}>{dept.totalTasks}</div>
                      <div style={{ fontSize: '10px', color: '#888' }}>إجمالي</div>
                    </div>
                    <div style={{ background: '#FAEEDA', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#BA7517' }}>{dept.inProgressTasks}</div>
                      <div style={{ fontSize: '10px', color: '#888' }}>قيد التنفيذ</div>
                    </div>
                    <div style={{ background: dept.overdueTasks > 0 ? '#FCEBEB' : '#E1F5EE', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: dept.overdueTasks > 0 ? '#A32D2D' : '#1D9E75' }}>{dept.overdueTasks}</div>
                      <div style={{ fontSize: '10px', color: '#888' }}>متأخرة</div>
                    </div>
                  </div>

                  {dept.employeeCount === 0 && (
                    <div style={{ marginTop: '12px', padding: '8px 12px', background: '#FAEEDA', borderRadius: '8px', fontSize: '11px', color: '#633806', textAlign: 'center' }}>
                      لا يوجد موظفون في هذا القسم بعد
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}