const path = require('path');
const fs = require('fs');
const { AsyncLocalStorage } = require('async_hooks');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { initTiDBSchema } = require('./tidb_schema');

const asyncLocalStorage = new AsyncLocalStorage();

// Check if TiDB Cloud or MySQL configuration is present
const isTiDB = Boolean(
  process.env.TIDB_HOST ||
  process.env.DATABASE_URL ||
  (process.env.DB_HOST && process.env.DB_HOST !== 'localhost')
);

let db = null;
let sqliteDb = null;
let pool = null;

if (isTiDB) {
  const mysql = require('mysql2/promise');

  console.log('====================================================');
  console.log('[Database] Connecting to TiDB Cloud / Remote MySQL...');
  console.log(`[Database] Host: ${process.env.TIDB_HOST || 'via DATABASE_URL'}`);
  console.log(`[Database] Port: ${process.env.TIDB_PORT || 4000}`);
  console.log(`[Database] Database: ${process.env.TIDB_DATABASE || 'test'}`);
  console.log('====================================================');

  const connectionConfig = process.env.DATABASE_URL
    ? {
        uri: process.env.DATABASE_URL,
        ssl: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: true
        }
      }
    : {
        host: process.env.TIDB_HOST,
        port: Number(process.env.TIDB_PORT) || 4000,
        user: process.env.TIDB_USER,
        password: process.env.TIDB_PASSWORD,
        database: process.env.TIDB_DATABASE || 'test',
        ssl: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: true
        },
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
      };

  pool = mysql.createPool(connectionConfig);

  db = {
    isTiDB: true,
    pool,

    // Run query returning array of rows
    async all(sql, params = []) {
      const store = asyncLocalStorage.getStore();
      const executor = store?.conn || pool;
      const normalizedParams = Array.isArray(params) ? params : [params];
      const [rows] = await executor.query(sql, normalizedParams);
      return rows;
    },

    // Run query returning single row or undefined
    async get(sql, params = []) {
      const store = asyncLocalStorage.getStore();
      const executor = store?.conn || pool;
      const normalizedParams = Array.isArray(params) ? params : [params];
      const [rows] = await executor.query(sql, normalizedParams);
      return rows && rows.length > 0 ? rows[0] : undefined;
    },

    // Run INSERT/UPDATE/DELETE returning lastInsertRowid & changes
    async run(sql, params = []) {
      const store = asyncLocalStorage.getStore();
      const executor = store?.conn || pool;
      const normalizedParams = Array.isArray(params) ? params : [params];
      const [res] = await executor.query(sql, normalizedParams);
      return {
        lastInsertRowid: res.insertId,
        changes: res.affectedRows
      };
    },

    // Prepare statement adapter
    prepare(sql) {
      return {
        all: async (...params) => {
          const p = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          return db.all(sql, p);
        },
        get: async (...params) => {
          const p = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          return db.get(sql, p);
        },
        run: async (...params) => {
          const p = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          return db.run(sql, p);
        }
      };
    },

    // Execute atomic transaction (supports: await db.transaction(...)(); tx = db.transaction(...); await tx(); and await db.transaction(...))
    transaction(callback) {
      const runner = async (...args) => {
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          const result = await asyncLocalStorage.run({ conn }, async () => {
            return await callback(...args);
          });
          await conn.commit();
          return result;
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }
      };
      runner.then = (resolve, reject) => runner().then(resolve, reject);
      return runner;
    }
  };
} else {
  // Local SQLite Fallback
  const Database = require('better-sqlite3');
  const dbPath = path.resolve(__dirname, '../../data/inventory.db');

  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  sqliteDb = new Database(dbPath, { verbose: null });
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  console.log('[Database] Running in local SQLite mode (inventory.db)');

  db = {
    isTiDB: false,
    sqliteDb,

    async all(sql, params = []) {
      const normalizedParams = Array.isArray(params) ? params : [params];
      return sqliteDb.prepare(sql).all(...normalizedParams);
    },

    async get(sql, params = []) {
      const normalizedParams = Array.isArray(params) ? params : [params];
      return sqliteDb.prepare(sql).get(...normalizedParams);
    },

    async run(sql, params = []) {
      const normalizedParams = Array.isArray(params) ? params : [params];
      const res = sqliteDb.prepare(sql).run(...normalizedParams);
      return {
        lastInsertRowid: res.lastInsertRowid,
        changes: res.changes
      };
    },

    prepare(sql) {
      return {
        all: async (...params) => {
          const p = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          return db.all(sql, p);
        },
        get: async (...params) => {
          const p = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          return db.get(sql, p);
        },
        run: async (...params) => {
          const p = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          return db.run(sql, p);
        }
      };
    },

    transaction(callback) {
      const runner = async (...args) => {
        return await callback(...args);
      };
      runner.then = (resolve, reject) => runner().then(resolve, reject);
      return runner;
    }
  };
}

// Universal initSchema function
async function initSchema() {
  if (isTiDB) {
    await initTiDBSchema(pool);
  } else {
    // Run SQLite DDL
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        region TEXT NOT NULL,
        area TEXT NOT NULL,
        address TEXT NOT NULL,
        contact_person TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        region TEXT NOT NULL,
        area TEXT NOT NULL,
        assigned_warehouse_id INTEGER,
        area_manager_name TEXT NOT NULL,
        contact_person TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_warehouse_id) REFERENCES warehouses(id)
      );

      CREATE TABLE IF NOT EXISTS hardware_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        icon TEXT
      );

      CREATE TABLE IF NOT EXISTS hardware_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        specifications TEXT,
        unit TEXT DEFAULT 'Unit',
        default_min_threshold INTEGER DEFAULT 5,
        is_custom INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES hardware_categories(id)
      );

      CREATE TABLE IF NOT EXISTS warehouse_stocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        warehouse_id INTEGER NOT NULL,
        hardware_id INTEGER NOT NULL,
        quantity_on_hand INTEGER NOT NULL DEFAULT 0,
        quantity_reserved INTEGER NOT NULL DEFAULT 0,
        min_threshold INTEGER NOT NULL DEFAULT 5,
        max_threshold INTEGER NOT NULL DEFAULT 50,
        last_restocked_at DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(warehouse_id, hardware_id),
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
        FOREIGN KEY (hardware_id) REFERENCES hardware_catalog(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS hardware_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_no TEXT UNIQUE NOT NULL,
        request_type TEXT NOT NULL DEFAULT 'PERMANENT',
        branch_id INTEGER NOT NULL,
        warehouse_id INTEGER NOT NULL,
        requester_name TEXT NOT NULL,
        requester_role TEXT NOT NULL DEFAULT 'IT Engineer',
        recipient_name TEXT NOT NULL,
        recipient_role TEXT NOT NULL,
        recipient_id TEXT,
        purpose TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING_AM_APPROVAL',
        
        am_approval_status TEXT NOT NULL DEFAULT 'PENDING',
        am_approved_at DATETIME,
        am_approver_name TEXT,
        am_remarks TEXT,

        dispatched_at DATETIME,
        dispatched_by TEXT,
        carrier_name TEXT,
        tracking_no TEXT,

        branch_arrived_at DATETIME,
        branch_accepted_by TEXT,
        branch_condition TEXT,
        branch_remarks TEXT,

        borrow_expected_return_date DATE,
        borrow_returned_at DATETIME,
        borrow_return_condition TEXT,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id),
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
      );

      CREATE TABLE IF NOT EXISTS request_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        hardware_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        serial_numbers TEXT,
        FOREIGN KEY (request_id) REFERENCES hardware_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (hardware_id) REFERENCES hardware_catalog(id)
      );

      CREATE TABLE IF NOT EXISTS replenishments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_number TEXT UNIQUE NOT NULL,
        warehouse_id INTEGER NOT NULL,
        destination_branch_id INTEGER,
        gsd_staff_name TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'IN_TRANSIT',
        estimated_arrival DATE,
        shipped_at DATETIME,
        
        arrived_at DATETIME,
        warehouse_accepted_by TEXT,
        arrival_remarks TEXT,

        branch_received_at DATETIME,
        branch_confirmed_by TEXT,
        branch_condition TEXT,
        branch_remarks TEXT,
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (destination_branch_id) REFERENCES branches(id)
      );

      CREATE TABLE IF NOT EXISTS replenishment_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        replenishment_id INTEGER NOT NULL,
        hardware_id INTEGER NOT NULL,
        quantity_ordered INTEGER NOT NULL,
        quantity_received INTEGER DEFAULT 0,
        FOREIGN KEY (replenishment_id) REFERENCES replenishments(id) ON DELETE CASCADE,
        FOREIGN KEY (hardware_id) REFERENCES hardware_catalog(id)
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movement_type TEXT NOT NULL,
        warehouse_id INTEGER NOT NULL,
        branch_id INTEGER,
        hardware_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        reference_type TEXT,
        reference_id TEXT,
        recipient_name TEXT,
        performed_by TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (branch_id) REFERENCES branches(id),
        FOREIGN KEY (hardware_id) REFERENCES hardware_catalog(id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient_role TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link_url TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL DEFAULT 'password123',
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'IT',
        assigned_warehouse_id INTEGER,
        assigned_branch_id INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (assigned_branch_id) REFERENCES branches(id)
      );

      CREATE TABLE IF NOT EXISTS warehouse_restock_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_no TEXT UNIQUE NOT NULL,
        warehouse_id INTEGER NOT NULL,
        hardware_id INTEGER NOT NULL,
        requested_quantity INTEGER NOT NULL,
        urgency TEXT NOT NULL DEFAULT 'NORMAL',
        reason TEXT,
        requested_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING_AC_APPROVAL',
        ac_approver_name TEXT,
        ac_remarks TEXT,
        ac_reviewed_at DATETIME,
        po_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (hardware_id) REFERENCES hardware_catalog(id)
      );
    `);
    console.log('[SQLite] Database schema initialized successfully.');
  }
}

module.exports = {
  db,
  isTiDB,
  initSchema
};
