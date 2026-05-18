const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('✅ Connected to MongoDB');

  // Load the User model
  const User = require('./models/User');

  // Check existing users
  const existing = await User.find({});
  console.log('Existing users:', existing.length);
  existing.forEach(u => console.log(' -', u.email, '/', u.role));

  // Delete all
  await User.deleteMany({});
  console.log('Deleted all users');

  // Create fresh admin - password hashed manually
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);

  console.log('Hashed password:', hashedPassword);

  const admin = new User({
    name: 'Admin User',
    email: 'admin@company.com',
    password: hashedPassword,
    role: 'admin',
    department: 'HR',
    isActive: true
  });

  // Save WITHOUT triggering pre-save hook (to avoid double hashing)
  await User.collection.insertOne({
    name: 'Admin User',
    email: 'admin@company.com',
    password: hashedPassword,
    role: 'admin',
    department: 'HR',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('✅ Admin inserted directly');

  // Verify
  const check = await User.findOne({ email: 'admin@company.com' });
  console.log('Verification - found user:', check?.email);

  const match = await bcrypt.compare('admin123', check.password);
  console.log('Password match test:', match);

  process.exit();
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});