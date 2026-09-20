const { db, isTiDB } = require('./database');
const { backupDatabase } = require('./warehouse_manager');

/**
 * Safely clears all mock hardware categories, mock catalog items, warehouse stock records,
 * and related movements.
 */
async function clearAllCategoryData() {
  const backupInfo = backupDatabase();

  await db.transaction(async (tx) => {
    await tx.run('DELETE FROM stock_movements');
    await tx.run('DELETE FROM request_items');
    await tx.run('DELETE FROM hardware_requests');
    await tx.run('DELETE FROM replenishment_items');
    await tx.run('DELETE FROM replenishments');
    await tx.run('DELETE FROM warehouse_stocks');
    await tx.run('DELETE FROM hardware_catalog');
    await tx.run('DELETE FROM hardware_categories');

    if (!isTiDB) {
      try {
        await tx.run("DELETE FROM sqlite_sequence WHERE name IN ('hardware_categories', 'hardware_catalog', 'warehouse_stocks', 'stock_movements', 'request_items', 'hardware_requests', 'replenishment_items', 'replenishments')");
      } catch (e) {}
    }

    await tx.run(`
      INSERT INTO notifications (recipient_role, type, title, message)
      VALUES ('ADMIN', 'REQUEST_CREATED', 'Hardware Categories Reset', 'All mock hardware categories and catalog records have been cleared. You can now manually create your company categories.')
    `);
  });

  const remainingCategories = (await db.get('SELECT COUNT(*) as count FROM hardware_categories'))?.count || 0;
  const remainingCatalog = (await db.get('SELECT COUNT(*) as count FROM hardware_catalog'))?.count || 0;
  const remainingStocks = (await db.get('SELECT COUNT(*) as count FROM warehouse_stocks'))?.count || 0;
  const remainingWarehouses = (await db.get('SELECT COUNT(*) as count FROM warehouses'))?.count || 0;

  return {
    success: true,
    message: 'All mock hardware categories, catalog items, and stock records cleared cleanly.',
    backup: backupInfo,
    stats: {
      categories: remainingCategories,
      catalogItems: remainingCatalog,
      stocks: remainingStocks,
      warehouses: remainingWarehouses
    }
  };
}

/**
 * Restores the default factory hardware categories.
 */
async function resetDefaultCategories() {
  const defaultCategories = [
    { name: 'CPU & Workstations', description: 'Desktop computers, micro-PCs, towers, POS controller units', icon: 'Cpu' },
    { name: 'Monitors & Displays', description: 'FHD & QHD commercial LED displays, teller monitors', icon: 'Monitor' },
    { name: 'Memory & Storage', description: 'RAM DIMM modules, SSD NVMe/SATA internal drives', icon: 'HardDrive' },
    { name: 'Networking Hardware', description: 'Gigabit switches, VPN routers, access points, PoE hubs', icon: 'Network' },
    { name: 'Printers & POS Peripherals', description: 'Thermal receipt printers, network laser printers, barcode readers', icon: 'Printer' },
    { name: 'Power & Protection', description: 'Uninterruptible power supplies, voltage regulators', icon: 'Zap' },
    { name: 'Input & Accessories', description: 'Keyboards, mice, webcams, headsets, smart card readers', icon: 'Keyboard' }
  ];

  await db.transaction(async (tx) => {
    for (const cat of defaultCategories) {
      const existing = await tx.get('SELECT id FROM hardware_categories WHERE name = ?', [cat.name]);
      if (!existing) {
        await tx.run('INSERT INTO hardware_categories (name, description, icon) VALUES (?, ?, ?)', [cat.name, cat.description, cat.icon]);
      }
    }
  });

  return await db.all('SELECT * FROM hardware_categories ORDER BY id ASC');
}

module.exports = {
  clearAllCategoryData,
  resetDefaultCategories
};
