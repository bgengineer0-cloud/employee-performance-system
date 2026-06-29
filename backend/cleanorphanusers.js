const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('✅ Connected');
  const db = mongoose.connection.db;

  // جلب كل المستخدمين عدا admin
  const users = await db.collection('users').find({ role: { $ne: 'admin' } }).toArray();
  console.log(`Found ${users.length} non-admin users`);

  let deletedCount = 0;
  for (const user of users) {
    // تحقق إذا كان له سجل Employee مرتبط
    const employee = await db.collection('employees').findOne({ email: user.email });
    if (!employee) {
      await db.collection('users').deleteOne({ _id: user._id });
      console.log(`🗑 Deleted orphan user: ${user.email} (no matching employee)`);
      deletedCount++;
    } else {
      console.log(`✓ Kept user: ${user.email} (has matching employee)`);
    }
  }

  console.log(`\n✅ Cleanup done — deleted ${deletedCount} orphan user accounts`);
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});