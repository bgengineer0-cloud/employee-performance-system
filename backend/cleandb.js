const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('✅ Connected');
  const db = mongoose.connection.db;

  // احذف كل شيء عدا Admin
  await db.collection('users').deleteMany({ role: { $ne: 'admin' } });
  console.log('🗑 Deleted all users except admin');

  await db.collection('employees').deleteMany({});
  console.log('🗑 Deleted all employees');

  await db.collection('tasks').deleteMany({});
  console.log('🗑 Deleted all tasks');

  await db.collection('evaluations').deleteMany({});
  console.log('🗑 Deleted all evaluations');

  await db.collection('attendances').deleteMany({});
  console.log('🗑 Deleted all attendance');

  await db.collection('messages').deleteMany({});
  console.log('🗑 Deleted all messages');

  await db.collection('departments').deleteMany({});
  console.log('🗑 Deleted all departments');

  // تأكد أن Admin موجود
  const admin = await db.collection('users').findOne({ role: 'admin' });
  if (admin) {
    console.log('✅ Admin exists:', admin.email);
  } else {
    console.log('⚠ No admin found — run resetusers.js first');
  }

  console.log('\n✅ Database cleaned successfully');
  console.log('Now only admin account exists');
  console.log('Add departments and employees from the system UI');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});