const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('✅ Connected');

  // حذف كل المستخدمين
  const db = mongoose.connection.db;
  await db.collection('users').deleteMany({});
  console.log('🗑 Cleared all users');

  // إنشاء كلمة مرور مشفرة
  const hash = await bcrypt.hash('admin123', 10);
  console.log('🔑 Hash created:', hash);

  // إدخال Admin مباشرة
  await db.collection('users').insertOne({
    name: 'Admin User',
    email: 'admin@company.com',
    password: hash,
    role: 'admin',
    department: 'الموارد البشرية',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log('✅ Admin created: admin@company.com / admin123');

  // إدخال Manager مباشرة
  const hash2 = await bcrypt.hash('manager123', 10);
  await db.collection('users').insertOne({
    name: 'Manager User',
    email: 'manager@company.com',
    password: hash2,
    role: 'manager',
    department: 'تقنية المعلومات',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log('✅ Manager created: manager@company.com / manager123');

  // تأكد من الحفظ
  const users = await db.collection('users').find({}).toArray();
  console.log('\n📋 Users in database:');
  users.forEach(u => console.log(`  - ${u.email} | role: ${u.role} | active: ${u.isActive}`));

  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});