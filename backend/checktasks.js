const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Employee = require('./models/Employee');
  const Task = require('./models/Task');

  console.log('\n=== الموظفون ===');
  const employees = await Employee.find({});
  employees.forEach(e => {
    console.log(`${e.name} | ${e.email} | ${e._id}`);
  });

  console.log('\n=== المهام ===');
  const tasks = await Task.find({}).populate('assignedTo', 'name email');
  if (tasks.length === 0) {
    console.log('لا توجد مهام في قاعدة البيانات');
  } else {
    tasks.forEach(t => {
      console.log(`"${t.title}" → ${t.assignedTo?.name || 'غير معروف'} (${t.assignedTo?.email || t.assignedTo})`);
    });
  }

  process.exit();
});