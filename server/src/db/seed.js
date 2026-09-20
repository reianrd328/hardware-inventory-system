const { db, initSchema } = require('./database');

function seedDatabase() {
  initSchema();

  // Check if already seeded
  const warehouseCount = db.prepare('SELECT COUNT(*) as count FROM warehouses').get().count;
  if (warehouseCount > 0) {
    console.log('Database already has data. Skipping initial seeding.');
    return;
  }

  console.log('Starting rich dataset seeding...');

  // 1. Seed Warehouses (22 Warehouses across multiple regions)
  const warehousesData = [
    { code: 'WH-NCR-01', name: 'Central Metro Manila Logistics Hub', region: 'National Capital Region', area: 'NCR-Central', address: 'Bldg 4, FTI Complex, Taguig City, Metro Manila', contact_person: 'Eduardo Ramos', phone: '+63 917 111 0001', email: 'wh.ncr01@company.com' },
    { code: 'WH-NCR-02', name: 'North NCR Distribution Center', region: 'National Capital Region', area: 'NCR-North', address: '18 Mindanao Ave, Project 8, Quezon City', contact_person: 'Arlene Santos', phone: '+63 917 111 0002', email: 'wh.ncr02@company.com' },
    { code: 'WH-NCR-03', name: 'South NCR Logistics Depot', region: 'National Capital Region', area: 'NCR-South', address: 'Filinvest Corporate City, Alabang, Muntinlupa', contact_person: 'Reynaldo Cruz', phone: '+63 917 111 0003', email: 'wh.ncr03@company.com' },
    { code: 'WH-NCR-04', name: 'East NCR Logistics Depot', region: 'National Capital Region', area: 'NCR-East', address: 'Amang Rodriguez Ave, Pasig City', contact_person: 'Marissa Gomez', phone: '+63 917 111 0004', email: 'wh.ncr04@company.com' },
    { code: 'WH-NCR-05', name: 'West NCR Port Logistics Hub', region: 'National Capital Region', area: 'NCR-West', address: 'Manila North Harbor Center, Tondo, Manila', contact_person: 'Ferdinand Reyes', phone: '+63 917 111 0005', email: 'wh.ncr05@company.com' },
    { code: 'WH-NLZ-01', name: 'Northern Luzon Central Hub', region: 'North Luzon', area: 'Pampanga/Central Luzon', address: 'Dolores, City of San Fernando, Pampanga', contact_person: 'Danilo Dizon', phone: '+63 917 111 0006', email: 'wh.nlz01@company.com' },
    { code: 'WH-NLZ-02', name: 'Pangasinan Regional Depot', region: 'North Luzon', area: 'Pangasinan', address: 'Lucao District, Dagupan City, Pangasinan', contact_person: 'Josephine Rivera', phone: '+63 917 111 0007', email: 'wh.nlz02@company.com' },
    { code: 'WH-NLZ-03', name: 'Baguio & CAR Logistics Hub', region: 'North Luzon', area: 'Cordillera', address: 'Loakan Road, Baguio City, Benguet', contact_person: 'Mark Anthony Cariño', phone: '+63 917 111 0008', email: 'wh.nlz03@company.com' },
    { code: 'WH-NLZ-04', name: 'Cagayan Valley Regional Depot', region: 'North Luzon', area: 'Isabela/Cagayan', address: 'Maharlika Highway, Santiago City, Isabela', contact_person: 'Grace Pascual', phone: '+63 917 111 0009', email: 'wh.nlz04@company.com' },
    { code: 'WH-SLZ-01', name: 'Southern Luzon Central Hub', region: 'South Luzon', area: 'Laguna Technopark', address: 'Carmelray Industrial Park II, Calamba, Laguna', contact_person: 'Rommel Mercado', phone: '+63 917 111 0010', email: 'wh.slz01@company.com' },
    { code: 'WH-SLZ-02', name: 'Cavite Industrial Depot', region: 'South Luzon', area: 'Cavite', address: 'Governor\'s Drive, Dasmariñas City, Cavite', contact_person: 'Lorna Del Rosario', phone: '+63 917 111 0011', email: 'wh.slz02@company.com' },
    { code: 'WH-SLZ-03', name: 'Batangas Port Logistics Hub', region: 'South Luzon', area: 'Batangas', address: 'Sta. Clara, Batangas City Port Area', contact_person: 'Nelson Gutierrez', phone: '+63 917 111 0012', email: 'wh.slz03@company.com' },
    { code: 'WH-SLZ-04', name: 'Bicol Regional Logistics Depot', region: 'South Luzon', area: 'Bicol', address: 'Concepcion Grande, Naga City, Camarines Sur', contact_person: 'Cynthia Alcantara', phone: '+63 917 111 0013', email: 'wh.slz04@company.com' },
    { code: 'WH-VIS-01', name: 'Central Visayas Main Hub', region: 'Visayas', area: 'Cebu Metro', address: 'A.C. Cortes Ave, Mandaue City, Cebu', contact_person: 'Vicente Tan', phone: '+63 917 111 0014', email: 'wh.vis01@company.com' },
    { code: 'WH-VIS-02', name: 'Cebu South Logistics Depot', region: 'Visayas', area: 'Cebu South', address: 'Lawaan, Talisay City, Cebu', contact_person: 'Rosanna Yap', phone: '+63 917 111 0015', email: 'wh.vis02@company.com' },
    { code: 'WH-VIS-03', name: 'Western Visayas Logistics Hub', region: 'Visayas', area: 'Panay/Iloilo', address: 'Mandurriao, Iloilo City, Iloilo', contact_person: 'Ernesto Guanzon', phone: '+63 917 111 0016', email: 'wh.vis03@company.com' },
    { code: 'WH-VIS-04', name: 'Negros Regional Depot', region: 'Visayas', area: 'Negros Occidental', address: 'Lacson St, Bacolod City, Negros Occidental', contact_person: 'Beatriz Montinola', phone: '+63 917 111 0017', email: 'wh.vis04@company.com' },
    { code: 'WH-VIS-05', name: 'Eastern Visayas Logistics Depot', region: 'Visayas', area: 'Leyte/Samar', address: 'Real St, Tacloban City, Leyte', contact_person: 'Ronaldo Veloso', phone: '+63 917 111 0018', email: 'wh.vis05@company.com' },
    { code: 'WH-MIN-01', name: 'Southern Mindanao Central Hub', region: 'Mindanao', area: 'Davao Metro', address: 'Km 12, Sasa Wharf Road, Davao City', contact_person: 'Alberto Dimaculangan', phone: '+63 917 111 0019', email: 'wh.min01@company.com' },
    { code: 'WH-MIN-02', name: 'Northern Mindanao Logistics Depot', region: 'Mindanao', area: 'Cagayan de Oro', address: 'Tablon, Cagayan de Oro City, Misamis Oriental', contact_person: 'Maria Fe Ocampo', phone: '+63 917 111 0020', email: 'wh.min02@company.com' },
    { code: 'WH-MIN-03', name: 'SOCCSKSARGEN Regional Depot', region: 'Mindanao', area: 'General Santos', address: 'Makar Wharf, General Santos City, South Cotabato', contact_person: 'Jerome Pacquing', phone: '+63 917 111 0021', email: 'wh.min03@company.com' },
    { code: 'WH-MIN-04', name: 'Zamboanga Peninsula Depot', region: 'Mindanao', area: 'Zamboanga', address: 'Governor Camins Ave, Zamboanga City', contact_person: 'Fatima Alih', phone: '+63 917 111 0022', email: 'wh.min04@company.com' }
  ];

  const insertWh = db.prepare(`
    INSERT INTO warehouses (code, name, region, area, address, contact_person, phone, email)
    VALUES (@code, @name, @region, @area, @address, @contact_person, @phone, @email)
  `);

  const insertManyWh = db.transaction((list) => {
    for (const item of list) insertWh.run(item);
  });
  insertManyWh(warehousesData);
  console.log(`Seeded ${warehousesData.length} warehouses.`);

  // 2. Seed Hardware Categories
  const categories = [
    { name: 'CPU & Workstations', description: 'Desktop computers, micro-PCs, towers, POS controller units', icon: 'Cpu' },
    { name: 'Monitors & Displays', description: 'FHD & QHD commercial LED displays, teller monitors', icon: 'Monitor' },
    { name: 'Memory & Storage', description: 'RAM DIMM modules, SSD NVMe/SATA internal drives', icon: 'HardDrive' },
    { name: 'Networking Hardware', description: 'Gigabit switches, VPN routers, access points, PoE hubs', icon: 'Network' },
    { name: 'Printers & POS Peripherals', description: 'Thermal receipt printers, network laser printers, barcode readers', icon: 'Printer' },
    { name: 'Power & Protection', description: 'Uninterruptible power supplies, voltage regulators', icon: 'Zap' },
    { name: 'Input & Accessories', description: 'Keyboards, mice, webcams, headsets, smart card readers', icon: 'Keyboard' }
  ];

  const insertCat = db.prepare(`INSERT INTO hardware_categories (name, description, icon) VALUES (?, ?, ?)`);
  for (const cat of categories) {
    insertCat.run(cat.name, cat.description, cat.icon);
  }

  // 3. Seed Hardware Catalog
  const catalogItems = [
    // CPUs
    { category_id: 1, sku: 'CPU-I5-12400-01', name: 'Intel Core i5-12400 Workstation Tower', brand: 'HP ProDesk', model: '400 G9 Microtower', specifications: 'Core i5-12400, 16GB DDR4, 512GB NVMe SSD, Win11 Pro, Gigabit LAN', unit: 'Unit', default_min_threshold: 6 },
    { category_id: 1, sku: 'CPU-I7-13700-02', name: 'Intel Core i7-13700 Performance Desktop', brand: 'Dell OptiPlex', model: '7010 Tower Plus', specifications: 'Core i7-13700, 32GB DDR5, 1TB NVMe Gen4 SSD, Intel UHD 770, Win11 Pro', unit: 'Unit', default_min_threshold: 4 },
    { category_id: 1, sku: 'CPU-R5-5600G-03', name: 'AMD Ryzen 5 5600G Compact Terminal', brand: 'Lenovo ThinkCentre', model: 'M75q Tiny Gen 2', specifications: 'Ryzen 5 PRO 5600G, 16GB DDR4, 256GB SSD, Ultra-Compact 1L Form Factor', unit: 'Unit', default_min_threshold: 8 },
    { category_id: 1, sku: 'CPU-I3-12100-04', name: 'Intel Core i3-12100 Standard Teller PC', brand: 'Acer Veriton', model: 'VN4690GT SFF', specifications: 'Core i3-12100, 8GB DDR4, 256GB NVMe SSD, 180W 80-Plus PSU', unit: 'Unit', default_min_threshold: 10 },
    // Monitors
    { category_id: 2, sku: 'MON-DELL-24-IPS', name: 'Dell 24" P2422H IPS FHD Business Monitor', brand: 'Dell', model: 'P2422H', specifications: '23.8" IPS 1920x1080 @ 60Hz, DP/HDMI/VGA, Height/Pivot Adjustable, ComfortView Plus', unit: 'Unit', default_min_threshold: 10 },
    { category_id: 2, sku: 'MON-HP-21-FHD', name: 'HP 21.5" V22v G5 FHD Teller Counter Display', brand: 'HP', model: 'V22v G5', specifications: '21.5" VA 1920x1080 @ 75Hz, HDMI 1.4, VGA, 75x75 VESA Mountable', unit: 'Unit', default_min_threshold: 12 },
    { category_id: 2, sku: 'MON-LG-27-IPS', name: 'LG 27" 27QN600-B QHD IPS Executive Monitor', brand: 'LG', model: '27QN600-B', specifications: '27" IPS 2560x1440 QHD, HDR10, Dual HDMI, DP, AMD FreeSync', unit: 'Unit', default_min_threshold: 3 },
    // Memory & Storage
    { category_id: 3, sku: 'RAM-DDR4-16G-32', name: 'Kingston 16GB DDR4 3200MHz Desktop RAM', brand: 'Kingston', model: 'KVR32N22S8/16', specifications: '16GB DDR4 PC4-25600 3200MT/s Non-ECC CL22 288-Pin UDIMM', unit: 'Piece', default_min_threshold: 15 },
    { category_id: 3, sku: 'SSD-512G-NVME-M2', name: 'Samsung PM9B1 512GB PCIe 4.0 NVMe SSD', brand: 'Samsung', model: 'PM9B1 M.2 2280', specifications: '512GB M.2 2280 NVMe PCIe Gen 4x4, Up to 3,500 MB/s Read', unit: 'Piece', default_min_threshold: 12 },
    { category_id: 3, sku: 'SSD-1TB-SATA3-25', name: 'Crucial MX500 1TB 2.5" SATA III Internal SSD', brand: 'Crucial', model: 'CT1000MX500SSD1', specifications: '1TB 2.5-Inch SATA 6Gb/s SSD, 3D NAND, 560MB/s Read / 510MB/s Write', unit: 'Piece', default_min_threshold: 8 },
    // Networking
    { category_id: 4, sku: 'NET-SW-CISCO-24P', name: 'Cisco CBS250-24T-4G 24-Port Gigabit Switch', brand: 'Cisco', model: 'CBS250-24T-4G', specifications: '24x 10/100/1000 Ports, 4x Gigabit SFP Uplinks, Layer 2+ Smart Managed', unit: 'Unit', default_min_threshold: 4 },
    { category_id: 4, sku: 'NET-RT-CISCO-RV', name: 'Cisco RV340 Dual WAN Gigabit VPN Router', brand: 'Cisco', model: 'RV340-K9-NA', specifications: 'Dual Gigabit Ethernet WAN, 4 Gigabit LAN ports, Hardware VPN acceleration', unit: 'Unit', default_min_threshold: 3 },
    // Printers & Peripherals
    { category_id: 5, sku: 'PRN-EPSON-TM82X', name: 'Epson TM-T82X Thermal Receipt Printer', brand: 'Epson', model: 'TM-T82X (USB+Serial)', specifications: '200mm/s print speed, 80mm roll, auto-cutter 1.5M cuts, Drop-in paper load', unit: 'Unit', default_min_threshold: 6 },
    { category_id: 5, sku: 'PRN-HP-M404DN', name: 'HP LaserJet Pro M404dn Network Laser Printer', brand: 'HP', model: 'M404dn (W1A53A)', specifications: 'Duplex Mono Laser, up to 40 ppm, Gigabit Ethernet, 250-sheet tray', unit: 'Unit', default_min_threshold: 4 },
    { category_id: 5, sku: 'BC-HONEYWELL-1250', name: 'Honeywell Voyager 1250g Handheld Laser Barcode Scanner', brand: 'Honeywell', model: 'Voyager 1250g', specifications: 'Single-line laser, 1D linear barcode scanner with USB stand and cable', unit: 'Unit', default_min_threshold: 8 },
    { category_id: 5, sku: 'BC-ZEBRA-DS2208', name: 'Zebra DS2208 2D Imager QR/Barcode Scanner', brand: 'Zebra', model: 'DS2208-SR7U2100AZW', specifications: '1D/2D QR code imager scanner, corded USB, auto-stand, omnidirectional', unit: 'Unit', default_min_threshold: 8 },
    // Power
    { category_id: 6, sku: 'UPS-APC-1500VA', name: 'APC Back-UPS Pro 1500VA LCD Battery Backup', brand: 'APC by Schneider', model: 'BR1500GI', specifications: '1500VA / 865 Watts, AVR, LCD Interface, 6 Battery + 2 Surge IEC outlets', unit: 'Unit', default_min_threshold: 5 },
    { category_id: 6, sku: 'UPS-APC-650VA', name: 'APC Easy UPS BVX 650VA 230V AVR Desktop Unit', brand: 'APC by Schneider', model: 'BVX650I-PH', specifications: '650VA / 360 Watts, 4 Universal Sockets, LED status, compact tower', unit: 'Unit', default_min_threshold: 10 }
  ];

  const insertCatItem = db.prepare(`
    INSERT INTO hardware_catalog (category_id, sku, name, brand, model, specifications, unit, default_min_threshold)
    VALUES (@category_id, @sku, @name, @brand, @model, @specifications, @unit, @default_min_threshold)
  `);

  const insertManyItems = db.transaction((items) => {
    for (const item of items) insertCatItem.run(item);
  });
  insertManyItems(catalogItems);
  console.log(`Seeded ${catalogItems.length} hardware catalog items.`);

  // 4. Seed Branches (> 100 branches, e.g., 105 branches)
  const regionsAndAreas = [
    {
      region: 'National Capital Region',
      areaManager: 'Roberto "Bob" Valenzuela (AC-NCR)',
      whId: 1, // Central Hub
      areas: [
        { area: 'NCR - Makati Business District', cities: ['Makati Ayala', 'Makati Legaspi', 'Makati Salcedo', 'Makati Buendia', 'Makati Poblacion', 'Makati Chino Roces', 'Makati Rockwell'] },
        { area: 'NCR - Taguig / BGC', cities: ['BGC High Street', 'BGC Market Market', 'BGC Uptown', 'Taguig FTI', 'Taguig Bayani Road'] },
        { area: 'NCR - Quezon City North & Central', cities: ['QC Diliman', 'QC Cubao Araneta', 'QC Tomas Morato', 'QC North EDSA', 'QC Fairview', 'QC Katipunan', 'QC Novaliches', 'QC Banawe', 'QC East Avenue'] },
        { area: 'NCR - Ortigas / Pasig / Mandaluyong', cities: ['Ortigas ADB Ave', 'Ortigas Emerald', 'Pasig Capitol Commons', 'Pasig Kapitolyo', 'Mandaluyong Shaw', 'Mandaluyong Pioneer'] },
        { area: 'NCR - Manila & Pasay', cities: ['Manila Ermita', 'Manila Binondo', 'Manila Intramuros', 'Manila Malate', 'Manila Sampaloc', 'Pasay Roxas Blvd', 'Pasay MOA Complex'] },
        { area: 'NCR - South (Alabang/Parañaque)', cities: ['Alabang Filinvest', 'Alabang Town Center', 'Parañaque Sucat', 'Parañaque BF Homes', 'Las Piñas Zapote'] }
      ]
    },
    {
      region: 'North Luzon',
      areaManager: 'Ma. Elena Bautista (AC-NorthLuzon)',
      whId: 6, // Pampanga Hub
      areas: [
        { area: 'Central Luzon - Pampanga & Bulacan', cities: ['San Fernando Dolores', 'Angeles City Balibago', 'Clark Freeport Zone', 'Malolos Bulacan', 'Meycauayan', 'San Jose Del Monte'] },
        { area: 'Pangasinan & Tarlac', cities: ['Dagupan Perez', 'Urdaneta City', 'San Carlos Pangasinan', 'Tarlac City F. Tanedo', 'Capas Tarlac'] },
        { area: 'Cordillera Administrative Region', cities: ['Baguio Session Road', 'Baguio Camp John Hay', 'La Trinidad Benguet'] },
        { area: 'Ilocos Region', cities: ['San Fernando La Union', 'Vigan Heritage Center', 'Laoag Rizal St'] },
        { area: 'Cagayan Valley', cities: ['Santiago City Maharlika', 'Tuguegarao Balzain', 'Cauayan Isabela'] }
      ]
    },
    {
      region: 'South Luzon',
      areaManager: 'Engr. Dennis Villamor (AC-SouthLuzon)',
      whId: 10, // Laguna Hub
      areas: [
        { area: 'Laguna Growth Corridor', cities: ['Calamba Real', 'Santa Rosa Balibago', 'Biñan Pavillion', 'San Pedro Laguna', 'Los Baños Junction', 'San Pablo City'] },
        { area: 'Cavite Industrial Belt', cities: ['Dasmariñas Aguinaldo', 'Imus Nueno Ave', 'Bacoor Molino', 'General Trias FCIE', 'Tagaytay Rotonda'] },
        { area: 'Batangas & Quezon', cities: ['Batangas City Pallocan', 'Lipa City Ayala', 'Tanauan City', 'Lucena City Quezon Ave'] },
        { area: 'Bicol Region', cities: ['Naga Magsaysay Ave', 'Legazpi City Peñaranda', 'Daet Camarines Norte', 'Sorsogon City Magsaysay'] }
      ]
    },
    {
      region: 'Visayas',
      areaManager: 'Clarissa Marie Tan (AC-Visayas)',
      whId: 14, // Cebu Hub
      areas: [
        { area: 'Cebu Metropolitan Area', cities: ['Cebu IT Park', 'Cebu Business Park Ayala', 'Cebu Colon Downtown', 'Cebu Banilad', 'Mandaue Reclamation', 'Lapu-Lapu Mactan', 'Talisay South'] },
        { area: 'Western Visayas (Panay)', cities: ['Iloilo City Festive Walk', 'Iloilo Calle Real', 'Roxas City Capiz', 'Kalibo Aklan'] },
        { area: 'Negros Island', cities: ['Bacolod Lacson', 'Bacolod Mandalagan', 'Dumaguete Rizal Blvd'] },
        { area: 'Eastern Visayas', cities: ['Tacloban Rizal Ave', 'Ormoc Real St', 'Catbalogan Samar'] }
      ]
    },
    {
      region: 'Mindanao',
      areaManager: 'Datu Farouk Salik (AC-Mindanao)',
      whId: 19, // Davao Hub
      areas: [
        { area: 'Davao Metropolitan Area', cities: ['Davao Bajada JP Laurel', 'Davao Bolton San Pedro', 'Davao Matina Crossing', 'Davao Lanang', 'Davao Toril', 'Tagum City Pioneer'] },
        { area: 'Northern Mindanao', cities: ['Cagayan de Oro Divisoria', 'Cagayan de Oro Lapasan', 'Iligan City Roxas', 'Malaybalay Bukidnon'] },
        { area: 'SOCCSKSARGEN', cities: ['General Santos Pioneer', 'General Santos Santiago', 'Koronadal City', 'Cotabato City Sinsuat'] },
        { area: 'Zamboanga & Caraga', cities: ['Zamboanga Mayor Vitaliano', 'Butuan City Montilla', 'Surigao City Borromeo'] }
      ]
    }
  ];

  let branchCounter = 1;
  const branchesList = [];

  for (const regGroup of regionsAndAreas) {
    for (const areaItem of regGroup.areas) {
      for (const city of areaItem.cities) {
        const branchCode = `BR-${String(branchCounter).padStart(3, '0')}`;
        branchesList.push({
          code: branchCode,
          name: `Branch ${String(branchCounter).padStart(3, '0')} - ${city}`,
          region: regGroup.region,
          area: areaItem.area,
          assigned_warehouse_id: regGroup.whId,
          area_manager_name: regGroup.areaManager,
          contact_person: `Officer ${branchCode} (${city.split(' ')[0]})`,
          phone: `+63 920 500 ${String(branchCounter).padStart(4, '0')}`,
          email: `${branchCode.toLowerCase()}@branch.company.com`,
          address: `G/F Commercial Plaza, ${city}, ${regGroup.region}`
        });
        branchCounter++;
      }
    }
  }

  const insertBranch = db.prepare(`
    INSERT INTO branches (code, name, region, area, assigned_warehouse_id, area_manager_name, contact_person, phone, email, address)
    VALUES (@code, @name, @region, @area, @assigned_warehouse_id, @area_manager_name, @contact_person, @phone, @email, @address)
  `);

  const insertManyBranches = db.transaction((list) => {
    for (const b of list) insertBranch.run(b);
  });
  insertManyBranches(branchesList);
  console.log(`Seeded ${branchesList.length} branches across 5 regional clusters.`);

  // 5. Seed Warehouse Stocks (stocks for each warehouse with varied levels, intentional low-stock and out-of-stock items)
  const allWarehouses = db.prepare('SELECT id, code FROM warehouses').all();
  const allHardware = db.prepare('SELECT id, default_min_threshold FROM hardware_catalog').all();

  const insertStock = db.prepare(`
    INSERT INTO warehouse_stocks (warehouse_id, hardware_id, quantity_on_hand, quantity_reserved, min_threshold, max_threshold, last_restocked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const stockMovements = [];
  const notifications = [];

  const seedStocksTx = db.transaction(() => {
    for (const wh of allWarehouses) {
      for (const hw of allHardware) {
        const minThresh = hw.default_min_threshold;
        const maxThresh = minThresh * 5;
        let qtyOnHand;
        let reserved = 0;

        // Create realistic distribution of stock:
        // Some items out of stock (qty = 0)
        // Some items low stock (qty <= minThresh)
        // Rest healthy (qty > minThresh)
        const rand = (wh.id * 7 + hw.id * 13) % 100;
        if (rand < 12) {
          // Out of stock
          qtyOnHand = 0;
          if (wh.id <= 5) {
            notifications.push({
              recipient_role: 'GSD',
              type: 'OUT_OF_STOCK',
              title: `URGENT: Out of Stock Alert at ${wh.code}`,
              message: `Hardware Item ID #${hw.id} has reached 0 units at ${wh.code}. Immediate replenishment required by Purchasing/GSD.`
            });
            notifications.push({
              recipient_role: 'AC',
              type: 'OUT_OF_STOCK',
              title: `Stock Depleted: ${wh.code}`,
              message: `Warehouse ${wh.code} is completely out of Item #${hw.id}. Requisitions will be delayed.`
            });
          }
        } else if (rand < 28) {
          // Low stock
          qtyOnHand = Math.max(1, Math.floor(minThresh * 0.6));
          if (wh.id <= 3) {
            notifications.push({
              recipient_role: 'GSD',
              type: 'LOW_STOCK',
              title: `Low Stock Warning at ${wh.code}`,
              message: `Stock level for Item #${hw.id} (${qtyOnHand} units) is below the minimum threshold (${minThresh} units).`
            });
          }
        } else {
          // Healthy stock
          qtyOnHand = Math.floor(minThresh * 1.5) + ((wh.id + hw.id) % 15);
        }

        insertStock.run(wh.id, hw.id, qtyOnHand, reserved, minThresh, maxThresh, '2026-09-01 08:30:00');
      }
    }
  });
  seedStocksTx();
  console.log(`Seeded warehouse stocks for ${allWarehouses.length} warehouses x ${allHardware.length} items.`);

  // 6. Seed Sample Requisitions in different stages:
  // Case A: PENDING_AM_APPROVAL (IT created, waiting for Area Manager)
  const insertReq = db.prepare(`
    INSERT INTO hardware_requests (
      request_no, request_type, branch_id, warehouse_id, requester_name, requester_role,
      recipient_name, recipient_role, recipient_id, purpose, status, am_approval_status,
      created_at
    ) VALUES (
      'REQ-2026-001', 'PERMANENT', 1, 1, 'Mark David (IT Field Specialist)', 'IT Engineer',
      'Maria Corazon Santos', 'Branch Head / Custodian', 'EMP-NCR-1082', 'Urgent replacement for defective teller counter CPU and monitor after power surge',
      'PENDING_AM_APPROVAL', 'PENDING', '2026-09-17 09:15:00'
    )
  `);
  const req1Id = insertReq.run().lastInsertRowid;
  db.prepare('INSERT INTO request_items (request_id, hardware_id, quantity) VALUES (?, ?, ?)').run(req1Id, 1, 2); // 2x Core i5
  db.prepare('INSERT INTO request_items (request_id, hardware_id, quantity) VALUES (?, ?, ?)').run(req1Id, 5, 2); // 2x Dell 24" Monitors

  notifications.push({
    recipient_role: 'AC',
    type: 'APPROVAL_NEEDED',
    title: 'New Hardware Requisition Pending Approval: REQ-2026-001',
    message: 'IT Specialist Mark David requested 2x CPUs and 2x Monitors for Branch 001 - Makati Ayala. Recipient: Maria Corazon Santos.'
  });
  notifications.push({
    recipient_role: 'GSD',
    type: 'REQUEST_CREATED',
    title: 'Branch Hardware Requisition Filed: REQ-2026-001',
    message: 'Branch 001 filed request for 4 hardware units from Central Metro Manila Hub.'
  });

  // Case B: APPROVED by AM, ready for warehouse dispatch
  const req2Id = db.prepare(`
    INSERT INTO hardware_requests (
      request_no, request_type, branch_id, warehouse_id, requester_name, requester_role,
      recipient_name, recipient_role, recipient_id, purpose, status, am_approval_status,
      am_approved_at, am_approver_name, am_remarks, created_at
    ) VALUES (
      'REQ-2026-002', 'BORROW', 12, 1, 'Kevin Tan (IT Systems Admin)', 'IT Engineer',
      'Rafael Mendoza', 'BGC Marketing Roadshow Lead', 'EMP-MKT-4412', 'Temporary borrow: 3-day account opening promotional roadshow at BGC High Street Mall',
      'APPROVED', 'APPROVED', '2026-09-17 10:45:00', 'Roberto "Bob" Valenzuela (AC-NCR)', 'Approved for 5 business days temporary borrow. Please handle equipment with care.',
      '2026-09-17 08:30:00'
    )
  `).run().lastInsertRowid;
  db.prepare('INSERT INTO request_items (request_id, hardware_id, quantity) VALUES (?, ?, ?)').run(req2Id, 3, 3); // 3x Lenovo Tiny PC
  db.prepare('INSERT INTO request_items (request_id, hardware_id, quantity) VALUES (?, ?, ?)').run(req2Id, 15, 3); // 3x Barcode Scanners

  // Case C: IN_TRANSIT (Dispatched by Warehouse, on the way to Branch)
  const req3Id = db.prepare(`
    INSERT INTO hardware_requests (
      request_no, request_type, branch_id, warehouse_id, requester_name, requester_role,
      recipient_name, recipient_role, recipient_id, purpose, status, am_approval_status,
      am_approved_at, am_approver_name, am_remarks, dispatched_at, dispatched_by, carrier_name, tracking_no,
      created_at
    ) VALUES (
      'REQ-2026-003', 'PERMANENT', 45, 14, 'Gary Alcantara (Regional IT Tech)', 'IT Engineer',
      'Michelle Lim', 'Head Teller / Branch Operations', 'EMP-VIS-7721', 'New account counter expansion at Cebu IT Park branch',
      'IN_TRANSIT', 'APPROVED', '2026-09-16 14:00:00', 'Clarissa Marie Tan (AC-Visayas)', 'Approved based on Q3 branch expansion plan.',
      '2026-09-17 08:00:00', 'Vicente Tan (Warehouse Supv)', 'LBC Express Logistics', 'TRK-LBC-9921045',
      '2026-09-16 11:30:00'
    )
  `).run().lastInsertRowid;
  db.prepare('INSERT INTO request_items (request_id, hardware_id, quantity, serial_numbers) VALUES (?, ?, ?, ?)').run(req3Id, 1, 1, 'SN-HP-G9-88192');
  db.prepare('INSERT INTO request_items (request_id, hardware_id, quantity, serial_numbers) VALUES (?, ?, ?, ?)').run(req3Id, 5, 1, 'SN-DELL-P24-33102');
  db.prepare('INSERT INTO request_items (request_id, hardware_id, quantity, serial_numbers) VALUES (?, ?, ?, ?)').run(req3Id, 13, 1, 'SN-EPSON-T82-5512');

  // Record outgoing stock movement
  db.prepare(`
    INSERT INTO stock_movements (movement_type, warehouse_id, branch_id, hardware_id, quantity, balance_after, reference_type, reference_id, recipient_name, performed_by, notes, created_at)
    VALUES ('OUT_DISPATCH', 14, 45, 1, 1, 12, 'REQUEST', 'REQ-2026-003', 'Michelle Lim', 'Vicente Tan (Warehouse Supv)', 'Dispatched via LBC Express TRK-LBC-9921045', '2026-09-17 08:00:00')
  `).run();

  // Case D: ARRIVED_AND_ACCEPTED (Delivered to Branch and accepted with arrival date/time)
  const req4Id = db.prepare(`
    INSERT INTO hardware_requests (
      request_no, request_type, branch_id, warehouse_id, requester_name, requester_role,
      recipient_name, recipient_role, recipient_id, purpose, status, am_approval_status,
      am_approved_at, am_approver_name, am_remarks, dispatched_at, dispatched_by, carrier_name, tracking_no,
      branch_arrived_at, branch_accepted_by, branch_condition, branch_remarks,
      created_at
    ) VALUES (
      'REQ-2026-004', 'PERMANENT', 2, 1, 'Mark David (IT Field Specialist)', 'IT Engineer',
      'Jasmine Soriano', 'Lead Admin Officer', 'EMP-NCR-2041', 'Replacement for defective network switch and UPS',
      'ARRIVED_AND_ACCEPTED', 'APPROVED', '2026-09-15 10:00:00', 'Roberto "Bob" Valenzuela (AC-NCR)', 'Approved for immediate replacement.',
      '2026-09-15 15:30:00', 'Eduardo Ramos (WH Mgr)', 'Company Logistics Van #3', 'VAN-03-TRIP-14',
      '2026-09-16 09:42:00', 'Jasmine Soriano', 'GOOD', 'Delivered in good condition and tested with IT specialist. Fully operational.',
      '2026-09-15 09:00:00'
    )
  `).run().lastInsertRowid;
  db.prepare('INSERT INTO request_items (request_id, hardware_id, quantity, serial_numbers) VALUES (?, ?, ?, ?)').run(req4Id, 11, 1, 'SN-CISCO-CBS-00412');
  db.prepare('INSERT INTO request_items (request_id, hardware_id, quantity, serial_numbers) VALUES (?, ?, ?, ?)').run(req4Id, 17, 1, 'SN-APC-BR15-99411');

  // 7. Seed Replenishments from Purchasing/GSD
  // Case A: IN_TRANSIT from GSD to Warehouse (waiting for warehouse acceptance)
  const rep1Id = db.prepare(`
    INSERT INTO replenishments (
      po_number, warehouse_id, gsd_staff_name, supplier_name, status, estimated_arrival, shipped_at, created_at
    ) VALUES (
      'PO-GSD-2026-0081', 1, 'Carla Mendoza (Purchasing/GSD Lead)', 'Direct Tech Distribution Philippines Inc.',
      'IN_TRANSIT', '2026-09-18', '2026-09-17 07:30:00', '2026-09-16 16:00:00'
    )
  `).run().lastInsertRowid;
  db.prepare('INSERT INTO replenishment_items (replenishment_id, hardware_id, quantity_ordered, quantity_received) VALUES (?, ?, ?, ?)').run(rep1Id, 1, 15, 0); // 15x Core i5
  db.prepare('INSERT INTO replenishment_items (replenishment_id, hardware_id, quantity_ordered, quantity_received) VALUES (?, ?, ?, ?)').run(rep1Id, 5, 20, 0); // 20x Dell Monitors
  db.prepare('INSERT INTO replenishment_items (replenishment_id, hardware_id, quantity_ordered, quantity_received) VALUES (?, ?, ?, ?)').run(rep1Id, 13, 10, 0); // 10x Receipt Printers

  notifications.push({
    recipient_role: 'WAREHOUSE',
    type: 'REPLENISHMENT_SHIPPED',
    title: 'Incoming Stock Replenishment: PO-GSD-2026-0081',
    message: 'Purchasing/GSD dispatched 45 hardware units to Central Metro Manila Hub. Expected arrival: 2026-09-18.'
  });

  // Case B: ARRIVED_AND_ACCEPTED (Replenished, accepted at warehouse with arrival date/time & report)
  const rep2Id = db.prepare(`
    INSERT INTO replenishments (
      po_number, warehouse_id, gsd_staff_name, supplier_name, status, estimated_arrival, shipped_at,
      arrived_at, warehouse_accepted_by, arrival_remarks, created_at
    ) VALUES (
      'PO-GSD-2026-0075', 6, 'Arnold Beltran (Purchasing Specialist)', 'Pacific Office Tech Solutions',
      'ARRIVED_AND_ACCEPTED', '2026-09-15', '2026-09-14 11:00:00',
      '2026-09-15 14:25:00', 'Danilo Dizon (Warehouse Head)', 'Complete shipment verified, all seal tapes intact. Quantities match delivery receipt DR#99201.',
      '2026-09-14 09:30:00'
    )
  `).run().lastInsertRowid;
  db.prepare('INSERT INTO replenishment_items (replenishment_id, hardware_id, quantity_ordered, quantity_received) VALUES (?, ?, ?, ?)').run(rep2Id, 5, 25, 25);
  db.prepare('INSERT INTO replenishment_items (replenishment_id, hardware_id, quantity_ordered, quantity_received) VALUES (?, ?, ?, ?)').run(rep2Id, 15, 15, 15);

  // Incoming stock movement record
  db.prepare(`
    INSERT INTO stock_movements (movement_type, warehouse_id, hardware_id, quantity, balance_after, reference_type, reference_id, performed_by, notes, created_at)
    VALUES ('IN_REPLENISHMENT', 6, 5, 25, 28, 'REPLENISHMENT', 'PO-GSD-2026-0075', 'Danilo Dizon (Warehouse Head)', 'Replenished from Pacific Office Tech DR#99201', '2026-09-15 14:25:00')
  `).run();

  // 8. Insert initial notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (recipient_role, type, title, message)
    VALUES (@recipient_role, @type, @title, @message)
  `);
  for (const n of notifications) {
    insertNotif.run(n);
  }

  // 9. Seed Standard Users for All Roles & Every Warehouse Account
  const initialUsers = [
    { username: 'admin', password: 'admin123', full_name: 'System Administrator', email: 'admin@company.com', role: 'ADMIN', assigned_warehouse_id: null, assigned_branch_id: null },
    { username: 'it_alex', password: 'it123', full_name: 'Alex Reyes (Senior IT Field Specialist)', email: 'alex.reyes@company.com', role: 'IT', assigned_warehouse_id: 1, assigned_branch_id: null },
    { username: 'am_bob', password: 'ac123', full_name: 'Roberto "Bob" Valenzuela (AC-NCR)', email: 'bob.valenzuela@company.com', role: 'AC', assigned_warehouse_id: 1, assigned_branch_id: null },
    { username: 'am_bautista', password: 'ac123', full_name: 'Ma. Elena Bautista (AC-NorthLuzon)', email: 'elena.bautista@company.com', role: 'AC', assigned_warehouse_id: 6, assigned_branch_id: null },
    { username: 'gsd_carla', password: 'gsd123', full_name: 'Carla Mendoza (Purchasing/GSD Lead)', email: 'carla.gsd@company.com', role: 'GSD', assigned_warehouse_id: null, assigned_branch_id: null },
    { username: 'branch_maria', password: 'branch123', full_name: 'Maria Corazon Santos (Branch 001 Head)', email: 'maria.santos@branch.company.com', role: 'BRANCH', assigned_warehouse_id: null, assigned_branch_id: 1 },
    { username: 'branch_michelle', password: 'branch123', full_name: 'Michelle Lim (Branch 045 Head)', email: 'michelle.lim@branch.company.com', role: 'BRANCH', assigned_warehouse_id: null, assigned_branch_id: 45 }
  ];

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, password, full_name, email, role, assigned_warehouse_id, assigned_branch_id, is_active)
    VALUES (@username, @password, @full_name, @email, @role, @assigned_warehouse_id, @assigned_branch_id, 1)
  `);

  for (const u of initialUsers) {
    insertUser.run(u);
  }

  // Ensure all 22 regional warehouses have their dedicated custodian user account
  const warehouseEntities = db.prepare('SELECT id, code, name, contact_person FROM warehouses ORDER BY id ASC').all();
  for (const wh of warehouseEntities) {
    const codeSlug = wh.code.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^wh/, ''); // e.g. ncr01, nlz01
    const username = `wh_${codeSlug}`; // e.g. wh_ncr01
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

  // Also retain wh_eduardo and wh_vicente for backwards compatibility
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

  console.log(`Seeded user accounts for all ${warehouseEntities.length} regional warehouses.`);

  console.log(`Seeded sample requisitions, replenishments, movements, and ${notifications.length} notifications.`);
  console.log('Database seeding successfully completed!');
}

module.exports = { seedDatabase };

if (require.main === module) {
  seedDatabase();
}
