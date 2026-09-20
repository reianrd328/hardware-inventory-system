const { db } = require('./database');

function seedAllWarehouseAccounts() {
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, password, full_name, email, role, assigned_warehouse_id, assigned_branch_id, is_active)
    VALUES (@username, @password, @full_name, @email, @role, @assigned_warehouse_id, @assigned_branch_id, 1)
  `);

  const allWh = db.prepare('SELECT id, code, name, contact_person FROM warehouses ORDER BY id ASC').all();
  for (const wh of allWh) {
    const codeSlug = wh.code.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^wh/, '');
    const username = `wh_${codeSlug}`;
    const email = `${username}@warehouse.company.com`;
    insertUser.run({
      username,
      password: 'wh123',
      full_name: `${wh.contact_person} (${wh.code} Custodian)`,
      email,
      role: 'WAREHOUSE',
      assigned_warehouse_id: wh.id,
      assigned_branch_id: null
    });
  }

  // Also ensure wh_eduardo and wh_vicente exist
  insertUser.run({
    username: 'wh_eduardo',
    password: 'wh123',
    full_name: 'Eduardo Ramos (Central NCR WH Mgr)',
    email: 'wh.eduardo@company.com',
    role: 'WAREHOUSE',
    assigned_warehouse_id: 1,
    assigned_branch_id: null
  });

  insertUser.run({
    username: 'wh_vicente',
    password: 'wh123',
    full_name: 'Vicente Tan (Visayas WH Mgr)',
    email: 'wh.vicente@company.com',
    role: 'WAREHOUSE',
    assigned_warehouse_id: 14,
    assigned_branch_id: null
  });

  const count = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'WAREHOUSE'").get().count;
  console.log(`Warehouse accounts successfully seeded. Total WAREHOUSE users: ${count}`);
}

seedAllWarehouseAccounts();
