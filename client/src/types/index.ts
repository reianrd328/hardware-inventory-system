export type UserRole = 'IT' | 'AC' | 'GSD' | 'WAREHOUSE' | 'BRANCH' | 'ADMIN';

export interface AppUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
  assigned_warehouse_id?: number | null;
  warehouse_code?: string;
  warehouse_name?: string;
  assigned_branch_id?: number | null;
  branch_code?: string;
  branch_name?: string;
  is_active: number;
  created_at: string;
}

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  region: string;
  area: string;
  address: string;
  contact_person: string;
  phone: string;
  email: string;
  is_active: number;
  total_tracked_items?: number;
  total_units_in_stock?: number;
  out_of_stock_items?: number;
  low_stock_items?: number;
}

export interface Branch {
  id: number;
  code: string;
  name: string;
  region: string;
  area: string;
  assigned_warehouse_id: number;
  warehouse_code?: string;
  warehouse_name?: string;
  area_manager_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  is_active: number;
}

export interface HardwareCategory {
  id: number;
  name: string;
  description: string;
  icon: string;
  item_count?: number;
}

export interface HardwareCatalogItem {
  id: number;
  category_id: number;
  category_name?: string;
  sku: string;
  name: string;
  brand: string;
  model: string;
  specifications: string;
  unit: string;
  default_min_threshold: number;
  is_custom: number;
}

export type StockStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'OPTIMAL';

export interface WarehouseStockItem {
  stock_id: number;
  hardware_id: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  min_threshold: number;
  max_threshold: number;
  last_restocked_at?: string;
  updated_at?: string;
  sku: string;
  hardware_name: string;
  brand: string;
  model: string;
  specifications: string;
  unit: string;
  category_name: string;
  status: StockStatus;
}

export type RequestStatus = 
  | 'PENDING_AM_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_TRANSIT'
  | 'ARRIVED_AND_ACCEPTED'
  | 'CANCELLED';

export type RequestType = 'PERMANENT' | 'REPLACEMENT' | 'BORROW';

export interface RequestItem {
  id: number;
  request_id: number;
  hardware_id: number;
  quantity: number;
  serial_numbers?: string;
  sku?: string;
  hardware_name?: string;
  brand?: string;
  model?: string;
  category_name?: string;
}

export interface HardwareRequest {
  id: number;
  request_no: string;
  request_type: RequestType;
  branch_id: number;
  branch_code?: string;
  branch_name?: string;
  branch_region?: string;
  branch_area?: string;
  area_manager_name?: string;
  warehouse_id: number;
  warehouse_code?: string;
  warehouse_name?: string;
  requester_name: string;
  requester_role: string;
  recipient_name: string;
  recipient_role: string;
  recipient_id?: string;
  purpose: string;
  status: RequestStatus;
  
  // AM Approval
  am_approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  am_approved_at?: string;
  am_approver_name?: string;
  am_remarks?: string;

  // Dispatch
  dispatched_at?: string;
  dispatched_by?: string;
  carrier_name?: string;
  tracking_no?: string;

  // Branch Acceptance
  branch_arrived_at?: string;
  branch_accepted_by?: string;
  branch_condition?: string;
  branch_remarks?: string;

  // Borrow
  borrow_expected_return_date?: string;
  borrow_returned_at?: string;
  borrow_return_condition?: string;

  created_at: string;
  items?: RequestItem[];
}

export interface ReplenishmentItem {
  id: number;
  replenishment_id: number;
  hardware_id: number;
  quantity_ordered: number;
  quantity_received: number;
  sku?: string;
  hardware_name?: string;
  brand?: string;
  model?: string;
  unit?: string;
  category_name?: string;
}

export interface Replenishment {
  id: number;
  po_number: string;
  warehouse_id: number;
  warehouse_code?: string;
  warehouse_name?: string;
  warehouse_region?: string;
  warehouse_address?: string;
  warehouse_contact?: string;
  warehouse_phone?: string;
  destination_branch_id?: number | null;
  branch_code?: string;
  branch_name?: string;
  branch_region?: string;
  branch_address?: string;
  branch_contact?: string;
  gsd_staff_name: string;
  supplier_name: string;
  status: 'PENDING_SHIPMENT' | 'IN_TRANSIT' | 'ARRIVED_AT_WAREHOUSE' | 'BRANCH_CONFIRMED' | 'ARRIVED_AND_ACCEPTED';
  estimated_arrival?: string;
  shipped_at?: string;
  arrived_at?: string;
  warehouse_accepted_by?: string;
  arrival_remarks?: string;
  branch_received_at?: string;
  branch_confirmed_by?: string;
  branch_condition?: string;
  branch_remarks?: string;
  created_at: string;
  items?: ReplenishmentItem[];
}

export type RestockUrgency = 'URGENT' | 'HIGH' | 'NORMAL';
export type RestockStatus = 
  | 'PENDING_AC_APPROVAL'
  | 'APPROVED_BY_AC'
  | 'REJECTED_BY_AC'
  | 'PO_ISSUED_BY_GSD'
  | 'COMPLETED';

export interface WarehouseRestockRequest {
  id: number;
  request_no: string;
  warehouse_id: number;
  warehouse_code?: string;
  warehouse_name?: string;
  warehouse_region?: string;
  warehouse_area?: string;
  hardware_id: number;
  hardware_name?: string;
  brand?: string;
  model?: string;
  model_chassis?: string;
  sku?: string;
  category_name?: string;
  requested_quantity: number;
  current_quantity_on_hand?: number;
  min_threshold?: number;
  max_threshold?: number;
  urgency: RestockUrgency;
  reason?: string;
  requested_by: string;
  status: RestockStatus;
  ac_approver_name?: string;
  ac_remarks?: string;
  ac_reviewed_at?: string;
  po_number?: string;
  created_at: string;
}

export interface StockMovement {
  id: number;
  movement_type: string;
  warehouse_id: number;
  warehouse_code?: string;
  warehouse_name?: string;
  branch_id?: number;
  branch_code?: string;
  branch_name?: string;
  hardware_id: number;
  sku?: string;
  hardware_name?: string;
  brand?: string;
  quantity: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  recipient_name?: string;
  performed_by: string;
  notes?: string;
  created_at: string;
}

export interface AppNotification {
  id: number;
  recipient_role: string;
  type: string;
  title: string;
  message: string;
  link_url?: string;
  is_read: number;
  created_at: string;
}

export interface DashboardSummary {
  warehouseCount: number;
  branchCount: number;
  catalogCount: number;
  totalUnitsOnHand: number;
  outOfStockCount: number;
  lowStockCount: number;
  optimalCount: number;
  pendingApprovals: number;
  pendingDispatches: number;
  inTransitToBranches: number;
  activeBorrows: number;
  replenishmentsInTransit: number;
}
