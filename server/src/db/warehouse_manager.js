const fs = require('fs');
const path = require('path');
const { db, isTiDB } = require('./database');

const dbPath = path.resolve(__dirname, '../../data/inventory.db');
const backupsDir = path.resolve(__dirname, '../../data/backups');

/**
 * Ensures backup directory exists and creates a snapshot of database.
 */
function backupDatabase() {
  if (isTiDB) {
    return {
      filename: 'cloud_tidb_managed',
      filepath: 'tidb_cloud_snapshot',
      timestamp: new Date().toISOString()
    };
  }

  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  try {
    if (db.sqliteDb) {
      db.sqliteDb.pragma('wal_checkpoint(TRUNCATE)');
    }
  } catch (e) {
    console.warn('WAL checkpoint warning:', e.message);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `inventory_backup_${timestamp}.db`;
  const backupFilePath = path.join(backupsDir, backupFileName);

  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, backupFilePath);
    const latestBackupPath = path.join(backupsDir, 'inventory_backup_latest.db');
    fs.copyFileSync(dbPath, latestBackupPath);
  }

  return {
    filename: backupFileName,
    filepath: backupFilePath,
    timestamp
  };
}

/**
 * Safely clears all mock warehouses, related stock records, movements, requisitions,
 * replenishments, and mock warehouse user accounts.
 */
async function clearAllWarehouseData() {
  const backupInfo = backupDatabase();

  await db.transaction(async (tx) => {
    await tx.run('DELETE FROM stock_movements');
    await tx.run('DELETE FROM request_items');
    await tx.run('DELETE FROM hardware_requests');
    await tx.run('DELETE FROM replenishment_items');
    await tx.run('DELETE FROM replenishments');
    await tx.run('DELETE FROM warehouse_stocks');
    await tx.run('UPDATE branches SET assigned_warehouse_id = NULL');
    await tx.run("DELETE FROM users WHERE role = 'WAREHOUSE'");
    await tx.run('UPDATE users SET assigned_warehouse_id = NULL WHERE assigned_warehouse_id IS NOT NULL');
    await tx.run('DELETE FROM warehouses');

    if (!isTiDB) {
      try {
        await tx.run("DELETE FROM sqlite_sequence WHERE name IN ('warehouses', 'warehouse_stocks', 'hardware_requests', 'replenishments', 'stock_movements')");
      } catch (e) {}
    }

    await tx.run('DELETE FROM notifications');
    await tx.run("INSERT INTO notifications (recipient_role, type, title, message) VALUES ('ADMIN', 'REQUEST_CREATED', 'System Clean Slate Ready', 'All mock warehouse records have been cleared. You can now manually create your company warehouses.')");
  });

  const remainingWh = (await db.get('SELECT COUNT(*) as count FROM warehouses'))?.count || 0;
  const remainingStocks = (await db.get('SELECT COUNT(*) as count FROM warehouse_stocks'))?.count || 0;
  const remainingUsers = (await db.get('SELECT COUNT(*) as count FROM users'))?.count || 0;
  const remainingBranches = (await db.get('SELECT COUNT(*) as count FROM branches'))?.count || 0;
  const remainingCatalog = (await db.get('SELECT COUNT(*) as count FROM hardware_catalog'))?.count || 0;

  return {
    success: true,
    message: 'All mock warehouses, stocks, and transaction records cleared cleanly.',
    backup: backupInfo,
    stats: {
      warehouses: remainingWh,
      stocks: remainingStocks,
      users: remainingUsers,
      branches: remainingBranches,
      catalogItems: remainingCatalog
    }
  };
}

module.exports = {
  backupDatabase,
  clearAllWarehouseData
};
