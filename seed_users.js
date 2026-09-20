const { db, initSchema } = require('./server/src/db/database');

initSchema();

const usersWithPasswords = [
  { username: 'admin', password: 'admin123', full_name: 'System Administrator', email: 'admin@company.com', role: 'ADMIN', assigned_warehouse_id: null, assigned_branch_id: null },
  { username: 'it_alex', password: 'it123', full_name: 'Alex Reyes (Senior IT Field Specialist)', email: 'alex.reyes@company.com', role: 'IT', assigned_warehouse_id: 1, assigned_branch_id: null },
  { username: 'am_bob', password: 'ac123', full_name: 'Roberto "Bob" Valenzuela (AC-NCR)', email: 'bob.valenzuela@company.com', role: 'AC', assigned_warehouse_id: 1, assigned_branch_id: null },
  { username: 'am_bautista', password: 'ac123', full_name: 'Ma. Elena Bautista (AC-NorthLuzon)', email: 'elena.bautista@company.com', role: 'AC', assigned_warehouse_id: 6, assigned_branch_id: null },
  { username: 'gsd_carla', password: 'gsd123', full_name: 'Carla Mendoza (Purchasing/GSD Lead)', email: 'carla.gsd@company.com', role: 'GSD', assigned_warehouse_id: null, assigned_branch_id: null },
  { username: 'wh_eduardo', password: 'wh123', full_name: 'Eduardo Ramos (Central NCR WH Mgr)', email: 'wh.eduardo@company.com', role: 'WAREHOUSE', assigned_warehouse_id: 1, assigned_branch_id: null },
  { username: 'wh_vicente', password: 'wh123', full_name: 'Vicente Tan (Visayas WH Mgr)', email: 'wh.vicente@company.com', role: 'WAREHOUSE', assigned_warehouse_id: 14, assigned_branch_id: null },
  { username: 'branch_maria', password: 'branch123', full_name: 'Maria Corazon Santos (Branch 001 Head)', email: 'maria.santos@branch.company.com', role: 'BRANCH', assigned_warehouse_id: null, assigned_branch_id: 1 },
  { username: 'branch_michelle', password: 'branch123', full_name: 'Michelle Lim (Branch 045 Head)', email: 'michelle.lim@branch.company.com', role: 'BRANCH', assigned_warehouse_id: null, assigned_branch_id: 45 }
];

const updateStmt = db.prepare(`
  UPDATE users SET password = ? WHERE username = ?
`);

const insertStmt = db.prepare(`
  INSERT INTO users (username, password, full_name, email, role, assigned_warehouse_id, assigned_branch_id)
  VALUES (@username, @password, @full_name, @email, @role, @assigned_warehouse_id, @assigned_branch_id)
`);

for (const u of usersWithPasswords) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
  if (existing) {
    updateStmt.run(u.password, u.username);
  } else {
    insertStmt.run(u);
  }
}

console.log('Successfully updated passwords for all role accounts!');
