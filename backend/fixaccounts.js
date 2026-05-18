const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Employee = require('./models/Employee');
  const User = require('./models/User');

  const employees = await Employee.find({ status: { $ne: 'terminated' } });
  console.log(`وجدت ${employees.length} موظف`);

  let created = 0;
  let existing = 0;

  for (const emp of employees) {
    const exists = await User.findOne({ email: emp.email });
    if (exists) {
      existing++;
      console.log(`✓ موجود: ${emp.name} — ${emp.email}`);
      continue;
    }

    const password = emp.name.replace(/\s+/g, '').slice(0, 6) + '123';
    const hash = await bcrypt.hash(password, 10);

    await User.create({
      name: emp.name,
      email: emp.email,
      password: hash,
      role: 'employee',
      department: emp.department,
      isActive: true,
    });

    created++;
    console.log(`✅ أُنشئ: ${emp.name} — ${emp.email} / ${password}`);
  }

  console.log(`\nالنتيجة: ${created} حساب جديد، ${existing} حساب موجود`);
  process.exit();
}).catch(err => { console.error(err); process.exit(1); });