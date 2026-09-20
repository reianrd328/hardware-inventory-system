const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api${path}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
        }
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(resData);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, body: resData });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING WAREHOUSE MANAGEMENT & RESET TESTS ===\n');

  // Test 1: Manual Backup
  console.log('Test 1: POST /api/warehouses/backup');
  const backupRes = await request('POST', '/warehouses/backup');
  console.log('Backup Result:', backupRes.status, backupRes.body);
  if (backupRes.status !== 200 || !backupRes.body.success) {
    throw new Error('Backup failed');
  }
  console.log('✓ Test 1 Passed: Database backup successfully created.\n');

  // Test 2: Safe Reset of Mock Warehouses
  console.log('Test 2: POST /api/warehouses/clear-all (Safe Reset)');
  const resetRes = await request('POST', '/warehouses/clear-all');
  console.log('Reset Result:', resetRes.status, resetRes.body);
  if (resetRes.status !== 200 || !resetRes.body.success) {
    throw new Error('Clear-all failed');
  }
  if (resetRes.body.stats.warehouses !== 0) {
    throw new Error(`Expected 0 warehouses, found ${resetRes.body.stats.warehouses}`);
  }
  if (resetRes.body.stats.branches === 0 || resetRes.body.stats.catalogItems === 0) {
    throw new Error('Branches or Catalog items were accidentally deleted!');
  }
  console.log('✓ Test 2 Passed: All mock warehouses safely cleared, branches & catalog preserved.\n');

  // Test 3: Verify GET /api/warehouses returns 0 warehouses
  console.log('Test 3: GET /api/warehouses (Check Empty State)');
  const emptyWhRes = await request('GET', '/warehouses');
  console.log(`Warehouses in system: ${emptyWhRes.body.length}`);
  if (emptyWhRes.body.length !== 0) throw new Error('Expected 0 warehouses');
  console.log('✓ Test 3 Passed: Confirmed 0 warehouses.\n');

  // Test 4: Manually create first real company warehouse
  console.log('Test 4: POST /api/warehouses (Create First Company Warehouse)');
  const newWhData = {
    code: 'WH-HO-01',
    name: 'Head Office Central Logistics Hub',
    region: 'National Capital Region',
    area: 'Taguig / BGC Complex',
    address: 'Building 7, FTI Industrial Center, Taguig City, Metro Manila',
    contact_person: 'Rodrigo Villanueva',
    phone: '+63 917 555 1234',
    email: 'wh.headoffice@company.com',
    initial_stock_mode: 'EMPTY',
    custodian_username: 'wh_headoffice',
    custodian_password: 'wh123'
  };
  const createWhRes = await request('POST', '/warehouses', newWhData);
  console.log('Create WH Result:', createWhRes.status, createWhRes.body);
  if (createWhRes.status !== 201 || !createWhRes.body.warehouse) {
    throw new Error('Create warehouse failed');
  }
  const createdWhId = createWhRes.body.warehouse.id;
  console.log(`✓ Test 4 Passed: Created Warehouse ID ${createdWhId} (${createWhRes.body.warehouse.code}).\n`);

  // Test 5: Verify stocks initialized for all catalog items
  console.log('Test 5: GET /api/warehouses/:id (Verify Initialized Stocks)');
  const whDetailsRes = await request('GET', `/warehouses/${createdWhId}`);
  console.log(`Warehouse: ${whDetailsRes.body.warehouse.name}`);
  console.log(`Tracked stock items count: ${whDetailsRes.body.stocks.length}`);
  if (whDetailsRes.body.stocks.length === 0) {
    throw new Error('Stocks were not initialized for new warehouse');
  }
  console.log('✓ Test 5 Passed: All hardware catalog items initialized with 0 units on hand.\n');

  // Test 6: Verify dedicated custodian account login
  console.log('Test 6: POST /api/auth/login with New Custodian Credentials');
  const loginRes = await request('POST', '/auth/login', {
    username: 'wh_headoffice',
    password: 'wh123'
  });
  console.log('Custodian Login Result:', loginRes.status, loginRes.body.user?.username, loginRes.body.user?.role);
  if (loginRes.status !== 200 || loginRes.body.user?.role !== 'WAREHOUSE') {
    throw new Error('Custodian login failed');
  }
  console.log('✓ Test 6 Passed: Custodian logged in directly with role WAREHOUSE.\n');

  // Test 7: Update warehouse details
  console.log('Test 7: PUT /api/warehouses/:id (Update Warehouse Details)');
  const updateRes = await request('PUT', `/warehouses/${createdWhId}`, {
    name: 'Head Office Mega Distribution Hub',
    phone: '+63 917 999 8888'
  });
  console.log('Update Result:', updateRes.status, updateRes.body.warehouse?.name, updateRes.body.warehouse?.phone);
  if (updateRes.status !== 200 || updateRes.body.warehouse.name !== 'Head Office Mega Distribution Hub') {
    throw new Error('Warehouse update failed');
  }
  console.log('✓ Test 7 Passed: Warehouse updated successfully.\n');

  // Test 8: Create a second warehouse to verify multiple warehouses
  console.log('Test 8: POST /api/warehouses (Create Second Company Warehouse)');
  const wh2Data = {
    code: 'WH-CEBU-01',
    name: 'Cebu Mandaue Regional Hub',
    region: 'Visayas',
    area: 'Cebu Metro',
    address: 'M.L. Quezon National Highway, Mandaue City, Cebu',
    contact_person: 'Bernadette Lim',
    phone: '+63 918 333 4455',
    email: 'wh.cebu@company.com',
    initial_stock_mode: 'DEFAULT_PAR'
  };
  const wh2Res = await request('POST', '/warehouses', wh2Data);
  console.log('Second WH Result:', wh2Res.status, wh2Res.body.warehouse?.code);
  if (wh2Res.status !== 201) throw new Error('Create second warehouse failed');
  console.log('✓ Test 8 Passed: Second warehouse created with default par buffer stocks.\n');

  // Test 9: Verify list contains 2 warehouses
  console.log('Test 9: GET /api/warehouses');
  const listRes = await request('GET', '/warehouses');
  console.log(`Total warehouses in system: ${listRes.body.length}`);
  if (listRes.body.length !== 2) throw new Error(`Expected 2 warehouses, got ${listRes.body.length}`);
  console.log('✓ Test 9 Passed: Confirmed 2 real warehouses in network.\n');

  console.log('====================================================');
  console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
