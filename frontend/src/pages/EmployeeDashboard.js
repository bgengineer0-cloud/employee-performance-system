import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

const statusMap = {
  pending: { label: 'قيد الانتظار', color: '#534AB7', bg: '#EEEDFE' },
  in_progress: { label: 'قيد التنفيذ', color: '#BA7517', bg: '#FAEEDA' },
  completed: { label: 'منجزة', color: '#1D9E75', bg: '#E1F5EE' },
  overdue: { label: 'متأخرة', color: '#A32D2D', bg: '#FCEBEB' },
  postponed: { label: 'مؤجلة', color: '#666', bg: '#f0f0f0' }
};

const priorityMap = {
  low: '🟢 منخفضة',
  medium: '🟡 متوسطة',
  high: '🟠 عالية',
  critical: '🔴 حرجة'
};

const colors = ['#E1F5EE','#EEEDFE','#FAEEDA','#FCEBEB','#E6F1FB'];
const textColors = ['#085041','#3C3489','#633806','#791F1F','#0C447C'];

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString())
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === yesterday.toDateString()) return 'أمس';
  return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
};

export default function EmployeeDashboard() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [tab, setTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all');
  const [searchContact, setSearchContact] = useState('');
  const [lastMessages, setLastMessages] = useState({});
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const taskPollRef = useRef(null);

  // ── جلب مهام الموظف بالإيميل ──────────────────────
  const loadTasks = async () => {
    if (!currentUser.email) return;
    try {
      const res = await api.get(`/tasks/my-tasks/${currentUser.email}`);
      setTasks(res.data.tasks || []);
      if (res.data.employee) {
        setEmployee(res.data.employee);
      }
    } catch (err) {
      console.error('خطأ في جلب المهام:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // ── جلب جهات الاتصال ──────────────────────────────
  const loadContacts = async () => {
    try {
      const res = await api.get('/messages/users');
      const users = res.data.users || [];
      setContacts(users);

      // جلب آخر رسالة لكل جهة اتصال
      const lastMsgMap = {};
      await Promise.all(
        users.map(async (u) => {
          try {
            const r = await api.get(`/messages/conversation/${u._id}`);
            const msgs = r.data.messages || [];
            if (msgs.length > 0) {
              lastMsgMap[u._id] = msgs[msgs.length - 1];
            }
          } catch {}
        })
      );
      setLastMessages(lastMsgMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContacts(false);
    }
  };

  // ── جلب عدد الرسائل غير المقروءة ─────────────────
  const loadUnread = async () => {
    try {
      const res = await api.get('/messages/unread-count');
      setUnread(res.data.count || 0);
    } catch {}
  };

  useEffect(() => {
  loadTasks();
  loadContacts();
  loadUnread();
  taskPollRef.current = setInterval(loadTasks, 10000);
  return () => clearInterval(taskPollRef.current);
  // eslint-disable-next-line
}, []);

  // ── جلب المحادثة + polling ────────────────────────
  useEffect(() => {
    if (!selectedContact) return;
    if (pollRef.current) clearInterval(pollRef.current);

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/messages/conversation/${selectedContact._id}`);
        const msgs = res.data.messages || [];
        setMessages(msgs);
        if (msgs.length > 0) {
          setLastMessages(prev => ({ ...prev, [selectedContact._id]: msgs[msgs.length - 1] }));
        }
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        loadUnread();
      } catch (err) {
        console.error(err);
      }
    };

    setLoadingMessages(true);
    fetchMessages().finally(() => setLoadingMessages(false));
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [selectedContact]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !selectedContact) return;
    setInput('');
    try {
      const res = await api.post('/messages', {
        recipient: selectedContact._id,
        content: text,
      });
      const newMsg = res.data.message;
      setMessages(prev => [...prev, newMsg]);
      setLastMessages(prev => ({ ...prev, [selectedContact._id]: newMsg }));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('فشل إرسال الرسالة:', err);
    }
  };

  const isMe = (msg) => {
    const senderId = msg.sender?._id || msg.sender;
    return senderId?.toString() === currentUser._id?.toString();
  };

  // ── إحصائيات المهام ───────────────────────────────
  const taskCounts = {
    all: tasks.length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
    pending: tasks.filter(t => t.status === 'pending').length,
  };

  const filteredTasks = taskFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === taskFilter);

  const filteredContacts = contacts.filter(c =>
    c.name?.includes(searchContact) ||
    c.department?.includes(searchContact)
  );

  return (
    <div style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif', direction: 'rtl' }}>

      {/* ── بطاقة الترحيب ── */}
      <div style={{ background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', borderRadius: '14px', padding: '20px 24px', marginBottom: '20px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>مرحباً بك</div>
          <div style={{ fontSize: '20px', fontWeight: '700' }}>{currentUser.name}</div>
          <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
            {employee
              ? `${employee.position} — ${employee.department}`
              : currentUser.department || 'موظف'
            }
          </div>
          {employee?.employeeId && (
            <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
              {employee.employeeId}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'left', opacity: 0.85 }}>
          <div style={{ fontSize: '12px' }}>
            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── إحصائيات ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'إجمالي المهام', value: taskCounts.all, color: '#534AB7', bg: '#EEEDFE', icon: '📋' },
          { label: 'قيد التنفيذ', value: taskCounts.in_progress, color: '#BA7517', bg: '#FAEEDA', icon: '⏳' },
          { label: 'المنجزة', value: taskCounts.completed, color: '#1D9E75', bg: '#E1F5EE', icon: '✅' },
          { label: 'المتأخرة', value: taskCounts.overdue, color: '#A32D2D', bg: '#FCEBEB', icon: '⚠' },
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

      {/* ── تبويبات ── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'white', padding: '4px', borderRadius: '10px', border: '1px solid #eee', width: 'fit-content' }}>
        <button
          onClick={() => setTab('tasks')}
          style={{ padding: '8px 22px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', background: tab === 'tasks' ? '#1D9E75' : 'transparent', color: tab === 'tasks' ? 'white' : '#666', transition: 'all 0.2s' }}
        >
          📋 مهامي ({taskCounts.all})
        </button>
        <button
          onClick={() => { setTab('messages'); loadUnread(); }}
          style={{ padding: '8px 22px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', background: tab === 'messages' ? '#1D9E75' : 'transparent', color: tab === 'messages' ? 'white' : '#666', transition: 'all 0.2s', position: 'relative' }}
        >
          ✉ رسائلي
          {unread > 0 && (
            <span style={{ position: 'absolute', top: '4px', left: '4px', background: '#E24B4A', color: 'white', fontSize: '9px', borderRadius: '999px', padding: '1px 5px', fontWeight: '700' }}>
              {unread}
            </span>
          )}
        </button>
      </div>

      {/* ══ تبويب المهام ══ */}
      {tab === 'tasks' && (
        <div>
          {/* فلاتر الحالة */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {[
              ['all', 'الكل'],
              ['pending', 'قيد الانتظار'],
              ['in_progress', 'قيد التنفيذ'],
              ['completed', 'منجزة'],
              ['overdue', 'متأخرة'],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTaskFilter(val)}
                style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid', borderColor: taskFilter === val ? '#1D9E75' : '#ddd', background: taskFilter === val ? '#1D9E75' : 'white', color: taskFilter === val ? 'white' : '#555', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
              >
                {label}
                <span style={{ marginRight: '5px', fontSize: '11px', opacity: 0.8 }}>
                  ({taskCounts[val] || 0})
                </span>
              </button>
            ))}
          </div>

          {loadingTasks ? (
            <div style={{ background: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', color: '#aaa', border: '1px solid #eee' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
              جارٍ تحميل المهام...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', border: '1px solid #eee' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
              <div style={{ color: '#888', fontSize: '14px', fontWeight: '500' }}>
                {taskFilter === 'all' ? 'لا توجد مهام مسندة إليك' : `لا توجد مهام ${statusMap[taskFilter]?.label}`}
              </div>
              <div style={{ color: '#bbb', fontSize: '12px', marginTop: '6px' }}>
                ستظهر المهام هنا عندما يُسندها إليك المدير
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredTasks.map(task => {
                const s = statusMap[task.status] || statusMap.pending;
                const stepsTotal = task.steps?.length || 0;
                const stepsDone = task.steps?.filter(s => s.isCompleted).length || 0;
                const progress = stepsTotal > 0
                  ? Math.round((stepsDone / stepsTotal) * 100)
                  : task.status === 'completed' ? 100 : 0;
                const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();

                return (
                  <div
                    key={task._id}
                    style={{ background: 'white', borderRadius: '12px', padding: '16px', border: `1px solid ${isOverdue ? '#f5c2c2' : '#eee'}`, transition: 'box-shadow 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    {/* رأس المهمة */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ flex: 1, paddingLeft: '10px' }}>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#222', marginBottom: '4px' }}>
                          {task.title}
                        </div>
                        {task.description && (
                          <div style={{ fontSize: '12px', color: '#777', lineHeight: '1.5' }}>
                            {task.description}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', flexShrink: 0 }}>
                        <span style={{ background: s.bg, color: s.color, padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '600' }}>
                          {s.label}
                        </span>
                        {task.priority && (
                          <span style={{ fontSize: '11px', color: '#888' }}>
                            {priorityMap[task.priority]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* شريط التقدم */}
                    {stepsTotal > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', marginBottom: '5px' }}>
                          <span>التقدم: {stepsDone} من {stepsTotal} خطوات</span>
                          <span style={{ fontWeight: '600', color: progress === 100 ? '#1D9E75' : '#534AB7' }}>{progress}%</span>
                        </div>
                        <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#1D9E75' : '#534AB7', borderRadius: '999px', transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    )}

                    {/* الخطوات */}
                    {task.steps?.length > 0 && (
                      <div style={{ marginBottom: '12px', background: '#fafafa', borderRadius: '10px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', fontWeight: '500' }}>
                          خطوات المهمة
                        </div>
                        {task.steps.map((step, i) => (
                          <div key={step._id || i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', borderBottom: i < task.steps.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: step.isCompleted ? '#1D9E75' : '#e8e8e8', color: step.isCompleted ? 'white' : '#999', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: '700' }}>
                              {step.isCompleted ? '✓' : i + 1}
                            </div>
                            <span style={{ fontSize: '12px', color: step.isCompleted ? '#aaa' : '#333', textDecoration: step.isCompleted ? 'line-through' : 'none', flex: 1 }}>
                              {step.description}
                            </span>
                            {step.isCompleted && step.completedAt && (
                              <span style={{ fontSize: '10px', color: '#aaa' }}>
                                {new Date(step.completedAt).toLocaleDateString('ar-SA')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ملاحظات المدير */}
                    {task.managerNotes && (
                      <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#FAEEDA', borderRadius: '8px', border: '1px solid #f0d9a0' }}>
                        <div style={{ fontSize: '11px', color: '#BA7517', fontWeight: '600', marginBottom: '3px' }}>
                          📝 ملاحظة المدير:
                        </div>
                        <div style={{ fontSize: '12px', color: '#633806' }}>{task.managerNotes}</div>
                      </div>
                    )}

                    {/* تذييل المهمة */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f5f5f5', fontSize: '12px' }}>
                      <div style={{ color: '#888' }}>
                        كُلّف بها من: {task.assignedBy?.name || 'المدير'}
                      </div>
                      <div style={{ color: isOverdue ? '#A32D2D' : '#888', fontWeight: isOverdue ? '600' : '400' }}>
                        📅 {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })
                          : '—'
                        }
                        {isOverdue && ' ⚠ متأخرة'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ تبويب الرسائل ══ */}
      {tab === 'messages' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '12px', height: '480px' }}>

          {/* قائمة جهات الاتصال */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
              <input
                value={searchContact}
                onChange={e => setSearchContact(e.target.value)}
                placeholder="🔍 ابحث..."
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #eee', borderRadius: '20px', fontSize: '12px', outline: 'none', direction: 'rtl' }}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingContacts ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#aaa', fontSize: '12px' }}>جارٍ التحميل...</div>
              ) : filteredContacts.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#aaa', fontSize: '12px' }}>لا توجد جهات اتصال</div>
              ) : (
                filteredContacts.map((contact, i) => {
                  const isSelected = selectedContact?._id === contact._id;
                  const lastMsg = lastMessages[contact._id];
                  const hasUnread = lastMsg && !isMe(lastMsg) && !lastMsg.isRead;
                  return (
                    <div
                      key={contact._id}
                      onClick={() => setSelectedContact(contact)}
                      style={{ padding: '10px 12px', borderBottom: '1px solid #f8f8f8', cursor: 'pointer', background: isSelected ? '#E8F7F2' : 'white', display: 'flex', alignItems: 'center', gap: '8px', borderRight: isSelected ? '3px solid #1D9E75' : '3px solid transparent' }}
                    >
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: colors[i % colors.length], color: textColors[i % textColors.length], fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                        {contact.name?.slice(0, 2)}
                        {hasUnread && <div style={{ position: 'absolute', top: 0, left: 0, width: '9px', height: '9px', background: '#E24B4A', borderRadius: '50%', border: '1.5px solid white' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: hasUnread ? '700' : '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {contact.name}
                        </div>
                        <div style={{ fontSize: '10px', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lastMsg
                            ? (isMe(lastMsg) ? `أنت: ${lastMsg.content}` : lastMsg.content)
                            : contact.department
                          }
                        </div>
                      </div>
                      {lastMsg && <div style={{ fontSize: '9px', color: '#bbb', flexShrink: 0 }}>{formatTime(lastMsg.createdAt)}</div>}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* نافذة المحادثة */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!selectedContact ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
                <div style={{ fontSize: '42px', marginBottom: '10px' }}>💬</div>
                <div style={{ fontSize: '13px' }}>اختر شخصاً للمراسلة</div>
              </div>
            ) : (
              <>
                {/* رأس */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px', background: '#fafafa' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#E1F5EE', color: '#085041', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedContact.name?.slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{selectedContact.name}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{selectedContact.department}</div>
                  </div>
                </div>

                {/* الرسائل */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#fdfdfd' }}>
                  {loadingMessages ? (
                    <div style={{ textAlign: 'center', color: '#aaa', padding: '20px', fontSize: '12px' }}>جارٍ التحميل...</div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#aaa', padding: '30px', fontSize: '12px' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>👋</div>
                      ابدأ المحادثة مع {selectedContact.name}
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const mine = isMe(msg);
                      const showDate = idx === 0 ||
                        new Date(msg.createdAt).toDateString() !== new Date(messages[idx - 1].createdAt).toDateString();
                      return (
                        <div key={msg._id || idx}>
                          {showDate && (
                            <div style={{ textAlign: 'center', margin: '8px 0' }}>
                              <span style={{ fontSize: '10px', color: '#aaa', background: '#f0f0f0', padding: '2px 10px', borderRadius: '999px' }}>
                                {new Date(msg.createdAt).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </span>
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                            {!mine && <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '2px' }}>{msg.sender?.name}</div>}
                            <div style={{ maxWidth: '68%', padding: '9px 13px', borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: mine ? '#1D9E75' : '#f0f0f0', color: mine ? 'white' : '#333', fontSize: '13px', lineHeight: '1.5', wordBreak: 'break-word' }}>
                              {msg.content}
                            </div>
                            <div style={{ fontSize: '10px', color: '#bbb', marginTop: '3px' }}>
                              {formatTime(msg.createdAt)}
                              {mine && ' ✓✓'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* الإدخال */}
                <div style={{ padding: '10px 14px', borderTop: '1px solid #eee', display: 'flex', gap: '8px' }}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    placeholder={`رسالة إلى ${selectedContact.name}...`}
                    style={{ flex: 1, padding: '9px 14px', border: '1.5px solid #eee', borderRadius: '22px', fontSize: '13px', outline: 'none', direction: 'rtl', background: '#f9f9f9' }}
                    onFocus={e => e.target.style.borderColor = '#1D9E75'}
                    onBlur={e => e.target.style.borderColor = '#eee'}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    style={{ width: '38px', height: '38px', background: input.trim() ? '#1D9E75' : '#eee', color: input.trim() ? 'white' : '#bbb', border: 'none', borderRadius: '50%', cursor: input.trim() ? 'pointer' : 'default', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
                  >
                    ➤
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}