const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ضع رابط Atlas مباشرة هنا
const MONGO_URI = 'mongodb+srv://dbadmin:dbAdmin2026@cluster0.xhspm5x.mongodb.net/employee_performance_db?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI).then(async () => {
  console.log('✅ Connected to MongoDB Atlas');

  // تعريف النماذج مباشرة
  const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: 'employee' },
    department: String,
    isActive: { type: Boolean, default: true },
  }, { timestamps: true });

  const User = mongoose.models.User || mongoose.model('User', userSchema);

  // حذف المستخدمين القديمة
  await User.deleteMany({});
  console.log('🗑 Cleared old users');

  // إنشاء Admin
  const adminHash = await bcrypt.hash('admin123', 10);
  await User.create({
    name: 'Admin User',
    email: 'admin@company.com',
    password: adminHash,
    role: 'admin',
    department: 'الموارد البشرية',
    isActive: true,
  });
  console.log('✅ Admin: admin@company.com / admin123');

  // إنشاء Manager
  const managerHash = await bcrypt.hash('manager123', 10);
  await User.create({
    name: 'نورة العتيبي',
    email: 'manager@company.com',
    password: managerHash,
    role: 'manager',
    department: 'تقنية المعلومات',
    isActive: true,
  });
  console.log('✅ Manager: manager@company.com / manager123');

  console.log('\n🎉 Production database seeded successfully!');
  process.exit(0);

}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});