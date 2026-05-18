import React, { useEffect, useState, useRef } from 'react';
import api from '../api';

const statusMap = {
  present: { label: 'حاضر', color: '#1D9E75', bg: '#E1F5EE' },
  absent: { label: 'غائب', color: '#A32D2D', bg: '#FCEBEB' },
  on_leave: { label: 'إجازة', color: '#BA7517', bg: '#FAEEDA' },
  late: { label: 'متأخر', color: '#534AB7', bg: '#EEEDFE' },
  half_day: { label: 'نصف يوم', color: '#0C447C', bg: '#E6F1FB' },
};

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');

  // استيراد Excel
  const [importStep, setImportStep] = useState('idle'); // idle | preview | importing | done
  const [previewData, setPreviewData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const selectedFileRef = useRef(null);

  // فلاتر
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [searchEmp, setSearchEmp] = useState('');

  const loadToday = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/today');
      setRecords(res.data.records || []);
      setSummary(res.data.summary || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthly = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance?month=${filterMonth}&year=${filterYear}`);
      setRecords(res.data.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (activeTab === 'today') loadToday();
  else loadMonthly();
  // eslint-disable-next-line
}, [activeTab, filterMonth, filterYear]);
  // معاينة الملف
  const handleFileSelect = async (file) => {
    if (!file) return;
    selectedFileRef.current = file;
    setImportStep('previewing');
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/attendance/preview-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreviewData(res.data);
      setImportStep('preview');
    } catch (err) {
      setImportResult({ error: err.response?.data?.message || 'فشل قراءة الملف' });
      setImportStep('idle');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // استيراد فعلي
  const handleImport = async () => {
    if (!selectedFileRef.current) return;
    setImporting(true);
    setImportStep('importing');

    const formData = new FormData();
    formData.append('file', selectedFileRef.current);

    try {
      const res = await api.post('/attendance/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(res.data);
      setImportStep('done');
      // تحديث البيانات
      if (activeTab === 'today') loadToday();
      else loadMonthly();
    } catch (err) {
      setImportResult({ error: err.response?.data?.message || 'فشل الاستيراد' });
      setImportStep('idle');
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setImportStep('idle');
    setPreviewData(null);
    setImportResult(null);
    selectedFileRef.current = null;
    if (fileRef.current) fileRef.current.value = '';
  };

  const filteredRecords = records.filter(r =>
    !searchEmp || r.employee?.name?.includes(searchEmp)
  );

  return (
    <div style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif', direction: 'rtl' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>الحضور والانصراف</h1>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
            إدارة سجلات الحضور واستيراد بيانات SmartPSS
          </div>
        </div>
        <button
          onClick={() => setActiveTab(activeTab === 'import' ? 'today' : 'import')}
          style={{ padding: '9px 18px', background: activeTab === 'import' ? '#534AB7' : '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          📥 {activeTab === 'import' ? 'عرض السجلات' : 'استيراد من SmartPSS'}
        </button>
      </div>

      {/* ══ تبويب الاستيراد ══ */}
      {activeTab === 'import' && (
        <div>

          {/* شرح SmartPSS */}
          <div style={{ background: 'linear-gradient(135deg,#EEEDFE,#E0DEFF)', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', border: '1px solid #d5d3f5', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>📱</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#3C3489', marginBottom: '6px' }}>
                كيفية تصدير ملف الحضور من SmartPSS
              </div>
              <div style={{ fontSize: '12px', color: '#534AB7', lineHeight: '1.8' }}>
                <span style={{ fontWeight: '600' }}>1.</span> افتح تطبيق SmartPSS على جهازك
                &nbsp;→&nbsp;
                <span style={{ fontWeight: '600' }}>2.</span> اذهب إلى تقارير الحضور (Attendance Report)
                &nbsp;→&nbsp;
                <span style={{ fontWeight: '600' }}>3.</span> اختر الفترة الزمنية المطلوبة
                &nbsp;→&nbsp;
                <span style={{ fontWeight: '600' }}>4.</span> اضغط تصدير Excel (Export to Excel)
                &nbsp;→&nbsp;
                <span style={{ fontWeight: '600' }}>5.</span> ارفع الملف هنا
              </div>
            </div>
          </div>

          {/* منطقة الرفع */}
          {importStep === 'idle' && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? '#1D9E75' : '#ddd'}`,
                borderRadius: '14px',
                padding: '50px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? '#E8F7F2' : '#fafafa',
                transition: 'all 0.2s',
                marginBottom: '16px'
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={e => handleFileSelect(e.target.files[0])}
              />
              <div style={{ fontSize: '48px', marginBottom: '14px' }}>📊</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
                {dragOver ? 'أفلت الملف هنا' : 'اسحب وأفلت ملف Excel هنا'}
              </div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '14px' }}>
                أو اضغط للاختيار من جهازك
              </div>
              <div style={{ display: 'inline-flex', gap: '6px' }}>
                {['.xlsx', '.xls', '.csv'].map(ext => (
                  <span key={ext} style={{ background: '#eee', color: '#666', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* جارٍ المعاينة */}
          {importStep === 'previewing' && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px solid #eee', marginBottom: '16px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
              <div style={{ fontSize: '14px', color: '#888' }}>جارٍ قراءة الملف...</div>
            </div>
          )}

          {/* معاينة البيانات */}
          {importStep === 'preview' && previewData && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>معاينة البيانات</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                      ورقة العمل: <strong>{previewData.sheetName}</strong> — إجمالي الصفوف: <strong>{previewData.totalRows}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ background: '#E1F5EE', color: '#1D9E75', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>
                      ✓ {previewData.totalRows} سجل
                    </span>
                  </div>
                </div>

                {/* رؤوس الأعمدة */}
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #f0f0f0', background: '#f8f8f8' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: '500' }}>
                    الأعمدة المكتشفة:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {previewData.headers.map((h, i) => (
                      <span key={i} style={{ background: '#EEEDFE', color: '#534AB7', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '500' }}>
                        {h || `عمود ${i + 1}`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* جدول المعاينة */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        {previewData.headers.map((h, i) => (
                          <th key={i} style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '500', color: '#555', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>
                            {h || `عمود ${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          {previewData.headers.map((h, j) => (
                            <td key={j} style={{ padding: '8px 12px', color: '#444', whiteSpace: 'nowrap' }}>
                              {String(row[h] || '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ padding: '10px 18px', background: '#FAEEDA', borderTop: '1px solid #f0d9a0' }}>
                  <div style={{ fontSize: '12px', color: '#633806' }}>
                    ⚠ هذه معاينة لأول 5 صفوف فقط. تأكد من صحة البيانات قبل الاستيراد.
                  </div>
                </div>
              </div>

              {/* أزرار التأكيد */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={resetImport}
                  style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px' }}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleImport}
                  style={{ padding: '10px 24px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                >
                  ✓ استيراد {previewData.totalRows} سجل
                </button>
              </div>
            </div>
          )}

          {/* جارٍ الاستيراد */}
          {importStep === 'importing' && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', border: '1px solid #eee', marginBottom: '16px' }}>
              <div style={{ width: '50px', height: '50px', border: '4px solid #f0f0f0', borderTop: '4px solid #1D9E75', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
                جارٍ استيراد البيانات...
              </div>
              <div style={{ fontSize: '13px', color: '#888' }}>
                يتم معالجة سجلات الحضور وربطها بالموظفين
              </div>
            </div>
          )}

          {/* نتيجة الاستيراد */}
          {importStep === 'done' && importResult && (
            <div style={{ marginBottom: '16px' }}>
              {importResult.error ? (
                <div style={{ background: '#FCEBEB', border: '1px solid #f5c2c2', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>❌</div>
                  <div style={{ fontSize: '14px', color: '#A32D2D', fontWeight: '600' }}>{importResult.error}</div>
                </div>
              ) : (
                <div>
                  <div style={{ background: '#E1F5EE', border: '1px solid #b2dfdb', borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0F6E56', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '24px' }}>✅</span>
                      تم الاستيراد بنجاح
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                      {[
                        { label: 'إجمالي الصفوف', value: importResult.summary?.totalRows, color: '#333', bg: 'white' },
                        { label: 'سجلات جديدة', value: importResult.summary?.inserted, color: '#1D9E75', bg: '#E1F5EE' },
                        { label: 'سجلات محدّثة', value: importResult.summary?.updated, color: '#534AB7', bg: '#EEEDFE' },
                        { label: 'أخطاء', value: importResult.summary?.errors, color: importResult.summary?.errors > 0 ? '#A32D2D' : '#1D9E75', bg: importResult.summary?.errors > 0 ? '#FCEBEB' : '#E1F5EE' },
                      ].map((s, i) => (
                        <div key={i} style={{ background: s.bg, borderRadius: '10px', padding: '12px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
                          <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value || 0}</div>
                          <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* أخطاء التحديد */}
                  {importResult.errors?.length > 0 && (
                    <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', background: '#FCEBEB' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#A32D2D' }}>
                          ⚠ موظفون غير موجودون في النظام ({importResult.errors.length})
                        </div>
                      </div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {importResult.errors.map((err, i) => (
                          <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5', fontSize: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ color: '#A32D2D', flexShrink: 0 }}>صف {err.row}</span>
                            <span style={{ fontWeight: '500', color: '#333' }}>{err.name}</span>
                            <span style={{ color: '#888' }}>—</span>
                            <span style={{ color: '#666' }}>{err.reason}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: '10px 16px', background: '#fafafa', fontSize: '12px', color: '#888' }}>
                        💡 تأكد من إضافة هؤلاء الموظفين في صفحة الموظفين أولاً ثم أعد الاستيراد
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={resetImport}
                      style={{ padding: '9px 18px', background: '#EEEDFE', color: '#534AB7', border: '1px solid #d5d3f5', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                    >
                      استيراد ملف آخر
                    </button>
                    <button
                      onClick={() => { setActiveTab('today'); resetImport(); }}
                      style={{ padding: '9px 18px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                    >
                      عرض سجلات الحضور
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ تبويبات السجلات ══ */}
      {activeTab !== 'import' && (
        <div>
          {/* تبويبات */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'white', padding: '4px', borderRadius: '10px', border: '1px solid #eee', width: 'fit-content' }}>
            {[['today', 'حضور اليوم'], ['monthly', 'السجل الشهري']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setActiveTab(val)}
                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', background: activeTab === val ? '#1D9E75' : 'transparent', color: activeTab === val ? 'white' : '#666', transition: 'all 0.2s' }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* KPI اليوم */}
          {activeTab === 'today' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: 'حاضر', value: summary.present || 0, color: '#1D9E75', bg: '#E1F5EE', icon: '✓' },
                { label: 'غائب', value: summary.absent || 0, color: '#A32D2D', bg: '#FCEBEB', icon: '✗' },
                { label: 'إجازة', value: summary.on_leave || 0, color: '#BA7517', bg: '#FAEEDA', icon: '🏖' },
                { label: 'متأخر', value: summary.late || 0, color: '#534AB7', bg: '#EEEDFE', icon: '⏰' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: '12px', padding: '16px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    {s.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '11px', color: '#777' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* فلتر الشهر */}
          {activeTab === 'monthly' && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center' }}>
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(parseInt(e.target.value))}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              >
                {['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={filterYear}
                onChange={e => setFilterYear(parseInt(e.target.value))}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <input
                value={searchEmp}
                onChange={e => setSearchEmp(e.target.value)}
                placeholder="🔍 ابحث عن موظف..."
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', flex: 1 }}
              />
            </div>
          )}

          {/* الجدول */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                {activeTab === 'today'
                  ? `حضور اليوم — ${new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}`
                  : `سجل الحضور — ${filterYear}`
                }
              </div>
              <span style={{ fontSize: '11px', color: '#888', background: '#f0f0f0', padding: '3px 10px', borderRadius: '6px' }}>
                {filteredRecords.length} سجل
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
                <div style={{ fontSize: '30px', marginBottom: '10px' }}>⏳</div>
                جارٍ التحميل...
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    {['الموظف', 'القسم', 'التاريخ', 'وقت الدخول', 'وقت الخروج', 'الحالة', 'الملاحظات'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '500', color: '#666', borderBottom: '1px solid #eee', fontSize: '12px' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(r => {
                    const s = statusMap[r.status] || statusMap.present;
                    const isImported = r.notes?.includes('SmartPSS');
                    return (
                      <tr key={r._id} style={{ borderBottom: '1px solid #f5f5f5' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#E1F5EE', color: '#085041', fontSize: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {r.employee?.name?.slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontWeight: '500' }}>{r.employee?.name}</div>
                              {isImported && (
                                <div style={{ fontSize: '10px', color: '#534AB7' }}>📱 SmartPSS</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px', color: '#666', fontSize: '12px' }}>{r.employee?.department}</td>
                        <td style={{ padding: '11px 14px', color: '#555', fontSize: '12px' }}>
                          {r.date ? new Date(r.date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ background: r.checkIn ? '#E1F5EE' : '#f5f5f5', color: r.checkIn ? '#0F6E56' : '#aaa', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', fontWeight: '500' }}>
                            {r.checkIn || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ background: r.checkOut ? '#E6F1FB' : '#f5f5f5', color: r.checkOut ? '#0C447C' : '#aaa', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', fontWeight: '500' }}>
                            {r.checkOut || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '500' }}>
                            ● {s.label}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px', color: '#888', fontSize: '11px' }}>
                          {r.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>
                        <div style={{ fontSize: '36px', marginBottom: '10px' }}>📭</div>
                        لا توجد سجلات حضور
                        {activeTab === 'today' && (
                          <div style={{ fontSize: '12px', marginTop: '6px' }}>
                            استورد بيانات الحضور من SmartPSS للبدء
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}