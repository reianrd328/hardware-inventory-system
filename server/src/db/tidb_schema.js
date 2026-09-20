/**
 * TiDB Cloud / MySQL Schema & Auto-Seeding
 */

async function initTiDBSchema(pool) {
  console.log('[TiDB] Initializing database schema on TiDB Cloud...');

  // Create tables in sequence respecting foreign key references
  await pool.query(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      region VARCHAR(255) NOT NULL,
      area VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      contact_person VARCHAR(255) NOT NULL,
      phone VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      is_active TINYINT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS branches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      region VARCHAR(255) NOT NULL,
      area VARCHAR(255) NOT NULL,
      assigned_warehouse_id INT,
      area_manager_name VARCHAR(255) NOT NULL,
      contact_person VARCHAR(255) NOT NULL,
      phone VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      is_active TINYINT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_assigned_warehouse (assigned_warehouse_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS hardware_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      icon VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS hardware_catalog (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT NOT NULL,
      sku VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(255) NOT NULL,
      model VARCHAR(255) NOT NULL,
      specifications TEXT,
      unit VARCHAR(50) DEFAULT 'Unit',
      default_min_threshold INT DEFAULT 5,
      is_custom TINYINT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_category (category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS warehouse_stocks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      warehouse_id INT NOT NULL,
      hardware_id INT NOT NULL,
      quantity_on_hand INT NOT NULL DEFAULT 0,
      quantity_reserved INT NOT NULL DEFAULT 0,
      min_threshold INT NOT NULL DEFAULT 5,
      max_threshold INT NOT NULL DEFAULT 50,
      last_restocked_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_wh_hw (warehouse_id, hardware_id),
      INDEX idx_stock_wh (warehouse_id),
      INDEX idx_stock_hw (hardware_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS hardware_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_no VARCHAR(100) UNIQUE NOT NULL,
      request_type VARCHAR(50) NOT NULL DEFAULT 'PERMANENT',
      branch_id INT NOT NULL,
      warehouse_id INT NOT NULL,
      requester_name VARCHAR(255) NOT NULL,
      requester_role VARCHAR(100) NOT NULL DEFAULT 'IT Engineer',
      recipient_name VARCHAR(255) NOT NULL,
      recipient_role VARCHAR(100) NOT NULL,
      recipient_id VARCHAR(100),
      purpose TEXT NOT NULL,
      status VARCHAR(100) NOT NULL DEFAULT 'PENDING_AM_APPROVAL',
      
      am_approval_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      am_approved_at DATETIME,
      am_approver_name VARCHAR(255),
      am_remarks TEXT,

      dispatched_at DATETIME,
      dispatched_by VARCHAR(255),
      carrier_name VARCHAR(255),
      tracking_no VARCHAR(100),

      branch_arrived_at DATETIME,
      branch_accepted_by VARCHAR(255),
      branch_condition VARCHAR(100),
      branch_remarks TEXT,

      borrow_expected_return_date DATE,
      borrow_returned_at DATETIME,
      borrow_return_condition VARCHAR(100),

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_req_branch (branch_id),
      INDEX idx_req_warehouse (warehouse_id),
      INDEX idx_req_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS request_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      hardware_id INT NOT NULL,
      quantity INT NOT NULL,
      serial_numbers TEXT,
      INDEX idx_req_items_req (request_id),
      INDEX idx_req_items_hw (hardware_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS replenishments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      po_number VARCHAR(100) UNIQUE NOT NULL,
      warehouse_id INT NOT NULL,
      destination_branch_id INT,
      gsd_staff_name VARCHAR(255) NOT NULL,
      supplier_name VARCHAR(255) NOT NULL,
      status VARCHAR(100) NOT NULL DEFAULT 'IN_TRANSIT',
      estimated_arrival DATE,
      shipped_at DATETIME,
      
      arrived_at DATETIME,
      warehouse_accepted_by VARCHAR(255),
      arrival_remarks TEXT,

      branch_received_at DATETIME,
      branch_confirmed_by VARCHAR(255),
      branch_condition VARCHAR(100),
      branch_remarks TEXT,
      
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rep_warehouse (warehouse_id),
      INDEX idx_rep_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS replenishment_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      replenishment_id INT NOT NULL,
      hardware_id INT NOT NULL,
      quantity_ordered INT NOT NULL,
      quantity_received INT DEFAULT 0,
      INDEX idx_rep_items_rep (replenishment_id),
      INDEX idx_rep_items_hw (hardware_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      movement_type VARCHAR(100) NOT NULL,
      warehouse_id INT NOT NULL,
      branch_id INT,
      hardware_id INT NOT NULL,
      quantity INT NOT NULL,
      balance_after INT NOT NULL,
      reference_type VARCHAR(100),
      reference_id VARCHAR(100),
      recipient_name VARCHAR(255),
      performed_by VARCHAR(255) NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_mov_wh (warehouse_id),
      INDEX idx_mov_hw (hardware_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recipient_role VARCHAR(100) NOT NULL,
      type VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      link_url VARCHAR(255),
      is_read TINYINT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notif_role (recipient_role),
      INDEX idx_notif_read (is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL DEFAULT 'password123',
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'IT',
      assigned_warehouse_id INT,
      assigned_branch_id INT,
      is_active TINYINT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS warehouse_restock_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_no VARCHAR(100) UNIQUE NOT NULL,
      warehouse_id INT NOT NULL,
      hardware_id INT NOT NULL,
      requested_quantity INT NOT NULL,
      urgency VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
      reason TEXT,
      requested_by VARCHAR(255) NOT NULL,
      status VARCHAR(100) NOT NULL DEFAULT 'PENDING_AC_APPROVAL',
      ac_approver_name VARCHAR(255),
      ac_remarks TEXT,
      ac_reviewed_at DATETIME,
      po_number VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_wrr_wh (warehouse_id),
      INDEX idx_wrr_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('[TiDB] All 13 tables verified/created successfully.');
  await seedTiDBIfEmpty(pool);
}

async function seedTiDBIfEmpty(pool) {
  const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
  if (users[0].count > 0) {
    console.log('[TiDB] Database already has accounts. Skipping auto-seeding.');
    return;
  }

  console.log('[TiDB] Empty database detected. Seeding baseline accounts & topology...');

  // 1. Core Users
  await pool.query(`
    INSERT INTO users (username, password, full_name, email, role, is_active) VALUES
    ('admin', 'admin123', 'System Administrator', 'admin@company.com', 'ADMIN', 1),
    ('ac_roberto', 'password123', 'Roberto "Bob" Valenzuela (AC)', 'ac.valenzuela@company.com', 'AC', 1),
    ('gsd_carla', 'password123', 'Carla Mendoza (Purchasing/GSD Lead)', 'gsd.mendoza@company.com', 'GSD', 1),
    ('it_engineer', 'password123', 'Mark Anthony Santos (IT Field Eng)', 'it.santos@company.com', 'IT', 1)
  `);

  // 2. Default Hardware Categories
  await pool.query(`
    INSERT INTO hardware_categories (name, description, icon) VALUES
    ('CPU & Workstations', 'Desktop computers, micro-PCs, towers, POS controller units', 'Cpu'),
    ('Monitors & Displays', 'FHD & QHD commercial LED displays, teller monitors', 'Monitor'),
    ('Memory & Storage', 'RAM DIMM modules, SSD NVMe/SATA internal drives', 'HardDrive'),
    ('Networking Hardware', 'Gigabit switches, VPN routers, access points, PoE hubs', 'Network'),
    ('Printers & POS Peripherals', 'Thermal receipt printers, network laser printers, barcode readers', 'Printer'),
    ('Power & Protection', 'Uninterruptible power supplies, voltage regulators', 'Zap'),
    ('Input & Accessories', 'Keyboards, mice, webcams, headsets, smart card readers', 'Keyboard')
  `);

  // 3. Baseline Warehouses
  await pool.query(`
    INSERT INTO warehouses (code, name, region, area, address, contact_person, phone, email) VALUES
    ('WHS-0000001', 'Warehosue-Cainta', 'National Capital Region', 'Rizal', 'Cainta Logistics Center, Rizal', 'Cainta Custodian', '+63 917 111 0001', 'wh.cainta@company.com'),
    ('WHS-0000002', 'Warehosue-tanay', 'National Capital Region', 'Rizal', 'Tanay Hub, Rizal', 'jen bacuz', '+63 917 111 0002', 'wh.tanay@company.com')
  `);

  // Bind warehouse custodian user account
  await pool.query(`
    INSERT INTO users (username, password, full_name, email, role, assigned_warehouse_id, is_active) VALUES
    ('whs-0000001', 'password123', 'Cainta Warehouse Custodian', 'wh.cainta@company.com', 'WAREHOUSE', 1, 1),
    ('whs-0000002', 'password123', 'jen bacuz', 'wh.tanay@company.com', 'WAREHOUSE', 2, 1)
  `);

  // 4. Baseline Branches (5 sample branches)
  const branches = [
    { code: 'BR-101', name: 'Branch 101 - Cainta Junction', region: 'National Capital Region', area: 'Rizal', wh_id: 1, mgr: 'Roberto Valenzuela', contact: 'Maria Santos', phone: '+63 918 101 0001', email: 'br101@company.com', addr: 'Felix Ave, Cainta, Rizal' },
    { code: 'BR-102', name: 'Branch 102 - Taytay Commercial', region: 'National Capital Region', area: 'Rizal', wh_id: 1, mgr: 'Roberto Valenzuela', contact: 'John Reyes', phone: '+63 918 102 0002', email: 'br102@company.com', addr: 'Manila East Rd, Taytay, Rizal' },
    { code: 'BR-103', name: 'Branch 103 - Tanay Town Center', region: 'National Capital Region', area: 'Rizal', wh_id: 2, mgr: 'Roberto Valenzuela', contact: 'Anna Cruz', phone: '+63 918 103 0003', email: 'br103@company.com', addr: 'Sampaloc Rd, Tanay, Rizal' },
    { code: 'BR-104', name: 'Branch 104 - Iligan City Roxas', region: 'Mindanao', area: 'Iligan', wh_id: 2, mgr: 'Roberto Valenzuela', contact: 'Maria Santos', phone: '+63 918 104 0004', email: 'br104@company.com', addr: 'Roxas Ave, Iligan City' },
    { code: 'BR-105', name: 'Branch 105 - Malaybalay Bukidnon', region: 'Mindanao', area: 'Bukidnon', wh_id: 2, mgr: 'Roberto Valenzuela', contact: 'Roberto Gomez', phone: '+63 918 105 0005', email: 'br105@company.com', addr: 'Fortich St, Malaybalay, Bukidnon' }
  ];

  for (const b of branches) {
    await pool.query(
      `INSERT INTO branches (code, name, region, area, assigned_warehouse_id, area_manager_name, contact_person, phone, email, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.code, b.name, b.region, b.area, b.wh_id, b.mgr, b.contact, b.phone, b.email, b.addr]
    );
  }

  // 5. Initial Hardware Items
  await pool.query(`
    INSERT INTO hardware_catalog (category_id, sku, name, brand, model, specifications, unit, default_min_threshold) VALUES
    (1, 'CPU-I5-12400', 'Intel Core i5-12400 Workstation Tower', 'HP ProDesk', '400 G9 Microtower', 'Core i5-12400, 16GB DDR4, 512GB NVMe SSD, Win11 Pro', 'Unit', 5),
    (1, 'CES000001', 'intel tutututtu', 'asus', 'asdsadad', 'Intel Core i5, 8GB RAM, 256GB SSD', 'Unit', 5),
    (2, 'MON-DELL-24', 'Dell 24" P2422H IPS FHD Monitor', 'Dell', 'P2422H', '23.8" IPS 1920x1080 @ 60Hz, DP/HDMI/VGA', 'Unit', 5),
    (5, 'PRN-EPSON-TM', 'Epson TM-T82X Receipt Printer', 'Epson', 'TM-T82X', 'Thermal receipt printer with auto-cutter, USB', 'Unit', 5)
  `);

  // 6. System Initialization Notification
  await pool.query(`
    INSERT INTO notifications (recipient_role, type, title, message) VALUES
    ('ALL', 'REQUEST_CREATED', 'System Live on TiDB Cloud', 'Hardware Stock Monitoring & Branch Requisition System is connected to TiDB Cloud with persistent storage.')
  `);

  console.log('[TiDB] Baseline seed complete.');
}

module.exports = {
  initTiDBSchema,
  seedTiDBIfEmpty
};
