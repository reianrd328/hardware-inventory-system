// test_api.js: Automated Verification Suite for Hardware Inventory & Requisition System
const http = require('http');

const BASE_HOST = 'localhost';
const BASE_PORT = 5000;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const options = {
      hostname: BASE_HOST,
      port: BASE_PORT,
      path: `/api${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(dataString ? { 'Content-Length': Buffer.byteLength(dataString) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(responseBody);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('STARTING AUTOMATED VERIFICATION: HARDWARE MONITORING SYSTEM');
  console.log('===============================================================');

  // Test 1: Health check
  const health = await request('GET', '/health');
  assert(health.status === 200 && health.data.status === 'ok', 'Server health check returns status: ok');

  // Test 2: Dashboard KPIs and Out of Stock alerts
  const dashboard = await request('GET', '/analytics/dashboard');
  assert(dashboard.status === 200, 'Dashboard analytics responds 200');
  assert(dashboard.data.summary.warehouseCount === 22, `System accurately tracks 22 Warehouses (Actual: ${dashboard.data.summary.warehouseCount})`);
  assert(dashboard.data.summary.branchCount >= 100, `System accurately tracks 100+ Branches (Actual: ${dashboard.data.summary.branchCount})`);
  assert(dashboard.data.summary.outOfStockCount > 0, `GSD & AC Out of Stock Indicator detects depleted items (Actual: ${dashboard.data.summary.outOfStockCount})`);
  assert(dashboard.data.summary.lowStockCount > 0, `Low Stock Par Level Indicator detects low items (Actual: ${dashboard.data.summary.lowStockCount})`);

  // Test 3: Warehouses List
  const whRes = await request('GET', '/warehouses');
  assert(whRes.data.length === 22, 'All 22 Regional Warehouses listed successfully');

  // Test 4: Branches List (100+ branches) & regional filtering
  const brRes = await request('GET', '/branches');
  assert(brRes.data.length >= 100, `Branches list contains 100+ branches (Actual: ${brRes.data.length})`);
  const ncrBranches = await request('GET', '/branches?region=National+Capital+Region');
  assert(ncrBranches.data.length > 0, 'Branches filterable by Region (NCR filtered successfully)');

  // Test 5: Hardware Catalog & Stocks
  const catRes = await request('GET', '/catalog');
  assert(catRes.data.items.length >= 18, 'Hardware catalog populated with CPUs, Monitors, Network items');
  const wh1Res = await request('GET', '/warehouses/1');
  assert(wh1Res.data.stocks.length >= 18, 'Warehouse #1 has stocks initialized across hardware lines');

  // Test 6: Customization of Warehouse Hardware & Par levels
  const customizeRes = await request('POST', '/stock/customize', {
    warehouse_id: 1,
    hardware_id: 1,
    min_threshold: 8,
    max_threshold: 40,
    quantity_on_hand: 25,
    action_type: 'SET_QUANTITY'
  });
  assert(customizeRes.status === 200, 'Warehouse stock par levels & quantities customized successfully');

  // Verify updated par level in warehouse 1
  const wh1After = await request('GET', '/warehouses/1');
  const updatedItem = wh1After.data.stocks.find(s => s.hardware_id === 1);
  assert(updatedItem.quantity_on_hand === 25 && updatedItem.min_threshold === 8, 'Verified customized stock quantity (25) and par threshold (8)');

  // Test 7: IT Hardware Requisition Creation (with recipient and destination branch)
  const newReqRes = await request('POST', '/requests', {
    request_type: 'PERMANENT',
    branch_id: 1, // Branch 001 - Makati Ayala
    warehouse_id: 1,
    requester_name: 'Engr. Ryan Cruz (IT Support)',
    requester_role: 'Field Engineer',
    recipient_name: 'Maria Elena Santos',
    recipient_role: 'Lead Operations Officer',
    recipient_id: 'EMP-MKT-001',
    purpose: 'Quarterly hardware rollout: 2x Workstations and 2x Dell Monitors for teller station',
    items: [
      { hardware_id: 1, quantity: 2 },
      { hardware_id: 5, quantity: 2 }
    ]
  });
  assert(newReqRes.status === 201, `IT Requisition created: ${newReqRes.data.request_no}`);
  const createdReqId = newReqRes.data.id;

  // Verify AC and GSD notifications created
  const acNotifs = await request('GET', '/notifications?role=AC');
  const hasAcAlert = acNotifs.data.some(n => n.title.includes(newReqRes.data.request_no));
  assert(hasAcAlert, 'Area Coordinator (AC) automatically notified of new requisition pending approval');

  // Test 8: Area Manager (AM / AC) Approval Workflow
  const amReviewRes = await request('POST', `/requests/${createdReqId}/am-review`, {
    action: 'APPROVE',
    approver_name: 'Roberto "Bob" Valenzuela (AC-NCR)',
    remarks: 'Approved by Area Manager for Makati Ayala teller expansion'
  });
  assert(amReviewRes.status === 200 && amReviewRes.data.status === 'APPROVED', 'Area Manager successfully approved requisition');

  // Test 9: Warehouse Dispatch (Records Carrier, Tracking, Serial Numbers, Deducts Warehouse Stock)
  const stockBeforeDispatch = updatedItem.quantity_on_hand;
  const dispatchRes = await request('POST', `/requests/${createdReqId}/dispatch`, {
    dispatched_by: 'Eduardo Ramos (Warehouse Lead)',
    carrier_name: 'Company Courier Van #2',
    tracking_no: 'TRK-NCR-88910',
    item_serials: { 1: 'SN-CPU-12400-091, SN-CPU-12400-092' }
  });
  assert(dispatchRes.status === 200 && dispatchRes.data.status === 'IN_TRANSIT', 'Warehouse successfully dispatched hardware with tracking info');

  // Verify warehouse stock decremented by 2
  const wh1AfterDispatch = await request('GET', '/warehouses/1');
  const dispatchedItem = wh1AfterDispatch.data.stocks.find(s => s.hardware_id === 1);
  assert(dispatchedItem.quantity_on_hand === stockBeforeDispatch - 2, `Warehouse stock automatically decremented (From ${stockBeforeDispatch} to ${dispatchedItem.quantity_on_hand})`);

  // Test 10: Branch Delivery Acceptance (Records Exact Arrival Date & Time)
  const exactArrivalTimestamp = '2026-09-17 14:45:00';
  const branchAcceptRes = await request('POST', `/requests/${createdReqId}/branch-accept`, {
    branch_accepted_by: 'Maria Elena Santos',
    branch_arrived_at: exactArrivalTimestamp,
    branch_condition: 'GOOD',
    branch_remarks: 'All 4 units arrived in good condition. Unboxed and tested with IT.'
  });
  assert(branchAcceptRes.status === 200 && branchAcceptRes.data.status === 'ARRIVED_AND_ACCEPTED', 'Branch delivery acceptance successfully recorded');

  // Verify request arrival datetime is stored
  const reqCheck = await request('GET', `/requests?branch_id=1`);
  const acceptedReq = reqCheck.data.find(r => r.id === createdReqId);
  assert(acceptedReq.branch_arrived_at === exactArrivalTimestamp, `Exact delivery arrival date & time verified: ${acceptedReq.branch_arrived_at}`);
  assert(acceptedReq.recipient_name === 'Maria Elena Santos', `Recipient recorded: ${acceptedReq.recipient_name}`);

  // Test 11: Purchasing / GSD Replenishment Flow
  const newRepRes = await request('POST', '/replenishments', {
    warehouse_id: 1,
    gsd_staff_name: 'Carla Mendoza (Purchasing/GSD Lead)',
    supplier_name: 'TechMega Wholesale Solutions',
    estimated_arrival: '2026-09-18',
    items: [
      { hardware_id: 1, quantity: 20 }
    ]
  });
  assert(newRepRes.status === 201, `GSD Replenishment PO created: ${newRepRes.data.po_number}`);
  const createdRepId = newRepRes.data.id;

  // Test 12: Warehouse Replenishment Acceptance & Exact Arrival Timestamp
  const whArrivalTimestamp = '2026-09-17 16:30:00';
  const whAcceptRes = await request('POST', `/replenishments/${createdRepId}/warehouse-accept`, {
    arrived_at: whArrivalTimestamp,
    warehouse_accepted_by: 'Eduardo Ramos (Warehouse Lead)',
    arrival_remarks: 'Shipment received and counted. All 20 CPUs restocked.',
    received_items: [{ item_id: 1, quantity_received: 20 }]
  });
  assert(whAcceptRes.status === 200 && whAcceptRes.data.status === 'ARRIVED_AND_ACCEPTED', 'Warehouse replenishment accepted and arrival timestamp logged');

  // Verify Goods Arrival Report
  const reportRes = await request('GET', `/replenishments/${createdRepId}/report`);
  assert(reportRes.status === 200 && reportRes.data.report.arrived_at === whArrivalTimestamp, 'Replenishment Arrival Report generated with exact arrival datetime');

  // Test 12B: Replenishment with Destination Branch (Full 3-Stage Chain: GSD -> WH -> Branch Confirmation)
  const branchRepRes = await request('POST', '/replenishments', {
    warehouse_id: 1,
    destination_branch_id: 1,
    gsd_staff_name: 'Carla Mendoza (GSD Lead)',
    supplier_name: 'Direct Tech Distribution',
    estimated_arrival: '2026-09-20',
    items: [{ hardware_id: 2, quantity: 15 }]
  });
  assert(branchRepRes.status === 201, `GSD issued replenishment order targeted for Branch #1: ${branchRepRes.data.po_number}`);
  const branchRepId = branchRepRes.data.id;

  // Warehouse accepts goods from supplier
  const whAcceptBranchRep = await request('POST', `/replenishments/${branchRepId}/warehouse-accept`, {
    arrived_at: '2026-09-19 09:15:00',
    warehouse_accepted_by: 'Eduardo Ramos (Central WH Head)',
    arrival_remarks: 'Shipment received and staged for branch delivery.',
    received_items: [{ item_id: branchRepRes.data.id, quantity_received: 15 }]
  });
  assert(
    whAcceptBranchRep.status === 200 && whAcceptBranchRep.data.status === 'ARRIVED_AT_WAREHOUSE',
    'Warehouse accepted replenishment; status moved to ARRIVED_AT_WAREHOUSE (awaiting branch confirmation)'
  );

  // Destination Branch confirms receipt of replenishment stock
  const branchArrivalTimestamp = '2026-09-19 14:30:00';
  const branchConfirmRes = await request('POST', `/replenishments/${branchRepId}/branch-confirm`, {
    branch_received_at: branchArrivalTimestamp,
    branch_confirmed_by: 'Maria Clara Santos (Branch IT Custodian)',
    branch_condition: 'GOOD',
    branch_remarks: 'All 15 units inspected, verified, and placed into active branch inventory.'
  });
  assert(
    branchConfirmRes.status === 200 && branchConfirmRes.data.status === 'BRANCH_CONFIRMED',
    'Destination branch successfully confirmed replenishment receipt; status moved to BRANCH_CONFIRMED'
  );

  // Verify 3-Stage Chain of Custody Report
  const branchReportRes = await request('GET', `/replenishments/${branchRepId}/report`);
  assert(branchReportRes.status === 200, 'Replenishment Report responds 200');
  const repReport = branchReportRes.data.report;
  assert(
    repReport.status === 'BRANCH_CONFIRMED' &&
    repReport.destination_branch_id === 1 &&
    repReport.branch_received_at === branchArrivalTimestamp &&
    repReport.branch_confirmed_by === 'Maria Clara Santos (Branch IT Custodian)',
    'Replenishment Report accurately contains 3-stage chain of custody (Supplier, Warehouse arrival, and Branch confirmation)'
  );

  // Test 13: Stock Movements Audit Ledger
  const movementsRes = await request('GET', '/movements');
  assert(movementsRes.status === 200 && movementsRes.data.length > 0, `Movement audit ledger tracks chronological IN and OUT movements (Count: ${movementsRes.data.length})`);

  // Test 14: User Accounts Directory (Admin View)
  const usersRes = await request('GET', '/users');
  assert(usersRes.status === 200 && usersRes.data.length >= 9, `System tracks user accounts across all roles (Actual: ${usersRes.data.length})`);

  // Test 15: Admin Registers New Staff User
  const testStaffUsername = `engineer_${Date.now().toString().slice(-4)}`;
  const createUserRes = await request('POST', '/users', {
    username: testStaffUsername,
    full_name: 'Engr. Francis Perez',
    email: `${testStaffUsername}@company.com`,
    role: 'IT',
    assigned_warehouse_id: 1,
    assigned_branch_id: null
  });
  assert(createUserRes.status === 201, `Admin registered new user: ${testStaffUsername}`);
  const newUserId = createUserRes.data.id;

  // Test 16: Admin Assigns / Changes Role & Node
  const assignRoleRes = await request('POST', `/users/${newUserId}/assign-role`, {
    role: 'WAREHOUSE',
    assigned_warehouse_id: 6,
    assigned_branch_id: null
  });
  assert(assignRoleRes.status === 200 && assignRoleRes.data.role === 'WAREHOUSE', 'Admin successfully changed user role to WAREHOUSE and assigned WH-NLZ-01');

  // Verify updated role
  const checkUserRes = await request('GET', '/users');
  const targetUser = checkUserRes.data.find(u => u.id === newUserId);
  assert(targetUser.role === 'WAREHOUSE' && targetUser.assigned_warehouse_id === 6, 'Verified role updated to WAREHOUSE and facility bound to WH #6');

  // Test 17: Admin Toggles User Active Status
  const toggleRes = await request('DELETE', `/users/${newUserId}`);
  assert(toggleRes.status === 200, 'Admin successfully toggled user active status');

  // Test 18: Authenticate each stakeholder role with dedicated credentials
  const roleLogins = [
    { username: 'admin', password: 'admin123', expectedRole: 'ADMIN' },
    { username: 'it_alex', password: 'it123', expectedRole: 'IT' },
    { username: 'am_bob', password: 'ac123', expectedRole: 'AC' },
    { username: 'gsd_carla', password: 'gsd123', expectedRole: 'GSD' },
    { username: 'wh_eduardo', password: 'wh123', expectedRole: 'WAREHOUSE' },
    { username: 'branch_maria', password: 'branch123', expectedRole: 'BRANCH' }
  ];

  for (const cred of roleLogins) {
    const authRes = await request('POST', '/auth/login', { username: cred.username, password: cred.password });
    assert(
      authRes.status === 200 && authRes.data.success && authRes.data.user.role === cred.expectedRole,
      `Authentication successful for ${cred.expectedRole} user "${cred.username}"`
    );
  }

  // Test 18B: Authenticate dedicated accounts for ALL 22 Regional Warehouses
  const warehouseAccounts = [
    { username: 'wh_ncr01', whId: 1, code: 'WH-NCR-01' },
    { username: 'wh_ncr02', whId: 2, code: 'WH-NCR-02' },
    { username: 'wh_ncr03', whId: 3, code: 'WH-NCR-03' },
    { username: 'wh_ncr04', whId: 4, code: 'WH-NCR-04' },
    { username: 'wh_ncr05', whId: 5, code: 'WH-NCR-05' },
    { username: 'wh_nlz01', whId: 6, code: 'WH-NLZ-01' },
    { username: 'wh_nlz02', whId: 7, code: 'WH-NLZ-02' },
    { username: 'wh_nlz03', whId: 8, code: 'WH-NLZ-03' },
    { username: 'wh_nlz04', whId: 9, code: 'WH-NLZ-04' },
    { username: 'wh_slz01', whId: 10, code: 'WH-SLZ-01' },
    { username: 'wh_slz02', whId: 11, code: 'WH-SLZ-02' },
    { username: 'wh_slz03', whId: 12, code: 'WH-SLZ-03' },
    { username: 'wh_slz04', whId: 13, code: 'WH-SLZ-04' },
    { username: 'wh_vis01', whId: 14, code: 'WH-VIS-01' },
    { username: 'wh_vis02', whId: 15, code: 'WH-VIS-02' },
    { username: 'wh_vis03', whId: 16, code: 'WH-VIS-03' },
    { username: 'wh_vis04', whId: 17, code: 'WH-VIS-04' },
    { username: 'wh_vis05', whId: 18, code: 'WH-VIS-05' },
    { username: 'wh_min01', whId: 19, code: 'WH-MIN-01' },
    { username: 'wh_min02', whId: 20, code: 'WH-MIN-02' },
    { username: 'wh_min03', whId: 21, code: 'WH-MIN-03' },
    { username: 'wh_min04', whId: 22, code: 'WH-MIN-04' }
  ];

  for (const whAcc of warehouseAccounts) {
    const whLogin = await request('POST', '/auth/login', { username: whAcc.username, password: 'wh123' });
    assert(
      whLogin.status === 200 && whLogin.data.success && whLogin.data.user.role === 'WAREHOUSE' && whLogin.data.user.assigned_warehouse_id === whAcc.whId,
      `Dedicated warehouse account "${whAcc.username}" logged in successfully to ${whAcc.code} (ID: ${whAcc.whId})`
    );
  }

  // Test 18C: Authenticate using numeric warehouse alias (e.g. wh_01, wh_14, wh_22)
  const aliasLogins = [
    { username: 'wh_01', expectedId: 1 },
    { username: 'wh_14', expectedId: 14 },
    { username: 'wh_22', expectedId: 22 }
  ];
  for (const al of aliasLogins) {
    const alRes = await request('POST', '/auth/login', { username: al.username, password: 'wh123' });
    assert(
      alRes.status === 200 && alRes.data.user.assigned_warehouse_id === al.expectedId,
      `Numeric warehouse alias "${al.username}" resolved correctly to warehouse ID ${al.expectedId}`
    );
  }

  // Test 19: Authentication rejects invalid password (401)
  const badPassRes = await request('POST', '/auth/login', { username: 'admin', password: 'wrongpassword' });
  assert(badPassRes.status === 401 && badPassRes.data.error === 'Invalid username or password', 'Auth correctly rejects invalid password with 401');

  // Test 20: Authentication rejects nonexistent user (401)
  const badUserRes = await request('POST', '/auth/login', { username: 'nonexistent_user', password: 'somepassword' });
  assert(badUserRes.status === 401 && badUserRes.data.error === 'Invalid username or password', 'Auth correctly rejects nonexistent user with 401');

  // Test 21: Authentication rejects deactivated user (403)
  const deactRes = await request('POST', '/auth/login', { username: testStaffUsername, password: 'password123' });
  assert(deactRes.status === 403, `Auth correctly blocks deactivated user account (${testStaffUsername}) with 403`);

  console.log('===============================================================');
  console.log('🎉 ALL TEST CASES PASSED: REPLENISHMENT CONFIRMATION & 22 WH ACCOUNTS VERIFIED!');
  console.log('===============================================================');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
