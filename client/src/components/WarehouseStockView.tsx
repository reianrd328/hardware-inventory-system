import React, { useEffect, useState } from 'react';
import {
  Warehouse,
  WarehouseStockItem,
  HardwareCategory,
  HardwareCatalogItem,
  UserRole,
  AppUser,
  WarehouseRestockRequest,
  RestockUrgency
} from '../types';
import { api } from '../services/api';
import { WarehouseModal } from './WarehouseModal';
import { CategoryManagerModal } from './CategoryManagerModal';
import {
  Search,
  Filter,
  SlidersHorizontal,
  Plus,
  PackageX,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Monitor,
  HardDrive,
  Network,
  Printer,
  Zap,
  Layers,
  X,
  PlusCircle,
  TrendingDown,
  Globe,
  Building2,
  Sparkles,
  Warehouse as WarehouseIcon,
  Clock,
  ArrowRight,
  FileText,
  ArrowDownToLine,
  ShieldCheck,
  Truck,
  XCircle,
  Send,
  Package
} from 'lucide-react';

interface WarehouseStockViewProps {
  currentRole: UserRole;
  selectedWarehouseId: number;
  onWarehouseChange: (id: number) => void;
  warehouses: Warehouse[];
  initialFilter?: string;
  onNavigateToRestock?: (warehouseId: number, hardwareId: number) => void;
  onWarehousesUpdated?: () => void;
  onNavigateToTab?: (tab: string, meta?: any) => void;
  currentUser?: AppUser | null;
  userWarehouseId?: number | null;
}

export const WarehouseStockView: React.FC<WarehouseStockViewProps> = ({
  currentRole,
  selectedWarehouseId,
  onWarehouseChange,
  warehouses,
  initialFilter,
  onNavigateToRestock,
  onWarehousesUpdated,
  onNavigateToTab,
  currentUser,
  userWarehouseId
}) => {
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState(false);
  const [stocks, setStocks] = useState<WarehouseStockItem[]>([]);
  const [categories, setCategories] = useState<HardwareCategory[]>([]);
  const [catalogItems, setCatalogItems] = useState<HardwareCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Stock Requests & AC approval monitoring stats
  const [pendingAcRequests, setPendingAcRequests] = useState<number>(0);
  const [approvedAcRequests, setApprovedAcRequests] = useState<number>(0);

  // Warehouse Restock Requisitions (to PU / GSD via AC approval)
  const [restockRequests, setRestockRequests] = useState<WarehouseRestockRequest[]>([]);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockItem, setRestockItem] = useState<WarehouseStockItem | null>(null);
  const [restockHardwareId, setRestockHardwareId] = useState<number>(1);
  const [restockQuantity, setRestockQuantity] = useState<number>(15);
  const [restockUrgency, setRestockUrgency] = useState<RestockUrgency>('HIGH');
  const [restockReason, setRestockReason] = useState<string>('');
  const [restockRequesterName, setRestockRequesterName] = useState<string>('Warehouse Custodian');
  const [showRestockHistoryModal, setShowRestockHistoryModal] = useState(false);
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter || 'ALL');

  // Customization modal state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedStockForEdit, setSelectedStockForEdit] = useState<WarehouseStockItem | null>(null);
  const [modalMode, setModalMode] = useState<'CREATE_CUSTOM' | 'EDIT_PAR'>('EDIT_PAR');

  // Form states for customization
  const [formWarehouseId, setFormWarehouseId] = useState<number>(selectedWarehouseId || (warehouses[0]?.id ?? 1));
  const [formHardwareId, setFormHardwareId] = useState<number>(1);
  const [formMinThreshold, setFormMinThreshold] = useState<number>(5);
  const [formMaxThreshold, setFormMaxThreshold] = useState<number>(30);
  const [formQuantityOnHand, setFormQuantityOnHand] = useState<number>(10);

  // New custom item fields
  const [customSku, setCustomSku] = useState('');
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [customCategoryId, setCustomCategoryId] = useState<number>(1);
  const [customSpecs, setCustomSpecs] = useState('');
  const [customUnit, setCustomUnit] = useState('Unit');
  const [warehouseAssignmentMode, setWarehouseAssignmentMode] = useState<'ALL_ACTIVE' | 'SINGLE'>('ALL_ACTIVE');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState<boolean>(false);
  const [customNewCategoryName, setCustomNewCategoryName] = useState<string>('');

  // Toast / feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadStockData = async () => {
    try {
      setLoading(true);
      if (warehouses.length === 0) {
        setStocks([]);
        setLoading(false);
        return;
      }
      const activeWhId =
        currentRole === 'WAREHOUSE' && userWarehouseId
          ? userWarehouseId
          : selectedWarehouseId > 0 && warehouses.some((w) => w.id === selectedWarehouseId)
          ? selectedWarehouseId
          : (warehouses[0]?.id ?? 1);
      const whData = await api.getWarehouseDetails(activeWhId);
      setStocks(whData.stocks);

      const catData = await api.getCatalog();
      setCategories(catData.categories);
      setCatalogItems(catData.items);

      try {
        const reqData = await api.getRequests({ warehouse_id: activeWhId });
        setPendingAcRequests(reqData.filter((r) => r.status === 'PENDING_AM_APPROVAL').length);
        setApprovedAcRequests(reqData.filter((r) => r.status === 'APPROVED').length);
      } catch (reqErr) {
        console.error('Failed to load requests count for stock view', reqErr);
      }

      try {
        const restockData = await api.getWarehouseRestockRequests({ warehouse_id: activeWhId });
        setRestockRequests(restockData);
      } catch (restockErr) {
        console.error('Failed to load restock requests for warehouse', restockErr);
      }
    } catch (e: any) {
      console.error('Failed to load stocks', e);
      setFeedback({ type: 'error', message: e.message || 'Error loading stocks' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRestock = (item?: WarehouseStockItem) => {
    if (item) {
      setRestockItem(item);
      setRestockHardwareId(item.hardware_id);
      const suggested = Math.max(10, (item.max_threshold || 20) - item.quantity_on_hand);
      setRestockQuantity(suggested);
      setRestockUrgency(item.quantity_on_hand === 0 ? 'URGENT' : 'HIGH');
      setRestockReason(
        item.quantity_on_hand === 0
          ? `Stock depleted (${item.hardware_name} is at 0 units). Urgent replenishment needed for pending branch requisitions.`
          : `Stock is low (${item.quantity_on_hand} / min ${item.min_threshold}). Requisition to avoid stockout.`
      );
    } else {
      setRestockItem(null);
      setRestockHardwareId(catalogItems[0]?.id || 1);
      setRestockQuantity(20);
      setRestockUrgency('NORMAL');
      setRestockReason('Inventory replenishment for warehouse buffer stock.');
    }
    setRestockRequesterName(currentUser?.full_name ? `${currentUser.full_name} (${currentUser.role})` : 'Warehouse Custodian');
    setShowRestockModal(true);
  };

  const handleSubmitRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingRestock(true);
      const activeWhId =
        currentRole === 'WAREHOUSE' && userWarehouseId
          ? userWarehouseId
          : selectedWarehouseId > 0 && warehouses.some((w) => w.id === selectedWarehouseId)
          ? selectedWarehouseId
          : (warehouses[0]?.id ?? 1);

      const res = await api.createWarehouseRestockRequest({
        warehouse_id: activeWhId,
        hardware_id: restockHardwareId,
        requested_quantity: restockQuantity,
        urgency: restockUrgency,
        reason: restockReason,
        requested_by: restockRequesterName || (currentUser?.full_name || 'Warehouse Custodian')
      });

      setFeedback({
        type: 'success',
        message: `Restock Requisition ${res.request_no} submitted! It has been routed to your Area Coordinator (AC) for review before dispatch to PU/GSD.`
      });

      setShowRestockModal(false);
      loadStockData();
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit restock request' });
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, [selectedWarehouseId, warehouses]);

  // Filtered stock list
  const filteredStocks = stocks.filter((item) => {
    const matchesSearch =
      item.hardware_name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.brand.toLowerCase().includes(search.toLowerCase()) ||
      item.model.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || item.category_name === selectedCategory;
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate stats for active warehouse
  const totalUnits = stocks.reduce((acc, it) => acc + it.quantity_on_hand, 0);
  const outCount = stocks.filter((it) => it.status === 'OUT_OF_STOCK').length;
  const lowCount = stocks.filter((it) => it.status === 'LOW_STOCK').length;
  const optimalCount = stocks.filter((it) => it.status === 'OPTIMAL').length;

  const handleOpenEditPar = (stock: WarehouseStockItem) => {
    setSelectedStockForEdit(stock);
    setFormWarehouseId(selectedWarehouseId || 1);
    setFormHardwareId(stock.hardware_id);
    setFormMinThreshold(stock.min_threshold);
    setFormMaxThreshold(stock.max_threshold);
    setFormQuantityOnHand(stock.quantity_on_hand);
    setModalMode('EDIT_PAR');
    setShowCustomizeModal(true);
  };

  const handleOpenCreateCustom = () => {
    setWarehouseAssignmentMode('ALL_ACTIVE');
    setFormWarehouseId(selectedWarehouseId > 0 ? selectedWarehouseId : (warehouses[0]?.id ?? 1));
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setCustomSku(`HW-${randomSuffix}`);
    setCustomName('');
    setCustomBrand('');
    setCustomModel('');
    setCustomSpecs('');
    setIsAddingNewCategory(categories.length === 0);
    setCustomNewCategoryName('');
    setCustomCategoryId(categories[0]?.id ?? 1);
    setCustomUnit('Unit');
    setFormMinThreshold(5);
    setFormMaxThreshold(30);
    setFormQuantityOnHand(10);
    setModalMode('CREATE_CUSTOM');
    setShowCustomizeModal(true);
  };

  const handleGenerateSku = () => {
    const selectedCat = categories.find((c) => c.id === customCategoryId);
    const prefix = isAddingNewCategory && customNewCategoryName.trim()
      ? customNewCategoryName.trim().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '')
      : selectedCat
      ? selectedCat.name.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '')
      : 'HW';
    const rand = Math.floor(1000 + Math.random() * 9000);
    setCustomSku(`${prefix || 'HW'}-${rand}`);
  };

  const handleSaveCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'EDIT_PAR' && selectedStockForEdit) {
        await api.customizeStock({
          warehouse_id: selectedWarehouseId || 1,
          hardware_id: selectedStockForEdit.hardware_id,
          min_threshold: formMinThreshold,
          max_threshold: formMaxThreshold,
          quantity_on_hand: formQuantityOnHand,
          action_type: 'SET_QUANTITY',
        });
        setFeedback({ type: 'success', message: `Stock & par threshold updated for ${selectedStockForEdit.hardware_name}!` });
      } else if (modalMode === 'CREATE_CUSTOM') {
        if (!customName.trim() || !customBrand.trim() || !customSku.trim()) {
          setFeedback({ type: 'error', message: 'Please complete all required fields: SKU, Item Name, and Brand are mandatory.' });
          return;
        }
        if (isAddingNewCategory && !customNewCategoryName.trim()) {
          setFeedback({ type: 'error', message: 'Please enter a name for the new hardware category.' });
          return;
        }

        const isAllWh = warehouseAssignmentMode === 'ALL_ACTIVE';
        const res = await api.createCatalogItem({
          category_id: isAddingNewCategory ? undefined : customCategoryId,
          new_category_name: isAddingNewCategory ? customNewCategoryName.trim() : undefined,
          sku: customSku.trim().toUpperCase(),
          name: customName.trim(),
          brand: customBrand.trim(),
          model: customModel.trim() || 'Custom Spec',
          specifications: customSpecs.trim(),
          unit: customUnit.trim() || 'Unit',
          default_min_threshold: formMinThreshold,
          max_threshold: formMaxThreshold,
          initial_warehouse_id: isAllWh ? null : formWarehouseId,
          apply_to_all_warehouses: isAllWh,
          initial_quantity: formQuantityOnHand,
        });

        setFeedback({
          type: 'success',
          message: res.message || `Custom hardware "${customName}" registered successfully!`
        });
      }

      setShowCustomizeModal(false);
      loadStockData();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Action failed' });
    }
  };

  const currentWh = warehouses.find((w) => w.id === (selectedWarehouseId > 0 ? selectedWarehouseId : 1));

  if (warehouses.length === 0) {
    return (
      <div className="bg-white border border-dashed border-amber-300 rounded-2xl p-12 text-center space-y-5 shadow-sm">
        <div className="w-16 h-16 mx-auto bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-center text-amber-600">
          <WarehouseIcon className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-base font-bold text-slate-900">No Warehouses Configured</h3>
          <p className="text-xs text-slate-500">
            All mock warehouse records have been cleared. To view and customize hardware stocks, please register your company's actual distribution hubs.
          </p>
        </div>
        <div>
          {currentRole === 'ADMIN' ? (
            <button
              onClick={() => setShowAddWarehouseModal(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md shadow-amber-500/20 text-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Register Company Warehouse Now</span>
            </button>
          ) : (
            <p className="text-xs text-amber-800 font-semibold bg-amber-100/70 py-2 px-4 rounded-lg inline-block">
              Please sign in as Administrator to register company warehouses.
            </p>
          )}
        </div>

        <WarehouseModal
          isOpen={showAddWarehouseModal}
          onClose={() => setShowAddWarehouseModal(false)}
          warehouseToEdit={null}
          onSaved={(newWh) => {
            setShowAddWarehouseModal(false);
            if (onWarehousesUpdated) onWarehousesUpdated();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg text-xs font-semibold flex items-center justify-between shadow-md transition ${
            feedback.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="ml-2 opacity-80 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Warehouse Selector & Stock Control Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-600">
            <WarehouseIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900">
                {currentWh ? `${currentWh.code} - ${currentWh.name}` : 'Warehouse Inventory'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {currentWh?.region}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize stocked hardware (CPUs, Monitors, Network, Custom devices), monitor par levels, and trigger restock.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {currentRole === 'ADMIN' && (
            <button
              onClick={() => setShowAddWarehouseModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <WarehouseIcon className="w-3.5 h-3.5" />
              <span>+ Add Warehouse</span>
            </button>
          )}

          {/* Hardware Categories & Custom Hardware buttons (ADMIN ONLY) */}
          {currentRole === 'ADMIN' && (
            <>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
                title="View, add, edit, or wipe hardware categories"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Hardware Categories ({categories.length})</span>
              </button>

              <button
                onClick={handleOpenCreateCustom}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Customize New Hardware</span>
              </button>
            </>
          )}

          {/* Quick link for warehouse users & managers to view stock requests and AC approvals */}
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('dispatch')}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
              title="View branch stock requisitions and monitor AC approval status"
            >
              <Clock className="w-3.5 h-3.5 text-indigo-200" />
              <span>Stock Requests & AC Status ({pendingAcRequests} Pending, {approvedAcRequests} Approved)</span>
            </button>
          )}

          {/* Warehouse Restock Requisition Button */}
          <button
            onClick={() => handleOpenRestock()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
            title="Request stock replenishment from PU/GSD with AC approval"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>📥 Request Restock from PU/GSD</span>
          </button>

          <button
            onClick={loadStockData}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            title="Refresh Stock"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clean Slate Categories Banner (ADMIN ONLY) */}
      {categories.length === 0 && currentRole === 'ADMIN' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-xs">No Hardware Categories Configured</div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                All mock category records have been removed. Register your company's actual equipment categories to organize your hardware inventory.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs shrink-0 transition cursor-pointer"
          >
            + Add Categories Now
          </button>
        </div>
      )}

      {/* Branch Stock Requests & AC Approval Monitoring Banner */}
      <div className="p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs flex items-center space-x-2 flex-wrap gap-y-1">
              <span>Branch Stock Requests & AC Approval Status</span>
              {pendingAcRequests > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  ⏳ {pendingAcRequests} Awaiting AC Review
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                  0 Pending AC Review
                </span>
              )}
              {approvedAcRequests > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {approvedAcRequests} AC Approved (Ready to Dispatch)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                  0 Ready to Dispatch
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Monitor incoming branch hardware requests and verify whether the Area Coordinator (AC) has approved them before dispatch.
            </p>
          </div>
        </div>

        {onNavigateToTab && (
          <button
            onClick={() => onNavigateToTab('dispatch')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs shrink-0 flex items-center space-x-1.5 transition cursor-pointer"
          >
            <span>Open Requests & AC Monitor</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Warehouse Restock Requisitions (to PU / GSD via AC) Status Banner */}
      <div className="p-3.5 bg-gradient-to-r from-amber-50 via-orange-50 to-slate-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <ArrowDownToLine className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs flex items-center space-x-2 flex-wrap gap-y-1">
              <span>Restock Requisitions to PU / GSD (via AC Approval)</span>
              {restockRequests.filter((r) => r.status === 'PENDING_AC_APPROVAL').length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                  ⏳ {restockRequests.filter((r) => r.status === 'PENDING_AC_APPROVAL').length} Awaiting AC Approval
                </span>
              )}
              {restockRequests.filter((r) => r.status === 'APPROVED_BY_AC').length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                  ✅ {restockRequests.filter((r) => r.status === 'APPROVED_BY_AC').length} Sent to PU/GSD
                </span>
              )}
              {restockRequests.filter((r) => r.status === 'PO_ISSUED_BY_GSD').length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  🚚 {restockRequests.filter((r) => r.status === 'PO_ISSUED_BY_GSD').length} PO Issued
                </span>
              )}
              {restockRequests.length === 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                  0 Active Requisitions
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Out of stock / low stock items requested to Purchasing Unit (PU) / GSD. Pre-cleared by Area Coordinator before PO generation.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => handleOpenRestock()}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Restock Request</span>
          </button>
          {restockRequests.length > 0 && (
            <button
              onClick={() => setShowRestockHistoryModal(true)}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold shadow-xs transition cursor-pointer flex items-center space-x-1"
            >
              <span>View Tracking ({restockRequests.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Stock Health Badges Bar (With GSD & AC Out of Stock Indicators) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 rounded-xl border text-left transition ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80">Total Tracked Units</div>
          <div className="text-xl font-bold mt-0.5">{totalUnits.toLocaleString()}</div>
          <div className="text-[10px] mt-0.5 opacity-75">{stocks.length} Hardware Models</div>
        </button>

        <button
          onClick={() => setStatusFilter('OUT_OF_STOCK')}
          className={`p-3 rounded-xl border text-left transition ${
            statusFilter === 'OUT_OF_STOCK'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-rose-50/70 text-rose-800 border-rose-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold">🔴 OUT OF STOCK</span>
            <PackageX className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black mt-0.5">{outCount}</div>
          <div className="text-[10px] mt-0.5 font-medium">GSD & AC Alert Active</div>
        </button>

        <button
          onClick={() => setStatusFilter('LOW_STOCK')}
          className={`p-3 rounded-xl border text-left transition ${
            statusFilter === 'LOW_STOCK'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-amber-50/70 text-amber-800 border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold">🟡 LOW STOCK</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black mt-0.5">{lowCount}</div>
          <div className="text-[10px] mt-0.5 font-medium">Below Min Threshold</div>
        </button>

        <button
          onClick={() => setStatusFilter('OPTIMAL')}
          className={`p-3 rounded-xl border text-left transition ${
            statusFilter === 'OPTIMAL'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold">🟢 HEALTHY / OPTIMAL</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-bold mt-0.5">{optimalCount}</div>
          <div className="text-[10px] mt-0.5 font-medium">Adequate Fulfillment Buffer</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, CPU, Monitor, brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              selectedCategory === 'ALL'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                selectedCategory === cat.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-3 px-3.5">Hardware Item & Specs</th>
                <th className="py-3 px-3.5">Category</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">On Hand</th>
                <th className="py-3 px-3 text-center">Par Level (Min/Max)</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No hardware found matching current search or filters.
                  </td>
                </tr>
              ) : (
                filteredStocks.map((item) => {
                  const isOut = item.status === 'OUT_OF_STOCK';
                  const isLow = item.status === 'LOW_STOCK';

                  return (
                    <tr
                      key={item.stock_id}
                      className={`hover:bg-slate-50/70 transition ${
                        isOut ? 'bg-rose-50/20' : isLow ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Hardware details */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 text-sm">{item.hardware_name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-700">{item.brand}</span>
                          <span className="mx-1.5">•</span>
                          <span>Model: {item.model}</span>
                          <span className="mx-1.5">•</span>
                          <span className="font-mono text-slate-500">{item.sku}</span>
                        </div>
                        {item.specifications && (
                          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                            {item.specifications}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3.5 text-slate-600 font-medium">
                        {item.category_name}
                      </td>

                      {/* Status Indicator */}
                      <td className="py-3 px-3 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                            🔴 Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            🟡 Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                            🟢 Optimal
                          </span>
                        )}
                      </td>

                      {/* Quantity On Hand */}
                      <td className="py-3 px-3 text-center">
                        <span className={`text-base font-black ${isOut ? 'text-rose-600' : isLow ? 'text-amber-700' : 'text-slate-900'}`}>
                          {item.quantity_on_hand}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">{item.unit}s</span>
                      </td>

                      {/* Par Levels (Min / Max) */}
                      <td className="py-3 px-3 text-center text-slate-600 font-medium">
                        <span className="text-slate-700 font-semibold">{item.min_threshold}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-500">{item.max_threshold}</span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Customize Par Level or Adjust Stock (ADMIN ONLY) */}
                          {currentRole === 'ADMIN' && (
                            <button
                              onClick={() => handleOpenEditPar(item)}
                              className="px-2.5 py-1 text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 rounded font-semibold text-[11px] transition cursor-pointer"
                              title="Customize stock level or par limits"
                            >
                              Customize
                            </button>
                          )}

                          {/* Active Restock Request Status or Request Restock Button */}
                          {(() => {
                            const activeRestock = restockRequests.find(
                              (r) =>
                                r.hardware_id === item.hardware_id &&
                                ['PENDING_AC_APPROVAL', 'APPROVED_BY_AC', 'PO_ISSUED_BY_GSD'].includes(r.status)
                            );

                            if (activeRestock) {
                              if (activeRestock.status === 'PENDING_AC_APPROVAL') {
                                return (
                                  <button
                                    onClick={() => setShowRestockHistoryModal(true)}
                                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded font-semibold text-[11px] transition flex items-center space-x-1 cursor-pointer"
                                    title="Restock requisition is awaiting Area Coordinator approval"
                                  >
                                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                                    <span>⏳ Awaiting AC</span>
                                  </button>
                                );
                              }
                              if (activeRestock.status === 'APPROVED_BY_AC') {
                                return (
                                  <button
                                    onClick={() => setShowRestockHistoryModal(true)}
                                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-semibold text-[11px] transition flex items-center space-x-1 cursor-pointer"
                                    title="Approved by AC and sent to PU/GSD for PO issuance"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                    <span>✅ Sent to PU/GSD</span>
                                  </button>
                                );
                              }
                              if (activeRestock.status === 'PO_ISSUED_BY_GSD') {
                                return (
                                  <button
                                    onClick={() => setShowRestockHistoryModal(true)}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold text-[11px] transition flex items-center space-x-1 cursor-pointer"
                                    title={`Purchase Order issued by GSD: ${activeRestock.po_number || ''}`}
                                  >
                                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>🚚 PO Issued</span>
                                  </button>
                                );
                              }
                            }

                            if (isOut || isLow) {
                              return (
                                <button
                                  onClick={() => handleOpenRestock(item)}
                                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-[11px] shadow-sm transition flex items-center space-x-1 cursor-pointer"
                                  title="Request stock replenishment from PU/GSD via AC"
                                >
                                  <ArrowDownToLine className="w-3.5 h-3.5" />
                                  <span>Request Restock</span>
                                </button>
                              );
                            }

                            return (
                              <button
                                onClick={() => handleOpenRestock(item)}
                                className="px-2 py-1 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded font-medium text-[11px] transition cursor-pointer"
                                title="Request buffer stock replenishment"
                              >
                                Restock
                              </button>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customize Warehouse Stock Modal */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl shadow-2xl ${modalMode === 'CREATE_CUSTOM' ? 'max-w-2xl' : 'max-w-lg'} w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]`}>
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {modalMode === 'EDIT_PAR' && `Customize: ${selectedStockForEdit?.hardware_name}`}
                    {modalMode === 'CREATE_CUSTOM' && 'Create & Stock Custom Hardware Item'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-normal">
                    {modalMode === 'CREATE_CUSTOM'
                      ? 'Configure item specs, unique SKU, and deploy stock across active warehouses'
                      : 'Set par thresholds and physical inventory counts'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCustomization} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Assigned Warehouse selector for non-create modes */}
              {modalMode !== 'CREATE_CUSTOM' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Warehouse</label>
                  <select
                    value={formWarehouseId}
                    onChange={(e) => setFormWarehouseId(Number(e.target.value))}
                    disabled={modalMode === 'EDIT_PAR'}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.code} - {wh.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mode: EDIT_PAR */}
              {modalMode === 'EDIT_PAR' && selectedStockForEdit && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-900">
                    <div className="font-bold">{selectedStockForEdit.hardware_name}</div>
                    <div className="text-[11px] text-blue-700">SKU: {selectedStockForEdit.sku} • {selectedStockForEdit.category_name}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Current Physical Count (Units)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formQuantityOnHand}
                        onChange={(e) => setFormQuantityOnHand(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-900"
                      />
                      <span className="text-[10px] text-slate-400">Auto-logs stock adjustment movement</span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Min Par Level (Reorder Point)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formMinThreshold}
                        onChange={(e) => setFormMinThreshold(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-amber-700"
                      />
                      <span className="text-[10px] text-slate-400">Triggers Low Stock warning</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Max Warehouse Capacity
                    </label>
                    <input
                      type="number"
                      min={formMinThreshold}
                      value={formMaxThreshold}
                      onChange={(e) => setFormMaxThreshold(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Mode: CREATE_CUSTOM */}
              {modalMode === 'CREATE_CUSTOM' && (
                <div className="space-y-4">
                  {/* 1. Warehouse Assignment Options */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-800 text-xs">
                        Assigned Warehouse Distribution *
                      </label>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {warehouseAssignmentMode === 'ALL_ACTIVE'
                          ? `Broadcasting to all ${warehouses.length} active hubs`
                          : 'Targeted single warehouse'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setWarehouseAssignmentMode('ALL_ACTIVE')}
                        className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                          warehouseAssignmentMode === 'ALL_ACTIVE'
                            ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <Globe className={`w-4 h-4 ${warehouseAssignmentMode === 'ALL_ACTIVE' ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className="font-bold text-xs">All Active Warehouses</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Automatically create stock records and allocate inventory across all {warehouses.length} active warehouse locations.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setWarehouseAssignmentMode('SINGLE')}
                        className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                          warehouseAssignmentMode === 'SINGLE'
                            ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <Building2 className={`w-4 h-4 ${warehouseAssignmentMode === 'SINGLE' ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className="font-bold text-xs">Specific Warehouse</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Allocate stock exclusively to one selected regional warehouse hub.
                        </p>
                      </button>
                    </div>

                    {warehouseAssignmentMode === 'SINGLE' && (
                      <div className="pt-2 animate-fadeIn">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Select Target Warehouse Hub:
                        </label>
                        <select
                          value={formWarehouseId}
                          onChange={(e) => setFormWarehouseId(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          {warehouses.map((wh) => (
                            <option key={wh.id} value={wh.id}>
                              {wh.code} — {wh.name} ({wh.region})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* 2. Category & SKU */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Category */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-slate-700">Hardware Category *</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewCategory(!isAddingNewCategory);
                            if (!isAddingNewCategory) setCustomNewCategoryName('');
                          }}
                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1"
                        >
                          {isAddingNewCategory ? '← Choose Existing' : '+ Add New Category'}
                        </button>
                      </div>

                      {isAddingNewCategory ? (
                        <div>
                          <input
                            type="text"
                            required
                            value={customNewCategoryName}
                            onChange={(e) => setCustomNewCategoryName(e.target.value)}
                            placeholder="e.g. Biometrics & Security"
                            className="w-full p-2 bg-blue-50/50 border border-blue-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-blue-600 mt-0.5 block">Will be added to system category master</span>
                        </div>
                      ) : (
                        <select
                          value={customCategoryId}
                          onChange={(e) => setCustomCategoryId(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Unique SKU Code */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-slate-700">Unique SKU Code *</label>
                        <button
                          type="button"
                          onClick={handleGenerateSku}
                          className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center space-x-1"
                          title="Generate a unique SKU code"
                        >
                          <Sparkles className="w-3 h-3 inline mr-0.5" />
                          Auto-Generate
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={customSku}
                        onChange={(e) => setCustomSku(e.target.value.toUpperCase())}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg uppercase font-mono font-semibold tracking-wider text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="e.g. CPU-CUST-8041"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Unique identifier across company hardware</span>
                    </div>
                  </div>

                  {/* 3. Item Full Name */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Item Full Name *</label>
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g. Dell OptiPlex 7000 Micro Form Factor PC"
                    />
                  </div>

                  {/* 4. Brand & Model */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Brand / Manufacturer *</label>
                      <input
                        type="text"
                        required
                        value={customBrand}
                        onChange={(e) => setCustomBrand(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="e.g. Dell, Lenovo, HP, Custom"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Model / Chassis</label>
                      <input
                        type="text"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="e.g. OptiPlex 7090 MFF / Tower"
                      />
                    </div>
                  </div>

                  {/* 5. Detailed Technical Specifications */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Detailed Technical Specifications
                    </label>
                    <textarea
                      rows={3}
                      value={customSpecs}
                      onChange={(e) => setCustomSpecs(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                      placeholder="e.g. Intel Core i7-13700T, 32GB DDR4 RAM, 1TB NVMe SSD, WiFi 6E, Bluetooth 5.2, Dual DisplayPort, Windows 11 Pro OEM"
                    />
                    <span className="text-[10px] text-slate-400">Specify processor, RAM, storage, ports, or special peripherals.</span>
                  </div>

                  {/* 6. Par Levels & Initial Stock */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-800 text-xs">
                      Stock Par Settings & Inventory Allocation
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Unit of Measure</label>
                        <select
                          value={customUnit}
                          onChange={(e) => setCustomUnit(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="Unit">Unit</option>
                          <option value="Set">Set</option>
                          <option value="Piece">Piece</option>
                          <option value="Box">Box</option>
                          <option value="Roll">Roll</option>
                          <option value="Meter">Meter</option>
                          <option value="Pack">Pack</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Initial Stock {warehouseAssignmentMode === 'ALL_ACTIVE' ? '(per Hub)' : ''}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formQuantityOnHand}
                          onChange={(e) => setFormQuantityOnHand(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Min Par Level</label>
                        <input
                          type="number"
                          min="1"
                          value={formMinThreshold}
                          onChange={(e) => setFormMinThreshold(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-amber-700 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Max Capacity</label>
                        <input
                          type="number"
                          min={formMinThreshold}
                          value={formMaxThreshold}
                          onChange={(e) => setFormMaxThreshold(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                    {warehouseAssignmentMode === 'ALL_ACTIVE' && (
                      <p className="text-[10px] text-blue-700">
                        ℹ️ Setting Initial Stock to <strong>{formQuantityOnHand}</strong> will allocate a total of <strong>{formQuantityOnHand * warehouses.length} units</strong> across all {warehouses.length} active warehouse locations.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCustomizeModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition"
                >
                  {modalMode === 'CREATE_CUSTOM'
                    ? warehouseAssignmentMode === 'ALL_ACTIVE'
                      ? `Register & Stock All Active Warehouses (${warehouses.length})`
                      : 'Register & Stock Warehouse'
                    : 'Save Customization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Warehouse Facility Modal */}
      <WarehouseModal
        isOpen={showAddWarehouseModal}
        onClose={() => setShowAddWarehouseModal(false)}
        warehouseToEdit={null}
        onSaved={(newWh) => {
          setShowAddWarehouseModal(false);
          if (onWarehousesUpdated) onWarehousesUpdated();
        }}
      />

      {/* Hardware Category Management Modal */}
      <CategoryManagerModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoriesUpdated={() => {
          loadStockData();
        }}
      />

      {/* Restock Requisition Modal (to PU / GSD via AC Approval) */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 bg-amber-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                  <ArrowDownToLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Stock Replenishment Requisition</h3>
                  <p className="text-[11px] text-amber-100">
                    {currentWh?.code} - {currentWh?.name} • Routed to AC before PU/GSD
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRestockModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRestock} className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Mandatory Approval Workflow Notice */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start space-x-2.5 text-purple-900">
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Approval Policy Gate</span>
                  <span className="text-[11px] text-purple-700">
                    This requisition is submitted directly to your <strong>Area Coordinator (AC)</strong> for review. Once approved by the AC, it will be automatically dispatched to <strong>Purchasing Unit (PU) / GSD</strong> to generate a Purchase Order (PO).
                  </span>
                </div>
              </div>

              {/* Hardware Item Selection / Info */}
              {restockItem ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Target Hardware Item
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{restockItem.hardware_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {restockItem.category_name} • {restockItem.brand} {restockItem.model} • <span className="font-mono">{restockItem.sku}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${restockItem.quantity_on_hand === 0 ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                        {restockItem.quantity_on_hand === 0 ? 'Out of Stock (0)' : `Low (${restockItem.quantity_on_hand})`}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Par: {restockItem.min_threshold} min / {restockItem.max_threshold} max
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Hardware Item to Restock *</label>
                  <select
                    value={restockHardwareId}
                    onChange={(e) => setRestockHardwareId(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {catalogItems.map((ci) => (
                      <option key={ci.id} value={ci.id}>
                        [{ci.sku}] {ci.name} ({ci.category_name || 'Hardware'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity & Urgency Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Requested Quantity (Units) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={restockQuantity}
                    onChange={(e) => setRestockQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Recommended: {restockItem ? Math.max(10, (restockItem.max_threshold || 20) - restockItem.quantity_on_hand) : 20} units
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Urgency / Priority *</label>
                  <select
                    value={restockUrgency}
                    onChange={(e) => setRestockUrgency(e.target.value as RestockUrgency)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="URGENT">🔴 URGENT - Stockout (0 Units)</option>
                    <option value="HIGH">🟡 HIGH - Below Par Minimum</option>
                    <option value="NORMAL">🟢 NORMAL - Buffer Restock</option>
                  </select>
                </div>
              </div>

              {/* Business Justification */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Business Justification / Reason *</label>
                <textarea
                  rows={3}
                  required
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  placeholder="e.g. Stock depleted to 0 units. Critical for ongoing branch hardware requests."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Requester Identity */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Warehouse Custodian / Requester *</label>
                <input
                  type="text"
                  required
                  value={restockRequesterName}
                  onChange={(e) => setRestockRequesterName(e.target.value)}
                  className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRestock}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingRestock ? 'Submitting...' : 'Submit to AC for Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Tracking & History Modal */}
      {showRestockHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <ArrowDownToLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Warehouse Restock Tracking & Status</h3>
                  <p className="text-[11px] text-slate-400">
                    Requisitions submitted to PU / GSD via Area Coordinator (AC) approval
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRestockHistoryModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto text-xs flex-1">
              {restockRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Package className="w-10 h-10 text-slate-300 mx-auto" />
                  <div className="font-bold text-slate-700">No Restock Requests Yet</div>
                  <p className="text-slate-400 text-xs max-w-xs mx-auto">
                    When you request replenishment for out-of-stock or low-stock items, they will appear here with live AC approval and PU/GSD PO status.
                  </p>
                  <button
                    onClick={() => {
                      setShowRestockHistoryModal(false);
                      handleOpenRestock();
                    }}
                    className="mt-2 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    + Create Restock Request
                  </button>
                </div>
              ) : (
                restockRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between pb-2 border-b border-slate-100">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-amber-700">{req.request_no}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${req.urgency === 'URGENT' ? 'bg-rose-100 text-rose-700 border border-rose-300' : req.urgency === 'HIGH' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-700'}`}>
                            {req.urgency}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Submitted {new Date(req.created_at).toLocaleDateString()} by {req.requested_by}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {req.status === 'PENDING_AC_APPROVAL' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 animate-pulse">
                            <Clock className="w-3 h-3 mr-1" />
                            ⏳ Awaiting AC Approval
                          </span>
                        )}
                        {req.status === 'APPROVED_BY_AC' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            ✅ AC Approved → Sent to PU/GSD
                          </span>
                        )}
                        {req.status === 'PO_ISSUED_BY_GSD' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Truck className="w-3 h-3 mr-1" />
                            🚚 PO Issued ({req.po_number || 'GSD Pipeline'})
                          </span>
                        )}
                        {req.status === 'REJECTED_BY_AC' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <XCircle className="w-3 h-3 mr-1" />
                            ❌ Declined by AC
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hardware Details */}
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <div className="font-bold text-slate-900">{req.hardware_name}</div>
                        <div className="text-[10px] text-slate-500">
                          {req.category_name} • <span className="font-mono">{req.sku}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-800 text-sm">{req.requested_quantity} units</span>
                        <div className="text-[10px] text-slate-400">requested</div>
                      </div>
                    </div>

                    {/* Status details / Remarks */}
                    {req.status === 'PENDING_AC_APPROVAL' && (
                      <div className="p-2 rounded-lg bg-purple-50 text-purple-900 text-[11px] border border-purple-200 flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Queued for Area Coordinator (AC) review. Once approved, it will be forwarded to PU / GSD to issue a Purchase Order.</span>
                      </div>
                    )}

                    {req.status === 'APPROVED_BY_AC' && (
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-900 text-[11px] border border-blue-200 flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Approved by AC {req.ac_approver_name || ''}{req.ac_remarks ? `: "${req.ac_remarks}"` : ''}. Received by PU/GSD for Purchase Order generation.</span>
                      </div>
                    )}

                    {req.status === 'PO_ISSUED_BY_GSD' && (
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-900 text-[11px] border border-emerald-200 flex items-center space-x-2">
                        <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Purchase Order <strong>{req.po_number}</strong> issued by GSD! Track shipment in "Restock Arrival Acceptance".</span>
                      </div>
                    )}

                    {req.status === 'REJECTED_BY_AC' && (
                      <div className="p-2 rounded-lg bg-rose-50 text-rose-900 text-[11px] border border-rose-200 flex items-center space-x-2">
                        <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Declined by AC {req.ac_approver_name || ''}. Reason: "{req.ac_remarks || 'Not approved'}"</span>
                      </div>
                    )}

                    {req.reason && (
                      <div className="text-[11px] text-slate-500 italic">
                        "Reason: {req.reason}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowRestockHistoryModal(false);
                  handleOpenRestock();
                }}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Restock Request</span>
              </button>

              <button
                onClick={() => setShowRestockHistoryModal(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
