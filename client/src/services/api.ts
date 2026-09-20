import {
  AppUser,
  Warehouse,
  Branch,
  HardwareCategory,
  HardwareCatalogItem,
  WarehouseStockItem,
  HardwareRequest,
  Replenishment,
  WarehouseRestockRequest,
  StockMovement,
  AppNotification,
  DashboardSummary
} from '../types';

const BASE_URL = '/api';

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network request failed' }));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Dashboard & Analytics
  getDashboard: () => fetchJson<{ summary: DashboardSummary; urgentRestockAlerts: any[]; lowStockAlerts: any[] }>('/analytics/dashboard'),

  // Warehouses
  getWarehouses: () => fetchJson<Warehouse[]>('/warehouses'),
  getWarehouseDetails: (id: number) => fetchJson<{ warehouse: Warehouse; stocks: WarehouseStockItem[] }>(`/warehouses/${id}`),
  createWarehouse: (data: {
    code: string;
    name: string;
    region: string;
    area?: string;
    address: string;
    contact_person: string;
    phone: string;
    email?: string;
    initial_stock_mode?: 'EMPTY' | 'DEFAULT_PAR';
    custodian_username?: string;
    custodian_password?: string;
  }) =>
    fetchJson<{ message: string; warehouse: Warehouse }>('/warehouses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateWarehouse: (id: number, data: Partial<{
    code: string;
    name: string;
    region: string;
    area: string;
    address: string;
    contact_person: string;
    phone: string;
    email: string;
    is_active: number;
  }>) =>
    fetchJson<{ message: string; warehouse: Warehouse }>(`/warehouses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteWarehouse: (id: number) =>
    fetchJson<{ success: boolean; message: string }>(`/warehouses/${id}`, {
      method: 'DELETE',
    }),
  clearAllWarehouses: () =>
    fetchJson<{ success: boolean; message: string; backup: any; stats: any }>('/warehouses/clear-all', {
      method: 'POST',
    }),
  backupDatabase: () =>
    fetchJson<{ success: boolean; backup: any }>('/warehouses/backup', {
      method: 'POST',
    }),

  // Branches
  getBranches: (params?: { region?: string; area?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.region) q.append('region', params.region);
    if (params?.area) q.append('area', params.area);
    if (params?.search) q.append('search', params.search);
    return fetchJson<Branch[]>(`/branches?${q.toString()}`);
  },
  getBranchDetails: (id: number) => fetchJson<{ branch: Branch; shipments: HardwareRequest[] }>(`/branches/${id}`),
  createBranch: (data: {
    code: string;
    name: string;
    region: string;
    area?: string;
    assigned_warehouse_id?: number | null;
    area_manager_name?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
  }) =>
    fetchJson<{ message: string; branch: Branch }>('/branches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateBranch: (id: number, data: Partial<{
    code: string;
    name: string;
    region: string;
    area: string;
    assigned_warehouse_id: number | null;
    area_manager_name: string;
    contact_person: string;
    phone: string;
    email: string;
    address: string;
    is_active: number;
  }>) =>
    fetchJson<{ message: string; branch: Branch }>(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteBranch: (id: number) =>
    fetchJson<{ success: boolean; message: string }>(`/branches/${id}`, {
      method: 'DELETE',
    }),

  // Hardware Categories & Catalog
  getCategories: () => fetchJson<HardwareCategory[]>('/categories'),
  createCategory: (data: { name: string; description?: string; icon?: string }) =>
    fetchJson<HardwareCategory>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCategory: (id: number, data: { name: string; description?: string; icon?: string }) =>
    fetchJson<HardwareCategory>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: number, force?: boolean) =>
    fetchJson<{ message: string }>(`/categories/${id}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
    }),
  clearAllCategories: () =>
    fetchJson<{
      success: boolean;
      message: string;
      backup: any;
      stats: { categories: number; catalogItems: number; stocks: number; warehouses: number };
    }>('/categories/clear-all', {
      method: 'POST',
    }),
  resetDefaultCategories: () =>
    fetchJson<{ message: string; categories: HardwareCategory[] }>('/categories/reset-defaults', {
      method: 'POST',
    }),
  getCatalog: () => fetchJson<{ categories: HardwareCategory[]; items: HardwareCatalogItem[] }>('/catalog'),
  createCatalogItem: (data: Partial<HardwareCatalogItem> & {
    initial_warehouse_id?: number | null;
    apply_to_all_warehouses?: boolean;
    initial_quantity?: number;
    max_threshold?: number;
    new_category_name?: string;
  }) =>
    fetchJson<{ id: number; message: string; stocked_warehouses_count: number }>('/catalog', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteCatalogItem: (id: number) =>
    fetchJson<{ message: string; deletedId: number }>(`/catalog/${id}`, {
      method: 'DELETE',
    }),
  customizeStock: (data: {
    warehouse_id: number;
    hardware_id: number;
    min_threshold?: number;
    max_threshold?: number;
    quantity_on_hand?: number;
    action_type?: 'SET_QUANTITY' | 'UPDATE_THRESHOLDS' | 'ADD_HARDWARE';
  }) =>
    fetchJson<{ message: string; stock_id: number }>('/stock/customize', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Requests / Requisitions
  getRequests: (params?: { branch_id?: number; warehouse_id?: number; status?: string; request_type?: string }) => {
    const q = new URLSearchParams();
    if (params?.branch_id) q.append('branch_id', String(params.branch_id));
    if (params?.warehouse_id) q.append('warehouse_id', String(params.warehouse_id));
    if (params?.status) q.append('status', params.status);
    if (params?.request_type) q.append('request_type', params.request_type);
    return fetchJson<HardwareRequest[]>(`/requests?${q.toString()}`);
  },
  createRequest: (data: {
    request_type: string;
    branch_id: number;
    warehouse_id: number;
    requester_name: string;
    requester_role: string;
    recipient_name: string;
    recipient_role: string;
    recipient_id?: string;
    purpose: string;
    borrow_expected_return_date?: string;
    items: { hardware_id: number; quantity: number }[];
  }) =>
    fetchJson<{ id: number; request_no: string; message: string }>('/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reviewRequest: (id: number, data: { action: 'APPROVE' | 'REJECT'; approver_name: string; remarks: string }) =>
    fetchJson<{ message: string; status: string }>(`/requests/${id}/am-review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  dispatchRequest: (id: number, data: { dispatched_by: string; carrier_name: string; tracking_no: string; item_serials?: Record<number, string> }) =>
    fetchJson<{ message: string; status: string }>(`/requests/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  branchAcceptDelivery: (id: number, data: { branch_accepted_by: string; branch_arrived_at: string; branch_condition: string; branch_remarks: string }) =>
    fetchJson<{ message: string; status: string }>(`/requests/${id}/branch-accept`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  returnBorrow: (id: number, data: { borrow_return_condition: string; return_remarks: string; returned_by: string }) =>
    fetchJson<{ message: string }>(`/requests/${id}/borrow-return`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Replenishments (Purchasing / GSD)
  getReplenishments: (params?: { warehouse_id?: number; branch_id?: number; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.warehouse_id) q.append('warehouse_id', String(params.warehouse_id));
    if (params?.branch_id) q.append('branch_id', String(params.branch_id));
    if (params?.status) q.append('status', params.status);
    return fetchJson<Replenishment[]>(`/replenishments?${q.toString()}`);
  },
  createReplenishment: (data: {
    warehouse_id: number;
    destination_branch_id?: number | null;
    gsd_staff_name: string;
    supplier_name: string;
    estimated_arrival?: string;
    items: { hardware_id: number; quantity: number }[];
    restock_request_id?: number;
  }) =>
    fetchJson<{ id: number; po_number: string; message: string }>('/replenishments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Warehouse Restock Requests (via AC approval to PU/GSD)
  getWarehouseRestockRequests: (params?: { warehouse_id?: number; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.warehouse_id) q.append('warehouse_id', String(params.warehouse_id));
    if (params?.status) q.append('status', params.status);
    return fetchJson<WarehouseRestockRequest[]>(`/warehouse-restock-requests?${q.toString()}`);
  },
  createWarehouseRestockRequest: (data: {
    warehouse_id: number;
    hardware_id: number;
    requested_quantity: number;
    urgency: string;
    reason: string;
    requested_by: string;
  }) =>
    fetchJson<{ id: number; request_no: string; message: string }>('/warehouse-restock-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reviewWarehouseRestockRequest: (id: number, data: { action: 'APPROVE' | 'REJECT'; approver_name: string; remarks: string }) =>
    fetchJson<{ message: string; status: string }>(`/warehouse-restock-requests/${id}/ac-review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  warehouseAcceptReplenishment: (id: number, data: {
    arrived_at: string;
    warehouse_accepted_by: string;
    arrival_remarks: string;
    received_items?: { item_id: number; quantity_received: number }[];
  }) =>
    fetchJson<{ message: string; status: string }>(`/replenishments/${id}/warehouse-accept`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  branchConfirmReplenishment: (id: number, data: {
    branch_received_at: string;
    branch_confirmed_by: string;
    branch_condition: string;
    branch_remarks: string;
  }) =>
    fetchJson<{ message: string; status: string }>(`/replenishments/${id}/branch-confirm`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getReplenishmentReport: (id: number) =>
    fetchJson<{ report: Replenishment; items: any[] }>(`/replenishments/${id}/report`),

  // Movements Audit Ledger
  getMovements: (params?: { warehouse_id?: number; branch_id?: number; movement_type?: string; search?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.warehouse_id) q.append('warehouse_id', String(params.warehouse_id));
    if (params?.branch_id) q.append('branch_id', String(params.branch_id));
    if (params?.movement_type) q.append('movement_type', params.movement_type);
    if (params?.search) q.append('search', params.search);
    if (params?.limit) q.append('limit', String(params.limit));
    return fetchJson<StockMovement[]>(`/movements?${q.toString()}`);
  },

  // Notifications
  getNotifications: (role?: string) => {
    const q = role ? `?role=${role}` : '';
    return fetchJson<AppNotification[]>(`/notifications${q}`);
  },
  markNotificationRead: (id: number) =>
    fetchJson<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: (role?: string) =>
    fetchJson<{ success: boolean }>('/notifications/read-all', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  // Authentication
  login: (username: string, password: string) =>
    fetchJson<{ success: boolean; user: AppUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // User Management & Role Assignment (Admin)
  getUsers: () => fetchJson<AppUser[]>('/users'),
  createUser: (data: {
    username: string;
    password?: string;
    full_name: string;
    email: string;
    role: string;
    assigned_warehouse_id?: number | null;
    assigned_branch_id?: number | null;
  }) =>
    fetchJson<{ id: number; message: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUser: (id: number, data: { full_name?: string; email?: string; password?: string; is_active?: number }) =>
    fetchJson<{ message: string }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  assignUserRole: (id: number, data: {
    role: string;
    assigned_warehouse_id?: number | null;
    assigned_branch_id?: number | null;
  }) =>
    fetchJson<{ message: string; role: string }>(`/users/${id}/assign-role`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  toggleUserStatus: (id: number) =>
    fetchJson<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),
};
