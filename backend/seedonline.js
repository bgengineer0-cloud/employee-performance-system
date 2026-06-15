const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://dbadmin:SecurePass2026@ac-ge0ye5e-shard-00-00.xhspm5x.mongodb.net:27017,ac-ge0ye5e-shard-00-01.xhspm5x.mongodb.net:27017,ac-ge0ye5e-shard-00-02.xhspm5x.mongodb.net:27017/?ssl=true&replicaSet=atlas-d6g362-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(MONGO_URI).then(async () => {
  console.log('Connected to Atlas');
  const db = mongoose.connection.db;

  await db.collection('users').deleteMany({});

  const hash = await bcrypt.hash('admin123', 10);
  await db.collection('users').insertOne({
    name: 'Admin',
    email: 'admin@company.com',
    password: hash,
    role: 'admin',
    department: 'الإدارة',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('✅ Done');
  console.log('Email: admin@company.com');
  console.log('Password: admin123');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});