require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const { User, Category, MenuItem, Coupon, CanteenSettings, Announcement } = require('../models');
const dataset = require('./menu_dataset.json');

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true }); // WARNING: wipes existing data, demo-only
    console.log('Tables reset.');

    // --- demo users ---
    // Easy, memorable demo credentials as requested — login field is still
    // usn_or_id under the hood, these are just easy-to-type values for it.
    await User.bulkCreate([
      {
        name: 'Demo Student', usn_or_id: 'student', phone: '9900000001',
        password_hash: await bcrypt.hash('Student@123', 10),
        role: 'student', wallet_balance: 200, referral_code: 'STUDENT001',
      },
      {
        name: 'Demo Kitchen Staff', usn_or_id: 'kitchen01', phone: '9900000002',
        password_hash: await bcrypt.hash('Kitchen@123', 10),
        role: 'canteen_staff', referral_code: 'KITCHEN001',
      },
      {
        name: 'Demo Manager', usn_or_id: 'manager01', phone: '9900000004',
        password_hash: await bcrypt.hash('Manager@123', 10),
        role: 'manager', referral_code: 'MANAGER001',
      },
      {
        name: 'Demo Admin', usn_or_id: 'admin01', phone: '9900000003',
        password_hash: await bcrypt.hash('Admin@123', 10),
        role: 'admin', referral_code: 'ADMIN00001',
      },
    ]);
    console.log('Demo users: student/Student@123, kitchen01/Kitchen@123, manager01/Manager@123, admin01/Admin@123');

    // --- categories + menu items ---
    for (const cat of dataset.categories) {
      const category = await Category.create({
        name: cat.name,
        slug: cat.slug,
        sort_order: cat.sort_order,
      });

      const items = cat.items.map((item) => ({ ...item, category_id: category.id }));
      await MenuItem.bulkCreate(items);
      console.log(`Seeded category "${cat.name}" with ${items.length} items.`);
    }

    // --- demo coupons ---
    await Coupon.bulkCreate([
      { code: 'WELCOME10', discount_percent: 10, min_order_amount: 0 },
      { code: 'BIGLUNCH20', discount_percent: 20, min_order_amount: 100 },
    ]);
    console.log('Demo coupons created: WELCOME10, BIGLUNCH20.');

    // --- canteen settings (single row) ---
    await CanteenSettings.create({ id: 1, opens_at: '08:00', closes_at: '20:00', tax_percent: 5 });
    console.log('Canteen settings seeded (5% tax, 8am-8pm).');

    // --- demo announcement ---
    await Announcement.create({ message: 'Welcome to Smart Canteen! Order ahead to skip the queue.' });
    console.log('Demo announcement seeded.');

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
