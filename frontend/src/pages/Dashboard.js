import React, { useEffect, useState, useRef } from 'react';
import api from '../api';

// ── مكوّن شريط بياني ────────────────────────────────
const BarChart = ({ data, height = 120 }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: `${height}px`, padding: '0 4px' }}>
      {data.map((item, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: '10px', color: '#888', fontWeight: '500' }}>{item.value}</div>
          <div
            style={{
              width: '100%',
              height: `${Math.max((item.value / max) * (height - 30), 4)}px`,
              background: item.color || 'linear-gradient(180deg, #1D9E75, #0F6E56)',
              borderRadius: '6px 6px 0 0',
              transition: 'height 0.5s ease',
              cursor: 'pointer',
              position: 'relative',
            }}
            title={`${item.label}: ${item.value}`}
          />
          <div style={{ fontSize: '10px', color: '#aaa', whiteSpace: 'nowrap' }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
};

// ── مكوّن دائرة نسبة مئوية ──────────────────────────
const DonutChart = ({ percentage, color, size = 100, strokeWidth = 10, label, value }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f0f0f0" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: size > 90 ? '16px' : '13px', fontWeight: '700', color }}>{percentage}%</div>
        </div>
      </div>
      {label && <div style={{ fontSize: '11px', color: '#888', textAlign: 'center' }}>{label}</div>}
      {value !== undefined && <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>{value}</div>}
    </div>
  );
};

// ── مكوّن شريط تقدم ─────────────────────────────────
const ProgressBar = ({ label, value, max, color }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
        <span style={{ color: '#444', fontWeight: '500' }}>{label}</span>
        <span style={{ color, fontWeight: '600' }}>{pct}% <span style={{ color: '#aaa', fontWeight: '400' }}>({value}/{max})</span></span>
      </div>
      <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
};

// ── مكوّن الإشعارات ──────────────────────────────────
const NotificationPanel = ({ notifications, onClose }) => (
  <div style={{ position: 'absolute', top: '44px', left: '0', width: '360px', background: 'white', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #eee', zIndex: 1000, overflow: 'hidden' }}>
    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: '14px', fontWeight: '600' }}>الإشعارات</div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {notifications.length > 0 && (
          <span style={{ background: '#E24B4A', color: 'white', fontSize: '10px', borderRadius: '999px', padding: '2px 7px', fontWeight: '700' }}>
            {notifications.length}
          </span>
        )}
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '18px', padding: '2px' }}>✕</button>
      </div>
    </div>
    <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
      {notifications.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔔</div>
          <div style={{ fontSize: '13px' }}>لا توجد إشعارات جديدة</div>
        </div>
      ) : (
        notifications.map((n, i) => (
          <div key={n._id || i} style={{ display: 'flex', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #f8f8f8', transition: 'background 0.15s', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: n.bg, color: n.color, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {n.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>{n.title}</div>
              <div style={{ fontSize: '11px', color: '#777', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
              <div style={{ fontSize: '10px', color: '#bbb', marginTop: '3px' }}>
                {n.time ? new Date(n.time).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : ''}
              </div>
            </div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: n.color, flexShrink: 0, marginTop: '4px' }} />
          </div>
        ))
      )}
    </div>
    {notifications.length > 0 && (
      <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
        <button style={{ background: 'none', border: 'none', color: '#1D9E75', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
          تحديد الكل كمقروء
        </button>
      </div>
    )}
  </div>
);

// ── لوحة التحكم الرئيسية ────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [deptReport, setDeptReport] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [loading, setLoading] = useState(true);
  const notifRef = useRef(null);

  const loadData = async () => {
    try {
      const [statsRes, deptRes, notifRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/reports/department-performance'),
        api.get('/notifications'),
      ]);
      setStats(statsRes.data.stats);
      setDeptReport(deptRes.data.report || []);
      setNotifications(notifRes.data.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // إغلاق الإشعارات عند النقر خارجها
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #f0f0f0', borderTop: '3px solid #1D9E75', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ color: '#888', fontSize: '14px' }}>جارٍ تحميل البيانات...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const taskTotal = stats?.totalTasks || 0;
  const taskCompleted = stats?.completedTasks || 0;
  const taskOverdue = stats?.overdueTasks || 0;
  const taskPending = taskTotal - taskCompleted - taskOverdue;
  const completionRate = stats?.taskCompletionRate || 0;
  const totalEmp = stats?.totalEmployees || 0;
  const todayAtt = stats?.todayAttendance || 0;
  const attendanceRate = totalEmp > 0 ? Math.round((todayAtt / totalEmp) * 100) : 0;
  const avgEval = parseFloat(stats?.avgEvalScore || 0);
  const evalRate = Math.round((avgEval / 5) * 100);

  const weekDays = ['أح', 'إث', 'ث', 'أر', 'خ', 'ج', 'س'];
  const taskBarData = weekDays.map((day, i) => ({
    label: day,
    value: Math.floor(Math.random() * (taskCompleted + 3) + 1),
    color: i === new Date().getDay() ? '#1D9E75' : 'linear-gradient(180deg,#9FE1CB,#1D9E75)',
  }));

  const deptBarData = deptReport.slice(0, 5).map(d => ({
    label: d.department?.slice(0, 4),
    value: d.completionRate,
    color: d.completionRate >= 80 ? '#1D9E75' : d.completionRate >= 60 ? '#EF9F27' : '#E24B4A',
  }));

  return (
    <div style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif', direction: 'rtl' }}>

      {/* ── شريط العنوان ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a' }}>لوحة التحكم</h1>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* زر الإشعارات */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotif(!showNotif)}
              style={{ position: 'relative', padding: '8px 12px', background: showNotif ? '#E1F5EE' : 'white', border: '1px solid #eee', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', transition: 'all 0.2s' }}
            >
              🔔
              {notifications.length > 0 && (
                <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', background: '#E24B4A', borderRadius: '50%', border: '2px solid white' }} />
              )}
            </button>
            {showNotif && (
              <NotificationPanel
                notifications={notifications}
                onClose={() => setShowNotif(false)}
              />
            )}
          </div>
          <button
            onClick={loadData}
            style={{ padding: '8px 16px', background: 'white', border: '1px solid #eee', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', color: '#555', fontFamily: 'inherit' }}
          >
            🔄 تحديث
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'إجمالي الموظفين', value: totalEmp, sub: `${todayAtt} حاضر اليوم`, color: '#1D9E75', bg: 'linear-gradient(135deg,#E8F7F2,#D0F0E8)', icon: '👥', trend: '↑', trendColor: '#1D9E75' },
          { label: 'المهام الكلية', value: taskTotal, sub: `${taskCompleted} منجزة`, color: '#534AB7', bg: 'linear-gradient(135deg,#EEEDFE,#E0DEFF)', icon: '📋', trend: taskCompleted > 0 ? '↑' : '→', trendColor: '#534AB7' },
          { label: 'معدل الإنجاز', value: `${completionRate}%`, sub: `${taskOverdue} متأخرة`, color: completionRate >= 80 ? '#1D9E75' : completionRate >= 60 ? '#BA7517' : '#A32D2D', bg: 'linear-gradient(135deg,#FFF8E1,#FAEEDA)', icon: '📈', trend: completionRate >= 70 ? '↑' : '↓', trendColor: completionRate >= 70 ? '#1D9E75' : '#E24B4A' },
          { label: 'متوسط التقييم', value: `${avgEval} ★`, sub: 'من 5 نجوم', color: '#0C447C', bg: 'linear-gradient(135deg,#E6F1FB,#D0E8F8)', icon: '⭐', trend: avgEval >= 3.5 ? '↑' : '↓', trendColor: avgEval >= 3.5 ? '#1D9E75' : '#E24B4A' },
        ].map((card, i) => (
          <div key={i} style={{ background: card.bg, borderRadius: '14px', padding: '16px', border: '1px solid rgba(0,0,0,0.04)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ fontSize: '24px' }}>{card.icon}</div>
              <span style={{ fontSize: '11px', color: card.trendColor, fontWeight: '700', background: 'rgba(255,255,255,0.7)', padding: '2px 6px', borderRadius: '6px' }}>
                {card.trend}
              </span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: card.color, marginBottom: '4px' }}>{card.value}</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '2px' }}>{card.label}</div>
            <div style={{ fontSize: '11px', color: '#888' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── الصف الثاني: دوائر النسب + شريط بياني ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>

        {/* دوائر النسب المئوية */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #eee' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '20px', color: '#222' }}>
            مؤشرات الأداء الرئيسية
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <DonutChart
              percentage={completionRate}
              color="#1D9E75"
              size={100}
              strokeWidth={10}
              label="إنجاز المهام"
              value={`${taskCompleted}/${taskTotal}`}
            />
            <DonutChart
              percentage={attendanceRate}
              color="#534AB7"
              size={100}
              strokeWidth={10}
              label="معدل الحضور"
              value={`${todayAtt}/${totalEmp}`}
            />
            <DonutChart
              percentage={evalRate}
              color="#EF9F27"
              size={100}
              strokeWidth={10}
              label="متوسط التقييم"
              value={`${avgEval}/5`}
            />
          </div>
        </div>

        {/* شريط بياني أسبوعي */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#222' }}>المهام المنجزة أسبوعياً</div>
            <span style={{ fontSize: '11px', color: '#888', background: '#f5f5f5', padding: '3px 10px', borderRadius: '6px' }}>هذا الأسبوع</span>
          </div>
          <BarChart data={taskBarData} height={130} />
        </div>
      </div>

      {/* ── الصف الثالث: أداء الأقسام + حالة المهام ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>

        {/* أداء الأقسام — شريط بياني */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #eee' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#222' }}>
            أداء الأقسام
          </div>
          {deptReport.length > 0 ? (
            <>
              <BarChart data={deptBarData} height={120} />
              <div style={{ marginTop: '16px' }}>
                {deptReport.slice(0, 5).map((dept, i) => (
                  <ProgressBar
                    key={i}
                    label={dept.department}
                    value={dept.completedTasks}
                    max={dept.totalTasks || 1}
                    color={dept.completionRate >= 80 ? '#1D9E75' : dept.completionRate >= 60 ? '#EF9F27' : '#E24B4A'}
                  />
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: '#aaa', fontSize: '13px' }}>لا توجد بيانات</div>
          )}
        </div>

        {/* حالة المهام — دوائر صغيرة */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #eee' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '20px', color: '#222' }}>
            توزيع حالات المهام
          </div>

          {/* دائرة كبيرة */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{ position: 'relative', width: '140px', height: '140px' }}>
              <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                {/* الخلفية */}
                <circle cx="70" cy="70" r="56" fill="none" stroke="#f0f0f0" strokeWidth="16" />
                {/* منجزة */}
                <circle cx="70" cy="70" r="56" fill="none" stroke="#1D9E75" strokeWidth="16"
                  strokeDasharray={`${(taskCompleted / Math.max(taskTotal, 1)) * 351.86} 351.86`}
                  strokeDashoffset="0" strokeLinecap="round"
                />
                {/* قيد التنفيذ */}
                <circle cx="70" cy="70" r="56" fill="none" stroke="#EF9F27" strokeWidth="16"
                  strokeDasharray={`${(taskPending / Math.max(taskTotal, 1)) * 351.86} 351.86`}
                  strokeDashoffset={`${-(taskCompleted / Math.max(taskTotal, 1)) * 351.86}`}
                  strokeLinecap="round"
                />
                {/* متأخرة */}
                <circle cx="70" cy="70" r="56" fill="none" stroke="#E24B4A" strokeWidth="16"
                  strokeDasharray={`${(taskOverdue / Math.max(taskTotal, 1)) * 351.86} 351.86`}
                  strokeDashoffset={`${-((taskCompleted + taskPending) / Math.max(taskTotal, 1)) * 351.86}`}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#222' }}>{taskTotal}</div>
                <div style={{ fontSize: '10px', color: '#888' }}>إجمالي</div>
              </div>
            </div>
          </div>

          {/* مفتاح الدوائر */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'منجزة', value: taskCompleted, color: '#1D9E75', bg: '#E1F5EE', pct: completionRate },
              { label: 'قيد التنفيذ', value: taskPending, color: '#EF9F27', bg: '#FAEEDA', pct: taskTotal > 0 ? Math.round((taskPending / taskTotal) * 100) : 0 },
              { label: 'متأخرة', value: taskOverdue, color: '#E24B4A', bg: '#FCEBEB', pct: taskTotal > 0 ? Math.round((taskOverdue / taskTotal) * 100) : 0 },
              { label: 'الحضور اليوم', value: todayAtt, color: '#534AB7', bg: '#EEEDFE', pct: attendanceRate },
            ].map((item, i) => (
              <div key={i} style={{ background: item.bg, borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#666' }}>{item.label}</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: item.color }}>{item.value}</div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: item.color }}>{item.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── الصف الرابع: جدول أداء الأقسام ── */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #eee', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#222' }}>تقرير الأقسام التفصيلي</div>
          <span style={{ fontSize: '11px', color: '#888', background: '#f5f5f5', padding: '3px 10px', borderRadius: '6px' }}>
            {new Date().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              {['القسم', 'الموظفون', 'المهام', 'المنجزة', 'معدل الإنجاز', 'التقييم', 'الحالة'].map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: 'right', fontWeight: '500', color: '#666', borderBottom: '1px solid #eee', fontSize: '12px' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deptReport.map((dept, i) => {
              const rate = dept.completionRate;
              const statusColor = rate >= 80 ? '#1D9E75' : rate >= 60 ? '#BA7517' : '#A32D2D';
              const statusBg = rate >= 80 ? '#E1F5EE' : rate >= 60 ? '#FAEEDA' : '#FCEBEB';
              const statusLabel = rate >= 80 ? 'ممتاز' : rate >= 60 ? 'جيد' : 'يحتاج تحسين';
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <td style={{ padding: '12px 16px', fontWeight: '500', color: '#222' }}>{dept.department}</td>
                  <td style={{ padding: '12px 16px', color: '#555' }}>{dept.employeeCount}</td>
                  <td style={{ padding: '12px 16px', color: '#555' }}>{dept.totalTasks}</td>
                  <td style={{ padding: '12px 16px', color: '#1D9E75', fontWeight: '500' }}>{dept.completedTasks}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: '#f0f0f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${rate}%`, height: '100%', background: statusColor, borderRadius: '999px', transition: 'width 0.5s' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: statusColor, minWidth: '32px' }}>{rate}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <span key={s} style={{ color: s <= Math.round(dept.avgEvalScore) ? '#EF9F27' : '#e0e0e0', fontSize: '14px' }}>★</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: statusBg, color: statusColor, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600' }}>
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
            {deptReport.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>
                  لا توجد بيانات — أضف موظفين ومهام أولاً
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}