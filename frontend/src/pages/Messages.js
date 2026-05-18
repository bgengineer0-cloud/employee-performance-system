import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

const colors = ['#E1F5EE','#EEEDFE','#FAEEDA','#FCEBEB','#E6F1FB','#FFF0F0','#F0FFF4','#FFF8E1'];
const textColors = ['#085041','#3C3489','#633806','#791F1F','#0C447C','#7C0000','#005C24','#7C5200'];

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

const formatFullDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
};

export default function Messages() {
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState('');
  const [lastMessages, setLastMessages] = useState({});
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // جلب قائمة جهات الاتصال
  const loadContacts = () => {
    setLoadingContacts(true);
    api.get('/messages/users')
      .then(async res => {
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
      })
      .catch(console.error)
      .finally(() => setLoadingContacts(false));
  };

  useEffect(() => {
    loadContacts();
  }, []);

  // جلب المحادثة + polling
  useEffect(() => {
    if (!selected) return;
    if (pollRef.current) clearInterval(pollRef.current);

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/messages/conversation/${selected._id}`);
        const msgs = res.data.messages || [];
        setMessages(msgs);
        if (msgs.length > 0) {
          setLastMessages(prev => ({ ...prev, [selected._id]: msgs[msgs.length - 1] }));
        }
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } catch (err) {
        console.error(err);
      }
    };

    setLoadingMessages(true);
    fetchMessages().finally(() => setLoadingMessages(false));

    // تحديث كل 3 ثوانٍ
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [selected]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !selected) return;
    setInput('');

    try {
      const res = await api.post('/messages', {
        recipient: selected._id,
        content: text,
      });
      const newMsg = res.data.message;
      setMessages(prev => [...prev, newMsg]);
      setLastMessages(prev => ({ ...prev, [selected._id]: newMsg }));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('فشل إرسال الرسالة:', err);
    }
  };

  const isMe = (msg) => {
    const senderId = msg.sender?._id || msg.sender;
    return senderId?.toString() === currentUser._id?.toString();
  };

  const filteredContacts = contacts.filter(c =>
    c.name?.includes(search) ||
    c.department?.includes(search) ||
    c.employeeId?.includes(search)
  );

  const roleLabel = (role) => {
    if (role === 'admin') return 'مدير النظام';
    if (role === 'manager') return 'مدير';
    return 'موظف';
  };

  return (
    <div style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif', direction: 'rtl' }}>
      <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>الرسائل</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '14px', height: '560px' }}>

        {/* ── قائمة جهات الاتصال ── */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* بحث */}
          <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 ابحث..."
              style={{ width: '100%', padding: '7px 12px', border: '1px solid #eee', borderRadius: '20px', fontSize: '12px', outline: 'none', direction: 'rtl' }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingContacts ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
                جارٍ تحميل جهات الاتصال...
              </div>
            ) : filteredContacts.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
                لا توجد جهات اتصال
              </div>
            ) : (
              filteredContacts.map((contact, i) => {
                const isSelected = selected?._id === contact._id;
                const lastMsg = lastMessages[contact._id];
                const hasUnread = lastMsg && !isMe(lastMsg) && !lastMsg.isRead;

                return (
                  <div
                    key={contact._id}
                    onClick={() => setSelected(contact)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #f8f8f8',
                      cursor: 'pointer',
                      background: isSelected ? '#E8F7F2' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background 0.15s',
                      borderRight: isSelected ? '3px solid #1D9E75' : '3px solid transparent'
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafafa'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'white'; }}
                  >
                    {/* أيقونة */}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: colors[i % colors.length],
                      color: textColors[i % textColors.length],
                      fontSize: '13px', fontWeight: '700',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, position: 'relative'
                    }}>
                      {contact.name?.slice(0, 2)}
                      {hasUnread && (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '10px', height: '10px', background: '#E24B4A', borderRadius: '50%', border: '2px solid white' }} />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', fontWeight: hasUnread ? '700' : '500', color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {contact.name}
                        </div>
                        {lastMsg && (
                          <div style={{ fontSize: '10px', color: '#bbb', flexShrink: 0, marginRight: '6px' }}>
                            {formatTime(lastMsg.createdAt)}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                        <div style={{ fontSize: '11px', color: hasUnread ? '#1D9E75' : '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {lastMsg ? (
                            isMe(lastMsg)
                              ? `أنت: ${lastMsg.content}`
                              : lastMsg.content
                          ) : (
                            <span style={{ color: '#bbb' }}>
                              {roleLabel(contact.role)} — {contact.department}
                            </span>
                          )}
                        </div>
                        {hasUnread && (
                          <div style={{ width: '8px', height: '8px', background: '#1D9E75', borderRadius: '50%', flexShrink: 0, marginRight: '4px' }} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* عداد */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid #f0f0f0', fontSize: '11px', color: '#aaa', textAlign: 'center' }}>
            {contacts.length} جهة اتصال
          </div>
        </div>

        {/* ── نافذة المحادثة ── */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eee', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
              <div style={{ fontSize: '52px', marginBottom: '14px' }}>💬</div>
              <div style={{ fontSize: '15px', fontWeight: '500', color: '#888' }}>اختر محادثة</div>
              <div style={{ fontSize: '12px', marginTop: '6px', color: '#bbb' }}>
                اختر شخصاً من القائمة لبدء المراسلة
              </div>
            </div>
          ) : (
            <>
              {/* رأس المحادثة */}
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '12px', background: '#fafafa' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#E1F5EE', color: '#0F6E56', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {selected.name?.slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{selected.name}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>
                    {roleLabel(selected.role)} — {selected.department}
                    {selected.employeeId && ` — ${selected.employeeId}`}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#1D9E75', background: '#E1F5EE', padding: '3px 10px', borderRadius: '999px' }}>
                  ● متاح
                </div>
              </div>

              {/* الرسائل */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#fdfdfd' }}>
                {loadingMessages ? (
                  <div style={{ textAlign: 'center', color: '#aaa', padding: '30px', fontSize: '13px' }}>
                    جارٍ تحميل الرسائل...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>👋</div>
                    <div style={{ fontSize: '13px' }}>لا توجد رسائل بعد</div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>ابدأ المحادثة مع {selected.name}</div>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const mine = isMe(msg);
                    const showDateSep = idx === 0 ||
                      new Date(msg.createdAt).toDateString() !== new Date(messages[idx - 1].createdAt).toDateString();

                    return (
                      <div key={msg._id || idx}>
                        {/* فاصل التاريخ */}
                        {showDateSep && (
                          <div style={{ textAlign: 'center', margin: '10px 0' }}>
                            <span style={{ fontSize: '11px', color: '#aaa', background: '#f0f0f0', padding: '3px 14px', borderRadius: '999px' }}>
                              {formatFullDate(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                          {!mine && (
                            <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '3px', paddingRight: '4px' }}>
                              {msg.sender?.name}
                            </div>
                          )}
                          <div style={{
                            maxWidth: '65%',
                            padding: '10px 14px',
                            borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: mine ? '#1D9E75' : '#f0f0f0',
                            color: mine ? 'white' : '#333',
                            fontSize: '13px',
                            lineHeight: '1.6',
                            wordBreak: 'break-word',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}>
                            {msg.content}
                          </div>
                          <div style={{ fontSize: '10px', color: '#bbb', marginTop: '4px', paddingLeft: mine ? '0' : '4px', paddingRight: mine ? '4px' : '0' }}>
                            {formatTime(msg.createdAt)}
                            {mine && <span style={{ marginRight: '4px', color: msg.isRead ? '#1D9E75' : '#bbb' }}>✓✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* حقل الإدخال */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid #eee', display: 'flex', gap: '8px', alignItems: 'center', background: 'white' }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={`رسالة إلى ${selected.name}...`}
                  style={{
                    flex: 1, padding: '10px 16px',
                    border: '1.5px solid #eee',
                    borderRadius: '24px',
                    fontSize: '13px', outline: 'none',
                    direction: 'rtl',
                    background: '#f9f9f9',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#1D9E75'}
                  onBlur={e => e.target.style.borderColor = '#eee'}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  style={{
                    width: '42px', height: '42px',
                    background: input.trim() ? '#1D9E75' : '#eee',
                    color: input.trim() ? 'white' : '#bbb',
                    border: 'none', borderRadius: '50%',
                    cursor: input.trim() ? 'pointer' : 'default',
                    fontSize: '18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s'
                  }}
                >
                  ➤
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}