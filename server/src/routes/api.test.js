const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { backupDatabase, clearAllWarehouseData } = require('../db/warehouse_manager');
const { clearAllCategoryData, resetDefaultCategories } = require('../db/category_manager');

// Helper to calculate stock status
function getStockStatus(qtyOnHand, minThreshold) {
  if (qtyOnHand === 0) return 'OUT_OF_STOCK';
  if (qtyOnHand <= minThreshold) return 'LOW_STOCK';
  return 'OPTIMAL';
}

// --------------------------------------------------------------------------
// 1. DASHBOARD & ANALYTICS
// --------------------------------------------------------------------------
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const warehouseCount = (await db.prepare('SELECT COUNT(*) as count FROM warehouses WHERE is_active = 1').get())?.count || 0;
    const branchCount = (await db.prepare('SELECT COUNT(*) as count FROM branches WHERE is_active = 1').get())?.count || 0;
    const catalogCount = (await db.prepare('SELECT COUNT(*) as count FROM hardware_catalog').get())?.count || 0;
    
    const stockStats = (await db.prepare(`
      SELECT 
        SUM(quantity_on_hand) as total_units,
        SUM(CASE WHEN quantity_on_hand = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
        SUM(CASE WHEN quantity_on_hand > 0 AND quantity_on_hand <= min_threshold THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN quantity_on_hand > min_threshold THEN 1 ELSE 0 END) as optimal_count
      FROM warehouse_stocks
    `).get();

    const pendingApprovals = await db.prepare("SELECT COUNT(*) as count FROM hardware_requests WHERE status = 'PENDING_AM_APPROVAL'").get())?.count || 0;
    const pendingDispatches = (await db.prepare("SELECT COUNT(*) as count FROM hardware_requests WHERE status = 'APPROVED'").get())?.count || 0;
    const inTransitToBranches = (await db.prepare("SELECT COUNT(*) as count FROM hardware_requests WHERE status = 'IN_TRANSIT'").get())?.count || 0;
    const activeBorrows = (await db.prepare("SELECT COUNT(*) as count FROM hardware_requests WHERE request_type = 'BORROW' AND status IN ('IN_TRANSIT', 'ARRIVED_AND_ACCEPTED') AND borrow_returned_at IS NULL").get())?.count || 0;
    
    const replenishmentsInTransit = (await db.prepare("SELECT COUNT(*) as count FROM replenishments WHERE status = 'IN_TRANSIT'").get())?.count || 0;

    // Urgent out of stock items across all warehouses (crucial for GSD and AC)
    const urgentRestockAlerts = (await db.prepare(`
      SELECT 
        ws.id as stock_id,
        ws.warehouse_id,
        w.code as warehouse_code,
        w.name as warehouse_name,
        w.region,
        hc.id as hardware_id,
        hc.sku,
        hc.name as hardware_name,
        hc.brand,
        hc.model,
        hcat.name as category_name,
        ws.quantity_on_hand,
        ws.min_threshold,
        'OUT_OF_STOCK' as status
      FROM warehouse_stocks ws
      JOIN warehouses w ON ws.warehouse_id = w.id
      JOIN hardware_catalog hc ON ws.hardware_id = hc.id
      JOIN hardware_categories hcat ON hc.category_id = hcat.id
      WHERE ws.quantity_on_hand = 0
      ORDER BY w.id ASC, hc.id ASC
      LIMIT 25
    `).all();

    // Low stock items
    const lowStockAlerts = await db.prepare(`
      SELECT 
        ws.id as stock_id,
        ws.warehouse_id,
        w.code as warehouse_code,
        w.name as warehouse_name,
        w.region,
        hc.id as hardware_id,
        hc.sku,
        hc.name as hardware_name,
        hc.brand,
        hc.model,
        hcat.name as category_name,
        ws.quantity_on_hand,
        ws.min_threshold,
        'LOW_STOCK' as status
      FROM warehouse_stocks ws
      JOIN warehouses w ON ws.warehouse_id = w.id
      JOIN hardware_catalog hc ON ws.hardware_id = hc.id
      JOIN hardware_categories hcat ON hc.category_id = hcat.id
      WHERE ws.quantity_on_hand > 0 AND ws.quantity_on_hand <= ws.min_threshold
      ORDER BY ws.quantity_on_hand ASC
      LIMIT 25
    `).all();

    res.json({
      summary: {
        warehouseCount,
        branchCount,
        catalogCount,
        totalUnitsOnHand: stockStats.total_units || 0,
        outOfStockCount: stockStats.out_of_stock_count || 0,
        lowStockCount: stockStats.low_stock_count || 0,
        optimalCount: stockStats.optimal_count || 0,
        pendingApprovals,
        pendingDispatches,
        inTransitToBranches,
        activeBorrows,
        replenishmentsInTransit
      },
      urgentRestockAlerts,
      lowStockAlerts
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 2. WAREHOUSES
// --------------------------------------------------------------------------
router.get('/warehouses', async (req, res) => {
  try {
    const warehouses = await db.prepare(`
      SELECT 
        w.*,
        COUNT(ws.id) as total_tracked_items,
        COALESCE(SUM(ws.quantity_on_hand), 0) as total_units_in_stock,
        SUM(CASE WHEN ws.quantity_on_hand = 0 THEN 1 ELSE 0 END) as out_of_stock_items,
        SUM(CASE WHEN ws.quantity_on_hand > 0 AND ws.quantity_on_hand <= ws.min_threshold THEN 1 ELSE 0 END) as low_stock_items
      FROM warehouses w
      LEFT JOIN warehouse_stocks ws ON w.id = ws.warehouse_id
      GROUP BY w.id
      ORDER BY w.id ASC
    `).all();
    res.json(warehouses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/warehouses/:id', async (req, res) => {
  try {
    const wh = await db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id);
    if (!wh) return res.status(404).json({ error: 'Warehouse not found' });

    // Get stock items
    const stocks = await db.prepare(`
      SELECT 
        ws.id as stock_id,
        ws.hardware_id,
        ws.quantity_on_hand,
        ws.quantity_reserved,
        ws.min_threshold,
        ws.max_threshold,
        ws.last_restocked_at,
        ws.updated_at,
        hc.sku,
        hc.name as hardware_name,
        hc.brand,
        hc.model,
        hc.specifications,
        hc.unit,
        hcat.name as category_name,
        CASE 
          WHEN ws.quantity_on_hand = 0 THEN 'OUT_OF_STOCK'
          WHEN ws.quantity_on_hand <= ws.min_threshold THEN 'LOW_STOCK'
          ELSE 'OPTIMAL'
        END as status
      FROM warehouse_stocks ws
      JOIN hardware_catalog hc ON ws.hardware_id = hc.id
      JOIN hardware_categories hcat ON hc.category_id = hcat.id
      WHERE ws.warehouse_id = ?
      ORDER BY hcat.id ASC, hc.name ASC
    `).all(req.params.id);

    res.json({ warehouse: wh, stocks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new warehouse manually
router.post('/warehouses', async (req, res) => {
  try {
    const {
      code,
      name,
      region,
      area,
      address,
      contact_person,
      phone,
      email,
      initial_stock_mode, // 'EMPTY' | 'DEFAULT_PAR'
      custodian_username,
      custodian_password
    } = req.body;

    if (!code || !name || !region || !address || !contact_person || !phone) {
      return res.status(400).json({
        error: 'Missing required fields: code, name, region, address, contact_person, and phone are mandatory.'
      });
    }

    const cleanCode = code.trim().toUpperCase();

    // Check code uniqueness
    const existing = await db.prepare('SELECT id FROM warehouses WHERE UPPER(code) = ?').get(cleanCode);
    if (existing) {
      return res.status(400).json({ error: `Warehouse code "${cleanCode}" already exists. Please choose a unique code.` });
    }

    const whId = await db.transaction(async () => {
      // 1. Insert warehouse record
      const insertWh = await db.prepare(`
        INSERT INTO warehouses (code, name, region, area, address, contact_person, phone, email, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        cleanCode,
        name.trim(),
        region.trim(),
        (area || region).trim(),
        address.trim(),
        contact_person.trim(),
        phone.trim(),
        (email || `${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@warehouse.company.com`).trim()
      );

      const newId = insertWh.lastInsertRowid;

      // 2. Initialize stock records for all hardware catalog items
      const catalogItems = await db.prepare('SELECT id, default_min_threshold FROM hardware_catalog').all();
      const insertStock = await db.prepare(`
        INSERT INTO warehouse_stocks (warehouse_id, hardware_id, quantity_on_hand, quantity_reserved, min_threshold, max_threshold, last_restocked_at)
        VALUES (?, ?, ?, 0, ?, ?, ?)
      `);

      for (const item of catalogItems) {
        const minThresh = item.default_min_threshold || 5;
        const maxThresh = minThresh * 5;
        const initialQty = initial_stock_mode === 'DEFAULT_PAR' ? minThresh * 2 : 0;
        await insertStock.run(
          newId,
          item.id,
          initialQty,
          minThresh,
          maxThresh,
          initialQty > 0 ? new Date().toISOString() : null
        );
      }

      // 3. Create or bind warehouse custodian account
      const codeSlug = cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^wh/, '');
      const username = (custodian_username || `wh_${codeSlug}`).trim().toLowerCase();
      const password = (custodian_password || 'wh123').trim();
      const userEmail = (email || `${username}@warehouse.company.com`).trim();

      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existingUser) {
        await db.prepare(`
          UPDATE users 
          SET role = 'WAREHOUSE', assigned_warehouse_id = ?, full_name = ?, email = ?
          WHERE id = ?
        `).run(newId, `${contact_person.trim()} (${cleanCode} Custodian)`, userEmail, existingUser.id);
      } else {
        await db.prepare(`
          INSERT INTO users (username, password, full_name, email, role, assigned_warehouse_id, assigned_branch_id, is_active)
          VALUES (?, ?, ?, ?, 'WAREHOUSE', ?, NULL, 1)
        `).run(
          username,
          password,
          `${contact_person.trim()} (${cleanCode} Custodian)`,
          userEmail,
          newId
        );
      }

      // 4. System notification
      await db.prepare(`
        INSERT INTO notifications (recipient_role, type, title, message)
        VALUES ('ALL', 'REQUEST_CREATED', ?, ?)
      `).run(
        `New Warehouse Registered: ${cleanCode}`,
        `Warehouse "${name.trim()}" (${cleanCode}) in ${region.trim()} was successfully registered. Dedicated custodian account "${username}" is ready.`
      );

      return newId;
    });

    const createdWh = await db.prepare('SELECT * FROM warehouses WHERE id = ?').get(whId);
    res.status(201).json({
      message: `Warehouse "${createdWh.name}" (${createdWh.code}) created successfully.`,
      warehouse: createdWh
    });
  } catch (err) {
    console.error('Create warehouse error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update warehouse
router.put('/warehouses/:id', async (req, res) => {
  try {
    const whId = req.params.id;
    const wh = await db.prepare('SELECT * FROM warehouses WHERE id = ?').get(whId);
    if (!wh) return res.status(404).json({ error: 'Warehouse not found' });

    const {
      code,
      name,
      region,
      area,
      address,
      contact_person,
      phone,
      email,
      is_active
    } = req.body;

    const newCode = (code ? code.trim().toUpperCase() : wh.code);

    if (newCode !== wh.code) {
      const existing = await db.prepare('SELECT id FROM warehouses WHERE UPPER(code) = ? AND id != ?').get(newCode, whId);
      if (existing) {
        return res.status(400).json({ error: `Warehouse code "${newCode}" is already in use.` });
      }
    }

    await db.prepare(`
      UPDATE warehouses
      SET code = ?, name = ?, region = ?, area = ?, address = ?, contact_person = ?, phone = ?, email = ?, is_active = ?
      WHERE id = ?
    `).run(
      newCode,
      name !== undefined ? name.trim() : wh.name,
      region !== undefined ? region.trim() : wh.region,
      area !== undefined ? area.trim() : wh.area,
      address !== undefined ? address.trim() : wh.address,
      contact_person !== undefined ? contact_person.trim() : wh.contact_person,
      phone !== undefined ? phone.trim() : wh.phone,
      email !== undefined ? email.trim() : wh.email,
      is_active !== undefined ? (is_active ? 1 : 0) : wh.is_active,
      whId
    );

    // Sync custodian name if changed
    if (contact_person) {
      await db.prepare(`
        UPDATE users
        SET full_name = ?
        WHERE assigned_warehouse_id = ? AND role = 'WAREHOUSE'
      `).run(`${contact_person.trim()} (${newCode} Custodian)`, whId);
    }

    const updated = await db.prepare('SELECT * FROM warehouses WHERE id = ?').get(whId);
    res.json({ message: 'Warehouse updated successfully', warehouse: updated });
  } catch (err) {
    console.error('Update warehouse error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a single warehouse safely
router.delete('/warehouses/:id', async (req, res) => {
  try {
    const whId = req.params.id;
    const wh = await db.prepare('SELECT * FROM warehouses WHERE id = ?').get(whId);
    if (!wh) return res.status(404).json({ error: 'Warehouse not found' });

    await db.transaction(async () => {
      // Unlink branches
      await db.prepare('UPDATE branches SET assigned_warehouse_id = NULL WHERE assigned_warehouse_id = ?').run(whId);

      // Clean up warehouse transaction ledgers & stock
      await db.prepare('DELETE FROM stock_movements WHERE warehouse_id = ?').run(whId);
      await db.prepare('DELETE FROM request_items WHERE request_id IN (SELECT id FROM hardware_requests WHERE warehouse_id = ?)').run(whId);
      await db.prepare('DELETE FROM hardware_requests WHERE warehouse_id = ?').run(whId);
      await db.prepare('DELETE FROM replenishment_items WHERE replenishment_id IN (SELECT id FROM replenishments WHERE warehouse_id = ?)').run(whId);
      await db.prepare('DELETE FROM replenishments WHERE warehouse_id = ?').run(whId);
      await db.prepare('DELETE FROM warehouse_stocks WHERE warehouse_id = ?').run(whId);

      // Remove dedicated warehouse accounts or unlink users
      await db.prepare("DELETE FROM users WHERE assigned_warehouse_id = ? AND role = 'WAREHOUSE'").run(whId);
      await db.prepare('UPDATE users SET assigned_warehouse_id = NULL WHERE assigned_warehouse_id = ?').run(whId);

      // Delete the warehouse itself
      await db.prepare('DELETE FROM warehouses WHERE id = ?').run(whId);
    });

    res.json({ success: true, message: `Warehouse ${wh.code} (${wh.name}) deleted successfully.` });
  } catch (err) {
    console.error('Delete warehouse error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Clear all warehouses (with automatic safety backup)
router.post('/warehouses/clear-all', async (req, res) => {
  try {
    const result = await clearAllWarehouseData();
    res.json(result);
  } catch (err) {
    console.error('Clear all warehouses error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create manual database backup snapshot
router.post('/warehouses/backup', async (req, res) => {
  try {
    const backupInfo = backupDatabase();
    res.json({ success: true, backup: backupInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 3. BRANCHES (100+ Branches)
// --------------------------------------------------------------------------
router.get('/branches', async (req, res) => {
  try {
    const { region, area, search } = req.query;
    let sql = `
      SELECT 
        b.*,
        w.code as warehouse_code,
        w.name as warehouse_name
      FROM branches b
      LEFT JOIN warehouses w ON b.assigned_warehouse_id = w.id
      WHERE 1=1
    `;
    const params = [];

    if (region) {
      sql += ' AND b.region = ?';
      params.push(region);
    }
    if (area) {
      sql += ' AND b.area = ?';
      params.push(area);
    }
    if (search) {
      sql += ' AND (b.code LIKE ? OR b.name LIKE ? OR b.contact_person LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY b.id ASC';
    const branches = await db.prepare(sql).all(...params);
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/branches/:id', async (req, res) => {
  try {
    const branch = await db.prepare(`
      SELECT b.*, w.name as warehouse_name, w.code as warehouse_code
      FROM branches b
      LEFT JOIN warehouses w ON b.assigned_warehouse_id = w.id
      WHERE b.id = ?
    `).get(req.params.id);

    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    // Recent shipments and deliveries accepted
    const shipments = await db.prepare(`
      SELECT 
        r.*,
        w.name as source_warehouse_name
      FROM hardware_requests r
      JOIN warehouses w ON r.warehouse_id = w.id
      WHERE r.branch_id = ?
      ORDER BY r.id DESC
      LIMIT 20
    `).all(req.params.id);

    res.json({ branch, shipments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create branch
router.post('/branches', async (req, res) => {
  try {
    const {
      code,
      name,
      region,
      area,
      assigned_warehouse_id,
      area_manager_name,
      contact_person,
      phone,
      email,
      address
    } = req.body;

    if (!code || !name || !region) {
      return res.status(400).json({ error: 'Code, Name, and Region are required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await db.prepare('SELECT id FROM branches WHERE UPPER(code) = ?').get(cleanCode);
    if (existing) {
      return res.status(400).json({ error: `Branch with code "${cleanCode}" already exists.` });
    }

    const result = await db.prepare(`
      INSERT INTO branches (
        code, name, region, area, assigned_warehouse_id,
        area_manager_name, contact_person, phone, email, address, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      cleanCode,
      name.trim(),
      region.trim(),
      (area || region).trim(),
      assigned_warehouse_id ? Number(assigned_warehouse_id) : null,
      (area_manager_name || 'Unassigned Area Manager').trim(),
      (contact_person || 'Branch Custodian').trim(),
      (phone || 'N/A').trim(),
      (email || 'branch@company.com').trim(),
      (address || 'Company Branch Office').trim()
    );

    const created = await db.prepare(`
      SELECT b.*, w.name as warehouse_name, w.code as warehouse_code
      FROM branches b
      LEFT JOIN warehouses w ON b.assigned_warehouse_id = w.id
      WHERE b.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: `Branch "${created.name}" (${created.code}) created successfully.`,
      branch: created
    });
  } catch (err) {
    console.error('Create branch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update branch
router.put('/branches/:id', async (req, res) => {
  try {
    const branchId = req.params.id;
    const branch = await db.prepare('SELECT * FROM branches WHERE id = ?').get(branchId);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    const {
      code,
      name,
      region,
      area,
      assigned_warehouse_id,
      area_manager_name,
      contact_person,
      phone,
      email,
      address,
      is_active
    } = req.body;

    const newCode = (code ? code.trim().toUpperCase() : branch.code);
    if (newCode !== branch.code) {
      const existing = await db.prepare('SELECT id FROM branches WHERE UPPER(code) = ? AND id != ?').get(newCode, branchId);
      if (existing) {
        return res.status(400).json({ error: `Branch code "${newCode}" is already used by another branch.` });
      }
    }

    await db.prepare(`
      UPDATE branches
      SET code = ?,
          name = ?,
          region = ?,
          area = ?,
          assigned_warehouse_id = ?,
          area_manager_name = ?,
          contact_person = ?,
          phone = ?,
          email = ?,
          address = ?,
          is_active = ?
      WHERE id = ?
    `).run(
      newCode,
      name ? name.trim() : branch.name,
      region ? region.trim() : branch.region,
      area !== undefined ? (area ? area.trim() : '') : branch.area,
      assigned_warehouse_id !== undefined ? (assigned_warehouse_id ? Number(assigned_warehouse_id) : null) : branch.assigned_warehouse_id,
      area_manager_name !== undefined ? (area_manager_name ? area_manager_name.trim() : '') : branch.area_manager_name,
      contact_person !== undefined ? (contact_person ? contact_person.trim() : '') : branch.contact_person,
      phone !== undefined ? (phone ? phone.trim() : '') : branch.phone,
      email !== undefined ? (email ? email.trim() : '') : branch.email,
      address !== undefined ? (address ? address.trim() : '') : branch.address,
      is_active !== undefined ? Number(is_active) : branch.is_active,
      branchId
    );

    const updated = await db.prepare(`
      SELECT b.*, w.name as warehouse_name, w.code as warehouse_code
      FROM branches b
      LEFT JOIN warehouses w ON b.assigned_warehouse_id = w.id
      WHERE b.id = ?
    `).get(branchId);

    res.json({
      message: `Branch "${updated.name}" (${updated.code}) updated successfully.`,
      branch: updated
    });
  } catch (err) {
    console.error('Update branch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete branch
router.delete('/branches/:id', async (req, res) => {
  try {
    const branchId = req.params.id;
    const branch = await db.prepare('SELECT * FROM branches WHERE id = ?').get(branchId);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    await db.transaction(async () => {
      // Unlink users bound to this branch
      await db.prepare('UPDATE users SET assigned_branch_id = NULL WHERE assigned_branch_id = ?').run(branchId);

      // Remove or unlink branch hardware requests
      await db.prepare('DELETE FROM hardware_requests WHERE branch_id = ?').run(branchId);

      // Delete branch
      await db.prepare('DELETE FROM branches WHERE id = ?').run(branchId);
    });

    res.json({
      success: true,
      message: `Branch "${branch.name}" (${branch.code}) was deleted successfully.`
    });
  } catch (err) {
    console.error('Delete branch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 4. HARDWARE CATEGORIES & CATALOG MANAGEMENT
// --------------------------------------------------------------------------

// Get all categories with item counts
router.get('/categories', async (req, res) => {
  try {
    const categories = await db.prepare(`
      SELECT 
        hc.*,
        (SELECT COUNT(*) FROM hardware_catalog c WHERE c.category_id = hc.id) as item_count
      FROM hardware_categories hc
      ORDER BY hc.name ASC
    `).all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new category
router.post('/categories', async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const cleanName = name.trim();
    const existing = await db.prepare('SELECT id FROM hardware_categories WHERE UPPER(name) = ?').get(cleanName.toUpperCase());
    if (existing) {
      return res.status(400).json({ error: `Category "${cleanName}" already exists.` });
    }
    const result = await db.prepare('INSERT INTO hardware_categories (name, description, icon) VALUES (?, ?, ?)').run(
      cleanName,
      description ? description.trim() : '',
      icon ? icon.trim() : 'Layers'
    );
    const newCat = await db.prepare('SELECT *, 0 as item_count FROM hardware_categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newCat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an existing category
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const cleanName = name.trim();
    const existing = await db.prepare('SELECT id FROM hardware_categories WHERE UPPER(name) = ? AND id != ?').get(cleanName.toUpperCase(), id);
    if (existing) {
      return res.status(400).json({ error: `Another category named "${cleanName}" already exists.` });
    }
    await db.prepare('UPDATE hardware_categories SET name = ?, description = ?, icon = ? WHERE id = ?').run(
      cleanName,
      description ? description.trim() : '',
      icon ? icon.trim() : 'Layers',
      id
    );
    const updated = await db.prepare(`
      SELECT hc.*, (SELECT COUNT(*) FROM hardware_catalog c WHERE c.category_id = hc.id) as item_count
      FROM hardware_categories hc
      WHERE hc.id = ?
    `).get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a category
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;
    const cat = await db.prepare('SELECT * FROM hardware_categories WHERE id = ?').get(id);
    if (!cat) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    const itemCount = await db.prepare('SELECT COUNT(*) as count FROM hardware_catalog WHERE category_id = ?').get(id))?.count || 0;
    if (itemCount > 0 && force !== 'true') {
      return res.status(400).json({
        error: `Cannot delete category "${cat.name}" because it contains ${itemCount} hardware catalog item(s). Move or delete those items first, or pass force=true.`
      });
    }

    await db.transaction(async () => {
      if (itemCount > 0 && force === 'true') {
        const itemIds = (await db.prepare('SELECT id FROM hardware_catalog WHERE category_id = ?').all(id).map(r => r.id);
        for (const hId of itemIds) {
          await db.prepare('DELETE FROM warehouse_stocks WHERE hardware_id = ?').run(hId);
          await db.prepare('DELETE FROM stock_movements WHERE hardware_id = ?').run(hId);
          await db.prepare('DELETE FROM request_items WHERE hardware_id = ?').run(hId);
          await db.prepare('DELETE FROM replenishment_items WHERE hardware_id = ?').run(hId);
        }
        await db.prepare('DELETE FROM hardware_catalog WHERE category_id = ?').run(id);
      }
      await db.prepare('DELETE FROM hardware_categories WHERE id = ?').run(id);
    });

    res.json({ message: `Category "${cat.name}" deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all mock categories and catalog items for manual setup
router.post('/categories/clear-all', async (req, res) => {
  try {
    const result = await clearAllCategoryData();
    res.json(result);
  } catch (err) {
    console.error('Clear categories error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reset / restore default categories
router.post('/categories/reset-defaults', async (req, res) => {
  try {
    const categories = await resetDefaultCategories();
    res.json({ message: 'Default hardware categories restored successfully.', categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/catalog', async (req, res) => {
  try {
    const categories = await db.prepare('SELECT * FROM hardware_categories ORDER BY id ASC').all();
    const items = await db.prepare(`
      SELECT 
        hc.*,
        hcat.name as category_name
      FROM hardware_catalog hc
      JOIN hardware_categories hcat ON hc.category_id = hcat.id
      ORDER BY hcat.id ASC, hc.name ASC
    `).all();
    res.json({ categories, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new hardware item (custom item or new hardware model)
router.post('/catalog', async (req, res) => {
  try {
    const {
      category_id,
      new_category_name,
      sku,
      name,
      brand,
      model,
      specifications,
      unit,
      default_min_threshold,
      max_threshold,
      initial_warehouse_id,
      apply_to_all_warehouses,
      initial_quantity
    } = req.body;

    if (!sku || !name || !brand) {
      return res.status(400).json({ error: 'Missing required catalog fields: SKU, Name, and Brand are mandatory.' });
    }

    const cleanSku = sku.toUpperCase().trim();

    // Check SKU uniqueness
    const existingSku = await db.prepare('SELECT id, name FROM hardware_catalog WHERE UPPER(sku) = ?').get(cleanSku);
    if (existingSku) {
      return res.status(400).json({
        error: `SKU code "${cleanSku}" is already used by "${existingSku.name}". Please provide a unique SKU code.`
      });
    }

    // Resolve or create category
    let finalCategoryId = Number(category_id) || 1;
    if (new_category_name && new_category_name.trim()) {
      const catName = new_category_name.trim();
      const existingCat = await db.prepare('SELECT id FROM hardware_categories WHERE UPPER(name) = ?').get(catName.toUpperCase());
      if (existingCat) {
        finalCategoryId = existingCat.id;
      } else {
        const catInsert = await db.prepare('INSERT INTO hardware_categories (name, description, icon) VALUES (?, ?, ?)');
        const catInfo = await catInsert.run(catName, 'Custom Admin Hardware Category', 'Layers');
        finalCategoryId = catInfo.lastInsertRowid;
      }
    }

    const minThresh = Number(default_min_threshold) || 5;
    const maxThreshVal = Number(max_threshold) || (minThresh * 5);
    const initialQty = Number(initial_quantity) || 0;

    let hardwareId;
    let stockedCount = 0;

    await db.transaction(async () => {
      // 1. Insert into hardware_catalog
      const insertHw = await db.prepare(`
        INSERT INTO hardware_catalog (category_id, sku, name, brand, model, specifications, unit, default_min_threshold, is_custom)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);
      const info = await insertHw.run(
        finalCategoryId,
        cleanSku,
        name.trim(),
        brand.trim(),
        model ? model.trim() : 'Standard',
        specifications ? specifications.trim() : '',
        unit ? unit.trim() : 'Unit',
        minThresh
      );

      hardwareId = info.lastInsertRowid;

      // 2. Stocking logic: All Active Warehouses vs Specific Warehouse
      const insertStock = db.prepare(`
        INSERT INTO warehouse_stocks (warehouse_id, hardware_id, quantity_on_hand, min_threshold, max_threshold, last_restocked_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(warehouse_id, hardware_id) DO UPDATE SET
          quantity_on_hand = excluded.quantity_on_hand,
          min_threshold = excluded.min_threshold,
          max_threshold = excluded.max_threshold
      `);

      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (movement_type, warehouse_id, hardware_id, quantity, balance_after, reference_type, reference_id, performed_by, notes)
        VALUES ('IN_ADJUSTMENT', ?, ?, ?, ?, 'MANUAL_ADJUSTMENT', 'CUSTOM_ITEM_INIT', 'System Administrator', 'Initial stock assignment for new custom hardware item')
      `);

      if (apply_to_all_warehouses || initial_warehouse_id === 0 || initial_warehouse_id === 'ALL') {
        const activeWarehouses = db.prepare('SELECT id, code, name FROM warehouses WHERE is_active = 1').all();
        for (const wh of activeWarehouses) {
          await insertStock.run(wh.id, hardwareId, initialQty, minThresh, maxThreshVal);
          if (initialQty > 0) {
            await insertMovement.run(wh.id, hardwareId, initialQty, initialQty);
          }
          stockedCount++;
        }
      } else if (initial_warehouse_id) {
        await insertStock.run(Number(initial_warehouse_id), hardwareId, initialQty, minThresh, maxThreshVal);
        if (initialQty > 0) {
          await insertMovement.run(Number(initial_warehouse_id), hardwareId, initialQty, initialQty);
        }
        stockedCount = 1;
      }
    });

    res.status(201).json({
      id: hardwareId,
      message: `Custom hardware "${name.trim()}" (${cleanSku}) registered successfully and stocked in ${stockedCount} warehouse(s).`,
      stocked_warehouses_count: stockedCount
    });
  } catch (err) {
    console.error('Create catalog item error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Customize hardware in warehouse: add/remove item, adjust par levels, or update stock
router.post('/stock/customize', async (req, res) => {
  try {
    const { warehouse_id, hardware_id, min_threshold, max_threshold, quantity_on_hand, action_type } = req.body;
    
    if (!warehouse_id || !hardware_id) {
      return res.status(400).json({ error: 'warehouse_id and hardware_id are required' });
    }

    const existing = await db.prepare('SELECT * FROM warehouse_stocks WHERE warehouse_id = ? AND hardware_id = ?').get(warehouse_id, hardware_id);

    if (existing) {
      const newMin = min_threshold !== undefined ? Number(min_threshold) : existing.min_threshold;
      const newMax = max_threshold !== undefined ? Number(max_threshold) : existing.max_threshold;
      let newQty = existing.quantity_on_hand;

      if (quantity_on_hand !== undefined && action_type === 'SET_QUANTITY') {
        newQty = Number(quantity_on_hand);
        
        // Log movement
        const delta = newQty - existing.quantity_on_hand;
        if (delta !== 0) {
          await db.prepare(`
            INSERT INTO stock_movements (movement_type, warehouse_id, hardware_id, quantity, balance_after, reference_type, reference_id, performed_by, notes)
            VALUES (?, ?, ?, ?, ?, 'MANUAL_ADJUSTMENT', 'STOCK_CUSTOMIZE', 'Warehouse Supervisor', 'Custom stock par/count adjustment')
          `).run(delta > 0 ? 'IN_ADJUSTMENT' : 'OUT_ADJUSTMENT', warehouse_id, hardware_id, Math.abs(delta), newQty);
        }
      }

      await db.prepare(`
        UPDATE warehouse_stocks
        SET min_threshold = ?, max_threshold = ?, quantity_on_hand = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newMin, newMax, newQty, existing.id);

      // Check for low/out of stock and notify if necessary
      if (newQty === 0) {
        await db.prepare(`
          INSERT INTO notifications (recipient_role, type, title, message)
          VALUES ('GSD', 'OUT_OF_STOCK', 'Stock Depleted', 'Hardware item stock adjusted to 0 in warehouse ID ' || ?)
        `).run(warehouse_id);
      }

      return res.json({ message: 'Warehouse stock settings updated successfully', stock_id: existing.id });
    } else {
      // Add hardware to this warehouse
      const qty = Number(quantity_on_hand) || 0;
      const minT = Number(min_threshold) || 5;
      const maxT = Number(max_threshold) || (minT * 5);

      const info = await db.prepare(`
        INSERT INTO warehouse_stocks (warehouse_id, hardware_id, quantity_on_hand, min_threshold, max_threshold, last_restocked_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(warehouse_id, hardware_id, qty, minT, maxT);

      if (qty > 0) {
        await db.prepare(`
          INSERT INTO stock_movements (movement_type, warehouse_id, hardware_id, quantity, balance_after, reference_type, reference_id, performed_by, notes)
          VALUES ('IN_ADJUSTMENT', ?, ?, ?, ?, 'MANUAL_ADJUSTMENT', 'WAREHOUSE_CUSTOM_ADD', 'Warehouse Supervisor', 'Added new hardware type to warehouse inventory')
        `).run(warehouse_id, hardware_id, qty, qty);
      }

      return res.status(201).json({ message: 'Hardware added to warehouse inventory', stock_id: info.lastInsertRowid });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 5. REQUISITIONS & BORROWING WORKFLOW
// --------------------------------------------------------------------------
router.get('/requests', async (req, res) => {
  try {
    const { branch_id, warehouse_id, status, request_type } = req.query;
    let sql = `
      SELECT 
        r.*,
        b.code as branch_code,
        b.name as branch_name,
        b.region as branch_region,
        b.area as branch_area,
        b.area_manager_name,
        w.code as warehouse_code,
        w.name as warehouse_name
      FROM hardware_requests r
      JOIN branches b ON r.branch_id = b.id
      JOIN warehouses w ON r.warehouse_id = w.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      sql += ' AND r.branch_id = ?';
      params.push(branch_id);
    }
    if (warehouse_id) {
      sql += ' AND r.warehouse_id = ?';
      params.push(warehouse_id);
    }
    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (request_type) {
      sql += ' AND r.request_type = ?';
      params.push(request_type);
    }

    sql += ' ORDER BY r.id DESC';
    const requests = await db.prepare(sql).all(...params);

    // Attach items to each request
    const getItems = await db.prepare(`
      SELECT 
        ri.*,
        hc.sku,
        hc.name as hardware_name,
        hc.brand,
        hc.model,
        hcat.name as category_name
      FROM request_items ri
      JOIN hardware_catalog hc ON ri.hardware_id = hc.id
      JOIN hardware_categories hcat ON hc.category_id = hcat.id
      WHERE ri.request_id = ?
    `);

    const result = requests.map(r => ({
      ...r,
      items: getItems.all(r.id)
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// IT submits new hardware request or borrow order
router.post('/requests', async (req, res) => {
  try {
    const {
      request_type, // 'PERMANENT', 'REPLACEMENT', 'BORROW'
      branch_id,
      warehouse_id,
      requester_name,
      requester_role,
      recipient_name,
      recipient_role,
      recipient_id,
      purpose,
      borrow_expected_return_date,
      items // [{ hardware_id, quantity }]
    } = req.body;

    if (!branch_id || !warehouse_id || !requester_name || !recipient_name || !items || !items.length) {
      return res.status(400).json({ error: 'Missing required request fields' });
    }

    // Generate Request No
    const count = db.prepare('SELECT COUNT(*) as count FROM hardware_requests').get())?.count || 0;
    const request_no = `REQ-2026-${String(count + 1).padStart(4, '0')}`;

    const branch = (await db.prepare('SELECT name, area, area_manager_name FROM branches WHERE id = ?').get(branch_id);
    const warehouse = await db.prepare('SELECT name, code FROM warehouses WHERE id = ?').get(warehouse_id);

    let requestId;
    const createTx = async () => await db.transaction(async () => {
      const info = await db.prepare(`
        INSERT INTO hardware_requests (
          request_no, request_type, branch_id, warehouse_id,
          requester_name, requester_role, recipient_name, recipient_role, recipient_id,
          purpose, status, am_approval_status, borrow_expected_return_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_AM_APPROVAL', 'PENDING', ?, CURRENT_TIMESTAMP)
      `).run(
        request_no,
        request_type || 'PERMANENT',
        branch_id,
        warehouse_id,
        requester_name,
        requester_role || 'IT Specialist',
        recipient_name,
        recipient_role || 'Branch Staff',
        recipient_id || '',
        purpose,
        borrow_expected_return_date || null
      );
      requestId = info.lastInsertRowid;

      const insertItem = await db.prepare(`
        INSERT INTO request_items (request_id, hardware_id, quantity)
        VALUES (?, ?, ?)
      `);

      for (const it of items) {
        await insertItem.run(requestId, it.hardware_id, Number(it.quantity) || 1);
      }

      // Automatically inform/notify AC and GSD
      const totalUnits = items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
      const isBorrow = request_type === 'BORROW';
      
      // Notify AC (Area Coordinator / Manager)
      db.prepare(`
        INSERT INTO notifications (recipient_role, type, title, message, link_url)
        VALUES ('AC', 'APPROVAL_NEEDED', ?, ?, ?)
      `).run(
        `Action Required: ${isBorrow ? 'Borrow' : 'Hardware'} Requisition ${request_no}`,
        `IT requested ${totalUnits} unit(s) for ${branch.name}. Assigned Recipient: ${recipient_name} (${recipient_role}). Pending your Area Manager approval.`,
        `/approvals`
      );

      // Notify GSD (Purchasing / GSD)
      await db.prepare(`
        INSERT INTO notifications (recipient_role, type, title, message, link_url)
        VALUES ('GSD', 'REQUEST_CREATED', ?, ?, ?)
      `).run(
        `Branch Requisition Filed: ${request_no} (${branch.name})`,
        `IT requested ${totalUnits} unit(s) from ${warehouse.code} destined for ${branch.name}. Expected recipient: ${recipient_name}.`,
        `/requests`
      );
    });

    await createTx();
    res.status(201).json({ id: requestId, request_no, message: 'Request submitted and notifications sent to AC and GSD' });
  } catch (err) {
    console.error('Request creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Area Manager (AM / AC) approves or rejects request
router.post('/requests/:id/am-review', async (req, res) => {
  try {
    const { action, approver_name, remarks } = req.body; // action: 'APPROVE' or 'REJECT'
    const reqId = req.params.id;

    const request = await db.prepare('SELECT * FROM hardware_requests WHERE id = ?').get(reqId);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    if (request.status !== 'PENDING_AM_APPROVAL') {
      return res.status(400).json({ error: `Cannot review request with status ${request.status}` });
    }

    const isApproved = action === 'APPROVE';
    const newStatus = isApproved ? 'APPROVED' : 'REJECTED';
    const amStatus = isApproved ? 'APPROVED' : 'REJECTED';

    await db.prepare(`
      UPDATE hardware_requests
      SET 
        status = ?,
        am_approval_status = ?,
        am_approved_at = CURRENT_TIMESTAMP,
        am_approver_name = ?,
        am_remarks = ?
      WHERE id = ?
    `).run(newStatus, amStatus, approver_name || 'Area Manager (AC)', remarks || (isApproved ? 'Approved for dispatch' : 'Rejected'), reqId);

    // Notify Warehouse and GSD
    if (isApproved) {
      await db.prepare(`
        INSERT INTO notifications (recipient_role, type, title, message, link_url)
        VALUES ('WAREHOUSE', 'APPROVED', ?, ?, ?)
      `).run(
        `Approved for Dispatch: ${request.request_no}`,
        `Area Manager approved requisition ${request.request_no} for ${request.recipient_name}. Ready for warehouse preparation and dispatch.`,
        `/dispatch`
      );
    } else {
      await db.prepare(`
        INSERT INTO notifications (recipient_role, type, title, message, link_url)
        VALUES ('GSD', 'APPROVAL_NEEDED', ?, ?, ?)
      `).run(
        `Requisition Rejected: ${request.request_no}`,
        `Area Manager rejected ${request.request_no}. Reason: ${remarks}`,
        `/requests`
      );
    }

    res.json({ message: `Request ${isApproved ? 'approved' : 'rejected'} successfully`, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Warehouse dispatches approved request to branch
router.post('/requests/:id/dispatch', async (req, res) => {
  try {
    const { dispatched_by, carrier_name, tracking_no, item_serials } = req.body; // item_serials: { [request_item_id]: 'SN-1, SN-2' }
    const reqId = req.params.id;

    const request = await db.prepare('SELECT * FROM hardware_requests WHERE id = ?').get(reqId);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    if (request.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Only approved requests can be dispatched' });
    }

    const items = await db.prepare('SELECT * FROM request_items WHERE request_id = ?').all(reqId);

    const dispatchTx = async () => await db.transaction(async () => {
      // 1. Check & deduct stock from warehouse
      for (const it of items) {
        const stock = await db.prepare('SELECT * FROM warehouse_stocks WHERE warehouse_id = ? AND hardware_id = ?').get(request.warehouse_id, it.hardware_id);
        if (!stock || stock.quantity_on_hand < it.quantity) {
          throw new Error(`Insufficient stock in warehouse for hardware ID #${it.hardware_id}. Available: ${stock ? stock.quantity_on_hand : 0}, Required: ${it.quantity}`);
        }

        const newBalance = stock.quantity_on_hand - it.quantity;
        await db.prepare("UPDATE warehouse_stocks SET quantity_on_hand = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(newBalance, stock.id);

        // Update serial numbers if provided
        if (item_serials && item_serials[it.id]) {
          await db.prepare('UPDATE request_items SET serial_numbers = ? WHERE id = ?').run(item_serials[it.id], it.id);
        }

        // Record outgoing stock movement
        await db.prepare(`
          INSERT INTO stock_movements (
            movement_type, warehouse_id, branch_id, hardware_id, quantity, balance_after,
            reference_type, reference_id, recipient_name, performed_by, notes
          ) VALUES ('OUT_DISPATCH', ?, ?, ?, ?, ?, 'REQUEST', ?, ?, ?, ?)
        `).run(
          request.warehouse_id,
          request.branch_id,
          it.hardware_id,
          it.quantity,
          newBalance,
          request.request_no,
          request.recipient_name,
          dispatched_by || 'Warehouse Custodian',
          `Dispatched to branch via ${carrier_name || 'Logistics'} (Tracking #${tracking_no || 'N/A'})`
        );

        // Check if out of stock or low stock after dispatch
        if (newBalance === 0) {
          await db.prepare(`
            INSERT INTO notifications (recipient_role, type, title, message, link_url)
            VALUES ('GSD', 'OUT_OF_STOCK', ?, ?, ?)
          `).run(
            `OUT OF STOCK ALERT: Item #${it.hardware_id} at Warehouse #${request.warehouse_id}`,
            `Hardware stock depleted after dispatching ${request.request_no}. Immediate replenishment needed!`,
            `/replenishments`
          );
          await db.prepare(`
            INSERT INTO notifications (recipient_role, type, title, message, link_url)
            VALUES ('AC', 'OUT_OF_STOCK', ?, ?, ?)
          `).run(
            `Out of Stock at Warehouse #${request.warehouse_id}`,
            `Item #${it.hardware_id} is now 0 units. Requisitions from this warehouse will be delayed.`,
            `/stock`
          );
        } else if (newBalance <= stock.min_threshold) {
          await db.prepare(`
            INSERT INTO notifications (recipient_role, type, title, message, link_url)
            VALUES ('GSD', 'LOW_STOCK', ?, ?, ?)
          `).run(
            `Low Stock Warning: Item #${it.hardware_id}`,
            `Warehouse #${request.warehouse_id} balance is ${newBalance} (Threshold: ${stock.min_threshold}).`,
            `/replenishments`
          );
        }
      }

      // 2. Update request status to IN_TRANSIT
      await db.prepare(`
        UPDATE hardware_requests
        SET 
          status = 'IN_TRANSIT',
          dispatched_at = CURRENT_TIMESTAMP,
          dispatched_by = ?,
          carrier_name = ?,
          tracking_no = ?
        WHERE id = ?
      `).run(dispatched_by || 'Warehouse Dispatcher', carrier_name || 'Courier Logistics', tracking_no || 'TRK-GEN', reqId);

      // 3. Notify Branch
      await db.prepare(`
        INSERT INTO notifications (recipient_role, type, title, message, link_url)
        VALUES ('BRANCH', 'DISPATCHED', ?, ?, ?)
      `).run(
        `Hardware In Transit: ${request.request_no}`,
        `Hardware dispatched for ${request.recipient_name}. Carrier: ${carrier_name || 'Logistics'}. Tracking: ${tracking_no || 'N/A'}. Ready for arrival acceptance upon delivery.`,
        `/branch-acceptance`
      );
    });

    await dispatchTx();
    res.json({ message: 'Hardware successfully dispatched and stock deducted', status: 'IN_TRANSIT' });
  } catch (err) {
    console.error('Dispatch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Branch accepts delivery & records exact arrival date & time
router.post('/requests/:id/branch-accept', async (req, res) => {
  try {
    const { branch_accepted_by, branch_arrived_at, branch_condition, branch_remarks } = req.body;
    const reqId = req.params.id;

    const request = await db.prepare('SELECT * FROM hardware_requests WHERE id = ?').get(reqId);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    if (request.status !== 'IN_TRANSIT') {
      return res.status(400).json({ error: `Cannot accept delivery for request in ${request.status} status` });
    }

    const arrivalTimestamp = branch_arrived_at || new Date().toISOString().replace('T', ' ').slice(0, 19);

    await db.prepare(`
      UPDATE hardware_requests
      SET 
        status = 'ARRIVED_AND_ACCEPTED',
        branch_arrived_at = ?,
        branch_accepted_by = ?,
        branch_condition = ?,
        branch_remarks = ?
      WHERE id = ?
    `).run(
      arrivalTimestamp,
      branch_accepted_by || request.recipient_name,
      branch_condition || 'GOOD',
      branch_remarks || 'Hardware arrived and accepted in good working condition.',
      reqId
    );

    // Notify Area Manager & GSD that item was received
    await db.prepare(`
      INSERT INTO notifications (recipient_role, type, title, message, link_url)
      VALUES ('AC', 'BRANCH_ARRIVED', ?, ?, ?)
    `).run(
      `Delivery Accepted at Branch: ${request.request_no}`,
      `Requisition ${request.request_no} was successfully received and accepted by ${branch_accepted_by || request.recipient_name} on ${arrivalTimestamp}. Condition: ${branch_condition || 'GOOD'}.`,
      `/requests`
    );

    res.json({ message: 'Delivery successfully accepted at branch with arrival timestamp recorded', status: 'ARRIVED_AND_ACCEPTED' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Borrowed hardware return
router.post('/requests/:id/borrow-return', async (req, res) => {
  try {
    const { borrow_return_condition, return_remarks, returned_by } = req.body;
    const reqId = req.params.id;

    const request = await db.prepare('SELECT * FROM hardware_requests WHERE id = ?').get(reqId);
    if (!request || request.request_type !== 'BORROW') {
      return res.status(400).json({ error: 'Invalid borrow request' });
    }

    const items = await db.prepare('SELECT * FROM request_items WHERE request_id = ?').all(reqId);

    const returnTx = async () => await db.transaction(async () => {
      // Return stock to warehouse
      for (const it of items) {
        const stock = await db.prepare('SELECT * FROM warehouse_stocks WHERE warehouse_id = ? AND hardware_id = ?').get(request.warehouse_id, it.hardware_id);
        const newBalance = (stock ? stock.quantity_on_hand : 0) + it.quantity;

        if (stock) {
          await db.prepare("UPDATE warehouse_stocks SET quantity_on_hand = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(newBalance, stock.id);
        } else {
          await db.prepare('INSERT INTO warehouse_stocks (warehouse_id, hardware_id, quantity_on_hand) VALUES (?, ?, ?)').run(request.warehouse_id, it.hardware_id, it.quantity);
        }

        await db.prepare(`
          INSERT INTO stock_movements (movement_type, warehouse_id, branch_id, hardware_id, quantity, balance_after, reference_type, reference_id, performed_by, notes)
          VALUES ('IN_RETURN', ?, ?, ?, ?, ?, 'REQUEST', ?, ?, ?)
        `).run(
          request.warehouse_id,
          request.branch_id,
          it.hardware_id,
          it.quantity,
          newBalance,
          request.request_no,
          returned_by || 'Branch Custodian',
          `Borrowed hardware returned to warehouse. Condition: ${borrow_return_condition || 'GOOD'}. ${return_remarks || ''}`
        );
      }

      await db.prepare(`
        UPDATE hardware_requests
        SET borrow_returned_at = CURRENT_TIMESTAMP, borrow_return_condition = ?
        WHERE id = ?
      `).run(borrow_return_condition || 'GOOD', reqId);
    });

    await returnTx();
    res.json({ message: 'Borrowed hardware returned and stock replenished at warehouse' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 5B. WAREHOUSE RESTOCK REQUISITIONS (to PU / GSD via Area Coordinator Approval)
// --------------------------------------------------------------------------

// Get warehouse restock requests
router.get('/warehouse-restock-requests', async (req, res) => {
  try {
    const { warehouse_id, status } = req.query;
    let sql = `
      SELECT 
        wrr.*,
        w.code as warehouse_code,
        w.name as warehouse_name,
        w.region as warehouse_region,
        w.area as warehouse_area,
        hc.sku,
        hc.name as hardware_name,
        hc.brand,
        hc.model,
        hcat.name as category_name,
        COALESCE(ws.quantity_on_hand, 0) as current_quantity_on_hand,
        COALESCE(ws.min_threshold, hc.default_min_threshold) as min_threshold,
        COALESCE(ws.max_threshold, 20) as max_threshold
      FROM warehouse_restock_requests wrr
      JOIN warehouses w ON wrr.warehouse_id = w.id
      JOIN hardware_catalog hc ON wrr.hardware_id = hc.id
      JOIN hardware_categories hcat ON hc.category_id = hcat.id
      LEFT JOIN warehouse_stocks ws ON ws.warehouse_id = wrr.warehouse_id AND ws.hardware_id = wrr.hardware_id
      WHERE 1=1
    `;
    const params = [];
    if (warehouse_id) {
      sql += ' AND wrr.warehouse_id = ?';
      params.push(warehouse_id);
    }
    if (status) {
      sql += ' AND wrr.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY wrr.id DESC';
    const requests = await db.prepare(sql).all(...params);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Warehouse initiates restock request to PU/GSD (requires AC approval)
router.post('/warehouse-restock-requests', async (req, res) => {
  try {
    const { warehouse_id, hardware_id, requested_quantity, urgency, reason, requested_by } = req.body;
    if (!warehouse_id || !hardware_id || !requested_quantity || !requested_by) {
      return res.status(400).json({ error: 'Missing required restock request fields' });
    }

    const count = await db.prepare('SELECT COUNT(*) as count FROM warehouse_restock_requests').get())?.count || 0;
    const request_no = `WRR-2026-${String(count + 1).padStart(4, '0')}`;

    const wh = (await db.prepare('SELECT code, name, region, area FROM warehouses WHERE id = ?').get(warehouse_id);
    const hw = await db.prepare('SELECT name, sku FROM hardware_catalog WHERE id = ?').get(hardware_id);

    let newId;
    const tx = await db.transaction(async () => {
      const info = await db.prepare(`
        INSERT INTO warehouse_restock_requests (
          request_no, warehouse_id, hardware_id, requested_quantity,
          urgency, reason, requested_by, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_AC_APPROVAL', CURRENT_TIMESTAMP)
      `).run(
        request_no,
        warehouse_id,
        hardware_id,
        Number(requested_quantity) || 1,
        urgency || 'NORMAL',
        reason || '',
        requested_by
      );
      newId = info.lastInsertRowid;

      // Automatically inform Area Coordinator (AC) for mandatory review
      await db.prepare(`
        INSERT INTO notifications (recipient_role, type, title, message, link_url)
        VALUES ('AC', 'APPROVAL_NEEDED', ?, ?, ?)
      `).run(
        `Warehouse Restock Approval Needed: ${request_no}`,
        `${wh.name} requested restock of ${requested_quantity} units of ${hw.name} (${hw.sku}). AC review is required before sending to PU/GSD.`,
        `/approvals`
      );
    });

    tx();
    res.status(201).json({ id: newId, request_no, message: 'Stock restock request submitted for AC review' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Area Coordinator reviews restock request
router.post('/warehouse-restock-requests/:id/ac-review', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, approver_name, remarks } = req.body; // action: 'APPROVE' | 'REJECT'
    if (!action || !approver_name) {
      return res.status(400).json({ error: 'Missing action or approver name' });
    }

    const wrr = await db.prepare(`
      SELECT wrr.*, w.name as warehouse_name, w.code as warehouse_code, hc.name as hardware_name, hc.sku
      FROM warehouse_restock_requests wrr
      JOIN warehouses w ON wrr.warehouse_id = w.id
      JOIN hardware_catalog hc ON wrr.hardware_id = hc.id
      WHERE wrr.id = ?
    `).get(id);

    if (!wrr) return res.status(404).json({ error: 'Restock request not found' });

    const newStatus = action === 'APPROVE' ? 'APPROVED_BY_AC' : 'REJECTED_BY_AC';

    const tx = await db.transaction(async () => {
      await db.prepare(`
        UPDATE warehouse_restock_requests
        SET status = ?, ac_approver_name = ?, ac_remarks = ?, ac_reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStatus, approver_name, remarks || '', id);

      if (action === 'APPROVE') {
        // Forwarded to PU / GSD for procurement
        await db.prepare(`
          INSERT INTO notifications (recipient_role, type, title, message, link_url)
          VALUES ('GSD', 'REPLENISHMENT_NEEDED', ?, ?, ?)
        `).run(
          `Approved Restock Ready for PO: ${wrr.request_no}`,
          `AC ${approver_name} approved restock of ${wrr.requested_quantity} units of ${wrr.hardware_name} for ${wrr.warehouse_name}. Please issue a Purchase Order.`,
          `/gsd-replenishment`
        );

        // Notify Warehouse custodian that AC approved and forwarded to GSD
        await db.prepare(`
          INSERT INTO notifications (recipient_role, type, title, message, link_url)
          VALUES ('WAREHOUSE', 'APPROVED', ?, ?, ?)
        `).run(
          `AC Approved Restock: ${wrr.request_no}`,
          `Your restock request for ${wrr.hardware_name} was approved by ${approver_name} and forwarded to PU/GSD for PO issuance.`,
          `/stock`
        );
      } else {
        // Notify Warehouse of AC rejection
        await db.prepare(`
          INSERT INTO notifications (recipient_role, type, title, message, link_url)
          VALUES ('WAREHOUSE', 'REJECTED', ?, ?, ?)
        `).run(
          `Restock Declined by AC: ${wrr.request_no}`,
          `Your restock request for ${wrr.hardware_name} was declined by ${approver_name}. Remarks: "${remarks || 'Declined'}"`,
          `/stock`
        );
      }
    });

    tx();
    res.json({
      message: `Restock request ${action === 'APPROVE' ? 'approved and forwarded to PU/GSD' : 'rejected'}`,
      status: newStatus
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Link restock request to PO
router.post('/warehouse-restock-requests/:id/link-po', async (req, res) => {
  try {
    const { id } = req.params;
    const { po_number } = req.body;
    await db.prepare(`
      UPDATE warehouse_restock_requests
      SET status = 'PO_ISSUED_BY_GSD', po_number = ?
      WHERE id = ?
    `).run(po_number, id);
    res.json({ message: 'Linked restock request to PO' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 6. PURCHASING / GSD REPLENISHMENT & WAREHOUSE ACCEPTANCE & BRANCH CONFIRMATION
// --------------------------------------------------------------------------
router.get('/replenishments', async (req, res) => {
  try {
    const { warehouse_id, branch_id, status } = req.query;
    let sql = `
      SELECT 
        rep.*,
        w.code as warehouse_code,
        w.name as warehouse_name,
        w.region as warehouse_region,
        b.code as branch_code,
        b.name as branch_name,
        b.region as branch_region
      FROM replenishments rep
      JOIN warehouses w ON rep.warehouse_id = w.id
      LEFT JOIN branches b ON rep.destination_branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (warehouse_id) {
      sql += ' AND rep.warehouse_id = ?';
      params.push(warehouse_id);
    }
    if (branch_id) {
      sql += ' AND rep.destination_branch_id = ?';
      params.push(branch_id);
    }
    if (status) {
      sql += ' AND rep.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY rep.id DESC';
    const list = await db.prepare(sql).all(...params);

    const getItems = await db.prepare(`
      SELECT 
        ri.*,
        hc.sku,
        hc.name as hardware_name,
        hc.brand,
        hc.model,
        hcat.name as category_name
      FROM replenishment_items ri
      JOIN hardware_catalog hc ON ri.hardware_id = hc.id
      JOIN hardware_categories hcat ON hc.category_id = hcat.id
      WHERE ri.replenishment_id = ?
    `);

    const result = list.map(r => ({
      ...r,
      items: getItems.all(r.id)
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GSD creates replenishment order and dispatches to warehouse (optionally specifying destination branch)
router.post('/replenishments', async (req, res) => {
  try {
    const { warehouse_id, destination_branch_id, gsd_staff_name, supplier_name, estimated_arrival, items } = req.body;

    if (!warehouse_id || !gsd_staff_name || !supplier_name || !items || !items.length) {
      return res.status(400).json({ error: 'Missing required replenishment fields' });
    }

    const count = db.prepare('SELECT COUNT(*) as count FROM replenishments').get())?.count || 0;
    const po_number = `PO-GSD-2026-${String(count + 1).padStart(4, '0')}`;

    const wh = await db.prepare('SELECT code, name FROM warehouses WHERE id = ?').get(warehouse_id);
    let targetBranch = null;
    if (destination_branch_id) {
      targetBranch = await db.prepare('SELECT code, name FROM branches WHERE id = ?').get(destination_branch_id);
    }

    let repId;
    const createTx = async () => await db.transaction(async () => {
      const info = await db.prepare(`
        INSERT INTO replenishments (
          po_number, warehouse_id, destination_branch_id, gsd_staff_name, supplier_name, status,
          estimated_arrival, shipped_at, created_at
        ) VALUES (?, ?, ?, ?, ?, 'IN_TRANSIT', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        po_number,
        warehouse_id,
        destination_branch_id || null,
        gsd_staff_name,
        supplier_name,
        estimated_arrival || null
      );
      repId = info.lastInsertRowid;

      const insertItem = await db.prepare(`
        INSERT INTO replenishment_items (replenishment_id, hardware_id, quantity_ordered, quantity_received)
        VALUES (?, ?, ?, 0)
      `);

      let totalUnits = 0;
      for (const it of items) {
        const qty = Number(it.quantity) || 1;
        totalUnits += qty;
        await insertItem.run(repId, it.hardware_id, qty);
      }

      // Notify Warehouse of incoming stock replenishment
      const branchNotice = targetBranch ? ` Destination branch: ${targetBranch.name} (${targetBranch.code}).` : '';
      db.prepare(`
        INSERT INTO notifications (recipient_role, type, title, message, link_url)
        VALUES ('WAREHOUSE', 'REPLENISHMENT_SHIPPED', ?, ?, ?)
      `).run(
        `Incoming Restock: ${po_number}`,
        `Purchasing/GSD dispatched ${totalUnits} units to ${wh.code}. Supplier: ${supplier_name}.${branchNotice} Awaiting warehouse arrival acceptance.`,
        `/warehouse-replenishment`
      );

      // If a destination branch is specified, notify branch
      if (targetBranch) {
        await db.prepare(`
          INSERT INTO notifications (recipient_role, type, title, message, link_url)
          VALUES ('BRANCH', 'REPLENISHMENT_SHIPPED', ?, ?, ?)
        `).run(
          `Replenishment Pipeline Scheduled: ${po_number}`,
          `GSD has dispatched restock of ${totalUnits} units via ${wh.code} intended for your branch. You will confirm receipt once processed by warehouse.`,
          `/branch-acceptance`
        );
      }

      // If linked to an approved warehouse restock request, update its status
      if (req.body.restock_request_id) {
        await db.prepare(`
          UPDATE warehouse_restock_requests
          SET status = 'PO_ISSUED_BY_GSD', po_number = ?
          WHERE id = ?
        `).run(po_number, req.body.restock_request_id);
      }
    });

    await createTx();
    res.status(201).json({ id: repId, po_number, message: 'Replenishment order created and dispatched to warehouse' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Warehouse accepts replenishment: logs exact arrival date/time, restocks inventory, and updates status
router.post('/replenishments/:id/warehouse-accept', async (req, res) => {
  try {
    const { arrived_at, warehouse_accepted_by, arrival_remarks, received_items } = req.body;
    // received_items: [{ item_id, quantity_received }]
    const repId = req.params.id;

    const rep = await db.prepare(`
      SELECT rep.*, w.code as warehouse_code, w.name as warehouse_name, b.code as branch_code, b.name as branch_name
      FROM replenishments rep
      JOIN warehouses w ON rep.warehouse_id = w.id
      LEFT JOIN branches b ON rep.destination_branch_id = b.id
      WHERE rep.id = ?
    `).get(repId);

    if (!rep) return res.status(404).json({ error: 'Replenishment not found' });

    if (rep.status === 'ARRIVED_AND_ACCEPTED' || rep.status === 'BRANCH_CONFIRMED') {
      return res.status(400).json({ error: 'This replenishment has already been accepted and processed' });
    }

    const items = await db.prepare('SELECT * FROM replenishment_items WHERE replenishment_id = ?').all(repId);
    const arrivalTimestamp = arrived_at || new Date().toISOString().replace('T', ' ').slice(0, 19);

    const hasDestinationBranch = !!rep.destination_branch_id;
    const nextStatus = hasDestinationBranch ? 'ARRIVED_AT_WAREHOUSE' : 'ARRIVED_AND_ACCEPTED';

    const acceptTx = async () => await db.transaction(async () => {
      for (const it of items) {
        let qtyReceived = it.quantity_ordered;
        if (received_items) {
          const match = received_items.find(r => r.item_id === it.id);
          if (match && match.quantity_received !== undefined) {
            qtyReceived = Number(match.quantity_received);
          }
        }

        // Update item received quantity
        await db.prepare('UPDATE replenishment_items SET quantity_received = ? WHERE id = ?').run(qtyReceived, it.id);

        // Add to warehouse stock
        const stock = await db.prepare('SELECT * FROM warehouse_stocks WHERE warehouse_id = ? AND hardware_id = ?').get(rep.warehouse_id, it.hardware_id);
        const newBalance = (stock ? stock.quantity_on_hand : 0) + qtyReceived;

        if (stock) {
          await db.prepare(`
            UPDATE warehouse_stocks
            SET quantity_on_hand = ?, last_restocked_at = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(newBalance, arrivalTimestamp, stock.id);
        } else {
          await db.prepare(`
            INSERT INTO warehouse_stocks (warehouse_id, hardware_id, quantity_on_hand, min_threshold, max_threshold, last_restocked_at)
            VALUES (?, ?, ?, 5, 25, ?)
          `).run(rep.warehouse_id, it.hardware_id, newBalance, arrivalTimestamp);
        }

        // Record incoming stock movement
        await db.prepare(`
          INSERT INTO stock_movements (
            movement_type, warehouse_id, hardware_id, quantity, balance_after,
            reference_type, reference_id, performed_by, notes, created_at
          ) VALUES ('IN_REPLENISHMENT', ?, ?, ?, ?, 'REPLENISHMENT', ?, ?, ?, ?)
        `).run(
          rep.warehouse_id,
          it.hardware_id,
          qtyReceived,
          newBalance,
          rep.po_number,
          warehouse_accepted_by || 'Warehouse Supervisor',
          `Restocked from ${rep.supplier_name} PO ${rep.po_number}. Remarks: ${arrival_remarks || 'Goods verified and accepted'}`,
          arrivalTimestamp
        );
      }

      // Update replenishment status
      await db.prepare(`
        UPDATE replenishments
        SET 
          status = ?,
          arrived_at = ?,
          warehouse_accepted_by = ?,
          arrival_remarks = ?
        WHERE id = ?
      `).run(
        nextStatus,
        arrivalTimestamp,
        warehouse_accepted_by || 'Warehouse Receiver',
        arrival_remarks || 'Shipment inspected and verified against delivery documents.',
        repId
      );

      // Notify GSD that replenishment arrived at warehouse
      await db.prepare(`
        INSERT INTO notifications (recipient_role, type, title, message, link_url)
        VALUES ('GSD', 'REPLENISHMENT_ARRIVED', ?, ?, ?)
      `).run(
        `Replenishment Accepted at Warehouse: ${rep.po_number}`,
        `Warehouse accepted incoming restock ${rep.po_number} on ${arrivalTimestamp}.${hasDestinationBranch ? ' Awaiting branch receipt confirmation.' : ' Stock is now available.'}`,
        `/replenishments`
      );

      // If replenishment has a destination branch, notify branch that goods arrived at warehouse and are ready for branch confirmation
      if (hasDestinationBranch) {
        await db.prepare(`
          INSERT INTO notifications (recipient_role, type, title, message, link_url)
          VALUES ('BRANCH', 'APPROVAL_NEEDED', ?, ?, ?)
        `).run(
          `Replenishment Awaiting Branch Receipt: ${rep.po_number}`,
          `Stock replenishment ${rep.po_number} for your branch has been accepted at ${rep.warehouse_code}. Please confirm stock arrival upon physical receipt.`,
          `/branch-acceptance`
        );
      }
    });

    await acceptTx();
    res.json({
      message: hasDestinationBranch
        ? 'Replenishment goods accepted at warehouse and awaiting branch receipt confirmation'
        : 'Replenishment goods accepted, warehouse stock replenished, and arrival report generated',
      status: nextStatus
    });
  } catch (err) {
    console.error('Replenishment acceptance error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Destination Branch confirms they received the replenishment stock
router.post('/replenishments/:id/branch-confirm', async (req, res) => {
  try {
    const { branch_received_at, branch_confirmed_by, branch_condition, branch_remarks } = req.body;
    const repId = req.params.id;

    const rep = await db.prepare(`
      SELECT rep.*, w.code as warehouse_code, w.name as warehouse_name, b.code as branch_code, b.name as branch_name
      FROM replenishments rep
      JOIN warehouses w ON rep.warehouse_id = w.id
      LEFT JOIN branches b ON rep.destination_branch_id = b.id
      WHERE rep.id = ?
    `).get(repId);

    if (!rep) return res.status(404).json({ error: 'Replenishment not found' });
    if (!rep.destination_branch_id) {
      return res.status(400).json({ error: 'This replenishment does not have an assigned destination branch' });
    }

    if (rep.status === 'BRANCH_CONFIRMED' || rep.status === 'ARRIVED_AND_ACCEPTED') {
      return res.status(400).json({ error: 'This replenishment has already been confirmed by the branch' });
    }

    const confirmTimestamp = branch_received_at || new Date().toISOString().replace('T', ' ').slice(0, 19);

    const confirmTx = async () => await db.transaction(async () => {
      await db.prepare(`
        UPDATE replenishments
        SET 
          status = 'BRANCH_CONFIRMED',
          branch_received_at = ?,
          branch_confirmed_by = ?,
          branch_condition = ?,
          branch_remarks = ?
        WHERE id = ?
      `).run(
        confirmTimestamp,
        branch_confirmed_by || 'Branch Custodian',
        branch_condition || 'GOOD',
        branch_remarks || 'Stock received at branch in verified working condition.',
        repId
      );

      // Record stock movement for branch receipt confirmation
      const items = await db.prepare('SELECT * FROM replenishment_items WHERE replenishment_id = ?').all(repId);
      for (const it of items) {
        await db.prepare(`
          INSERT INTO stock_movements (
            movement_type, warehouse_id, branch_id, hardware_id, quantity, balance_after,
            reference_type, reference_id, performed_by, notes, created_at
          ) VALUES ('IN_REPLENISHMENT', ?, ?, ?, ?, 0, 'REPLENISHMENT', ?, ?, ?, ?)
        `).run(
          rep.warehouse_id,
          rep.destination_branch_id,
          it.hardware_id,
          it.quantity_received || it.quantity_ordered,
          rep.po_number,
          branch_confirmed_by || 'Branch Custodian',
          `Branch confirmed receipt of replenishment stock for ${rep.branch_name}. Condition: ${branch_condition || 'GOOD'}. Remarks: ${branch_remarks || 'Complete shipment'}`,
          confirmTimestamp
        );
      }

      // Notify GSD and Warehouse
      await db.prepare(`
        INSERT INTO notifications (recipient_role, type, title, message, link_url)
        VALUES ('GSD', 'BRANCH_ARRIVED', ?, ?, ?)
      `).run(
        `Branch Confirmed Stock Receipt: ${rep.po_number}`,
        `${rep.branch_name} has confirmed receipt of replenishment stock for ${rep.po_number} on ${confirmTimestamp}.`,
        `/replenishments`
      );

      await db.prepare(`
        INSERT INTO notifications (recipient_role, type, title, message, link_url)
        VALUES ('WAREHOUSE', 'BRANCH_ARRIVED', ?, ?, ?)
      `).run(
        `Branch Confirmed Restock Arrival: ${rep.po_number}`,
        `${rep.branch_name} verified and received goods from ${rep.po_number}.`,
        `/warehouse-replenishment`
      );
    });

    await confirmTx();
    res.json({
      message: 'Branch stock receipt confirmed successfully with arrival date/time logged',
      status: 'BRANCH_CONFIRMED'
    });
  } catch (err) {
    console.error('Branch replenishment confirmation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Single replenishment arrival report (Full 3-stage chain: GSD -> WH -> Branch)
router.get('/replenishments/:id/report', async (req, res) => {
  try {
    const rep = await db.prepare(`
      SELECT 
        rep.*,
        w.code as warehouse_code,
        w.name as warehouse_name,
        w.address as warehouse_address,
        w.contact_person as warehouse_contact,
        w.phone as warehouse_phone,
        b.code as branch_code,
        b.name as branch_name,
        b.region as branch_region,
        b.address as branch_address,
        b.contact_person as branch_contact
      FROM replenishments rep
      JOIN warehouses w ON rep.warehouse_id = w.id
      LEFT JOIN branches b ON rep.destination_branch_id = b.id
      WHERE rep.id = ?
    `).get(req.params.id);

    if (!rep) return res.status(404).json({ error: 'Replenishment not found' });

    const items = await db.prepare(`
      SELECT 
        ri.*,
        hc.sku,
        hc.name as hardware_name,
        hc.brand,
        hc.model,
        hc.specifications,
        hc.unit,
        hcat.name as category_name
      FROM replenishment_items ri
      JOIN hardware_catalog hc ON ri.hardware_id = hc.id
      JOIN hardware_categories hcat ON hc.category_id = hcat.id
      WHERE ri.replenishment_id = ?
    `).all(req.params.id);

    res.json({ report: rep, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 7. STOCK MOVEMENTS (INCOMING & OUTGOING AUDIT LEDGER)
// --------------------------------------------------------------------------
router.get('/movements', async (req, res) => {
  try {
    const { warehouse_id, branch_id, movement_type, search, limit } = req.query;
    let sql = `
      SELECT 
        sm.*,
        w.code as warehouse_code,
        w.name as warehouse_name,
        b.code as branch_code,
        b.name as branch_name,
        hc.sku,
        hc.name as hardware_name,
        hc.brand,
        hc.model,
        hcat.name as category_name
      FROM stock_movements sm
      JOIN warehouses w ON sm.warehouse_id = w.id
      LEFT JOIN branches b ON sm.branch_id = b.id
      JOIN hardware_catalog hc ON sm.hardware_id = hc.id
      JOIN hardware_categories hcat ON hc.category_id = hcat.id
      WHERE 1=1
    `;
    const params = [];

    if (warehouse_id) {
      sql += ' AND sm.warehouse_id = ?';
      params.push(warehouse_id);
    }
    if (branch_id) {
      sql += ' AND sm.branch_id = ?';
      params.push(branch_id);
    }
    if (movement_type) {
      sql += ' AND sm.movement_type = ?';
      params.push(movement_type);
    }
    if (search) {
      sql += ' AND (hc.name LIKE ? OR sm.reference_id LIKE ? OR sm.recipient_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY sm.id DESC LIMIT ?';
    params.push(Number(limit) || 100);

    const movements = await db.prepare(sql).all(...params);
    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 8. NOTIFICATIONS (AC, GSD, Warehouse, Branch)
// --------------------------------------------------------------------------
router.get('/notifications', async (req, res) => {
  try {
    const { role } = req.query;
    let sql = 'SELECT * FROM notifications WHERE 1=1';
    const params = [];

    if (role && role !== 'ALL') {
      sql += " AND (recipient_role = ? OR recipient_role = 'ALL')";
      params.push(role);
    }

    sql += ' ORDER BY id DESC LIMIT 50';
    const notifs = await db.prepare(sql).all(...params);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/:id/read', async (req, res) => {
  try {
    await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/read-all', async (req, res) => {
  try {
    const { role } = req.body;
    if (role && role !== 'ALL') {
      await db.prepare('UPDATE notifications SET is_read = 1 WHERE recipient_role = ?').run(role);
    } else {
      await db.prepare('UPDATE notifications SET is_read = 1').run();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 9. AUTHENTICATION & USER MANAGEMENT (ADMIN CONTROL)
// --------------------------------------------------------------------------
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const trimmedUser = username.trim().toLowerCase();
    let user = await db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.password,
        u.full_name,
        u.email,
        u.role,
        u.assigned_warehouse_id,
        u.assigned_branch_id,
        u.is_active,
        u.created_at,
        w.code as warehouse_code,
        w.name as warehouse_name,
        b.code as branch_code,
        b.name as branch_name,
        b.region as branch_region
      FROM users u
      LEFT JOIN warehouses w ON u.assigned_warehouse_id = w.id
      LEFT JOIN branches b ON u.assigned_branch_id = b.id
      WHERE LOWER(u.username) = LOWER(?)
    `).get(trimmedUser);

    // Fallback: If username is in format wh_01..wh_22 or wh_1..wh_22, resolve by warehouse ID
    if (!user && /^wh_0*(\d+)$/.test(trimmedUser)) {
      const whId = parseInt(trimmedUser.replace('wh_', ''), 10);
      user = await db.prepare(`
        SELECT 
          u.id, u.username, u.password, u.full_name, u.email, u.role,
          u.assigned_warehouse_id, u.assigned_branch_id, u.is_active, u.created_at,
          w.code as warehouse_code, w.name as warehouse_name,
          b.code as branch_code, b.name as branch_name, b.region as branch_region
        FROM users u
        LEFT JOIN warehouses w ON u.assigned_warehouse_id = w.id
        LEFT JOIN branches b ON u.assigned_branch_id = b.id
        WHERE u.assigned_warehouse_id = ? AND u.role = 'WAREHOUSE'
        ORDER BY u.id ASC
      `).get(whId);
    }

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated by the Administrator' });
    }

    // Return safe user object (excluding password)
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.email,
        u.role,
        u.assigned_warehouse_id,
        u.assigned_branch_id,
        u.is_active,
        u.created_at,
        w.code as warehouse_code,
        w.name as warehouse_name,
        b.code as branch_code,
        b.name as branch_name,
        b.region as branch_region
      FROM users u
      LEFT JOIN warehouses w ON u.assigned_warehouse_id = w.id
      LEFT JOIN branches b ON u.assigned_branch_id = b.id
      ORDER BY u.id ASC
    `).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { username, password, full_name, email, role, assigned_warehouse_id, assigned_branch_id } = req.body;
    if (!username || !full_name || !email || !role) {
      return res.status(400).json({ error: 'Missing required user fields (username, full_name, email, role)' });
    }

    const info = await db.prepare(`
      INSERT INTO users (username, password, full_name, email, role, assigned_warehouse_id, assigned_branch_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      username.toLowerCase().trim(),
      password || 'password123',
      full_name.trim(),
      email.toLowerCase().trim(),
      role,
      assigned_warehouse_id || null,
      assigned_branch_id || null
    );

    res.status(201).json({ id: info.lastInsertRowid, message: `User "${username}" created successfully with role ${role}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { full_name, email, password, is_active } = req.body;
    const userId = req.params.id;

    await db.prepare(`
      UPDATE users
      SET 
        full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        password = COALESCE(?, password),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(full_name, email, password, is_active, userId);

    res.json({ message: 'User profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin assigns or updates user role & facility assignment
router.post('/users/:id/assign-role', async (req, res) => {
  try {
    const { role, assigned_warehouse_id, assigned_branch_id } = req.body;
    const userId = req.params.id;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const validRoles = ['IT', 'AC', 'GSD', 'WAREHOUSE', 'BRANCH', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    await db.prepare(`
      UPDATE users
      SET 
        role = ?,
        assigned_warehouse_id = ?,
        assigned_branch_id = ?
      WHERE id = ?
    `).run(
      role,
      role === 'WAREHOUSE' ? assigned_warehouse_id : (role === 'AC' || role === 'IT' ? assigned_warehouse_id : null),
      role === 'BRANCH' ? assigned_branch_id : null,
      userId
    );

    // Notify user of role assignment
    await db.prepare(`
      INSERT INTO notifications (recipient_role, type, title, message)
      VALUES (?, 'APPROVAL_NEEDED', 'Role Updated by Admin', 'Your system permissions and access role have been set to ' || ?)
    `).run(role, role);

    res.json({ message: `Role successfully updated to ${role} for user #${userId}`, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    // Toggle active status
    await db.prepare('UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(userId);
    res.json({ message: 'User active status toggled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

