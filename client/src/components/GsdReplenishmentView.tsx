import React, { useState, useEffect } from 'react';
import {
  Replenishment,
  Warehouse,
  Branch,
  HardwareCatalogItem,
  UserRole,
  WarehouseRestockRequest,
  AppUser
} from '../types';
import { api } from '../services/api';
import {
  Package,
  PlusCircle,
  Truck,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PackageX,
  FileText,
  Search,
  CheckCheck,
  Printer,
  X,
  Zap,
  Warehouse as WarehouseIcon,
  TrendingDown,
  Send,
  ShieldCheck
} from 'lucide-react';

interface GsdReplenishmentViewProps {
  currentRole: UserRole;
  currentUser?: AppUser | null;
  warehouses: Warehouse[];
  branches: Branch[];
  preselectedWarehouseId?: number;
  preselectedHardwareId?: number;
}

export const GsdReplenishmentView: React.FC<GsdReplenishmentViewProps> = ({
  currentRole: _currentRole,
  currentUser,
  warehouses,
  branches,
  preselectedWarehouseId,
  preselectedHardwareId
}) => {
  const [replenishments, setReplenishments] = useState<Replenishment[]>([]);
  const [catalog, setCatalog] = useState<HardwareCatalogItem[]>([]);
  const [approvedRestockRequests, setApprovedRestockRequests] = useState<WarehouseRestockRequest[]>([]);
  const [activeRestockRequestId, setActiveRestockRequestId] = useState<number | null>(null);
  const [activeRestockRequestMeta, setActiveRestockRequestMeta] = useState<WarehouseRestockRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetWhId, setTargetWhId] = useState<number>(preselectedWarehouseId || warehouses[0]?.id || 1);
  const [destinationBranchId, setDestinationBranchId] = useState<number | null>(null);
  const [staffName, setStaffName] = useState(
    currentUser?.full_name || 'Carla Mendoza (Purchasing/GSD Lead)'
  );
  const [supplierName, setSupplierName] = useState('Direct Tech Distribution Inc.');
  const [estArrival, setEstArrival] = useState('');
  const [items, setItems] = useState<{ hardware_id: number; quantity: number }[]>([
    { hardware_id: preselectedHardwareId || 1, quantity: 10 }
  ]);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [reportData, setReportData] = useState<{ report: Replenishment; items: any[] } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [repList, catData, approvedReqs] = await Promise.all([
        api.getReplenishments(),
        api.getCatalog(),
        api.getWarehouseRestockRequests({ status: 'APPROVED_BY_AC' })
      ]);
      setReplenishments(repList);
      setCatalog(catData.items);
      setApprovedRestockRequests(approvedReqs);
    } catch (e: any) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Failed to load replenishments' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (preselectedWarehouseId || preselectedHardwareId) {
      setTargetWhId(preselectedWarehouseId || 1);
      setItems([{ hardware_id: preselectedHardwareId || 1, quantity: 15 }]);
      setShowCreateModal(true);
    }
  }, [preselectedWarehouseId, preselectedHardwareId]);

  useEffect(() => {
    if (currentUser?.full_name) {
      setStaffName(currentUser.full_name);
    }
  }, [currentUser]);

  const handleAddItemRow = () => {
    setItems([...items, { hardware_id: catalog[0]?.id || 1, quantity: 10 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i: number) => i !== idx));
    }
  };

  const handleUpdateItemRow = (idx: number, field: 'hardware_id' | 'quantity', val: number) => {
    const next = [...items];
    next[idx][field] = val;
    setItems(next);
  };

  const handleIssuePoForRestock = (req: WarehouseRestockRequest) => {
    setActiveRestockRequestId(req.id);
    setActiveRestockRequestMeta(req);
    setTargetWhId(req.warehouse_id);
    setDestinationBranchId(null);
    setItems([{ hardware_id: req.hardware_id, quantity: req.requested_quantity }]);
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setActiveRestockRequestId(null);
    setActiveRestockRequestMeta(null);
  };

  const handleCreateReplenishment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createReplenishment({
        warehouse_id: targetWhId,
        destination_branch_id: destinationBranchId || undefined,
        gsd_staff_name: staffName,
        supplier_name: supplierName,
        estimated_arrival: estArrival || undefined,
        items,
        restock_request_id: activeRestockRequestId || undefined
      });

      setFeedback({
        type: 'success',
        message: `Replenishment order ${res.po_number} created and dispatched to warehouse! ${
          activeRestockRequestId
            ? 'Linked to AC-approved Warehouse Restock Request ' + activeRestockRequestMeta?.request_no + '.'
            : destinationBranchId
            ? 'Destination branch will confirm upon receipt.'
            : 'Warehouse will restock upon arrival.'
        }`
      });

      setShowCreateModal(false);
      setActiveRestockRequestId(null);
      setActiveRestockRequestMeta(null);
      setDestinationBranchId(null);
      loadData();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create replenishment' });
    }
  };

  const handleViewReport = async (repId: number) => {
    try {
      const rep = await api.getReplenishmentReport(repId);
      setReportData(rep);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Could not load replenishment report' });
    }
  };

  const filtered = replenishments.filter((r: Replenishment) => {
    const matchesSearch =
      r.po_number.toLowerCase().includes(search.toLowerCase()) ||
      r.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.warehouse_name && r.warehouse_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Feedback Toast */}
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

      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Purchasing & GSD Replenishment Center</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Purchasing / GSD monitors stock depletion, issues purchase orders, and dispatches hardware to warehouses.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Replenishment Order (PO)</span>
        </button>
      </div>

      {/* AC-Approved Warehouse Restock Requests Awaiting PO */}
      {approvedRestockRequests.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50/30 rounded-xl border-2 border-purple-300 p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-purple-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-purple-600 text-white rounded-lg shadow-xs">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black text-purple-950">
                    Approved Warehouse Restock Requests (Ready for PO Issuance)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-200 text-purple-900 animate-pulse">
                    {approvedRestockRequests.length} ACTION REQUIRED
                  </span>
                </div>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  These requests have been reviewed and authorized by the Area Coordinator (AC). Issue a Purchase Order (PO) to dispatch stock to the warehouse.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {approvedRestockRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-purple-200 p-3.5 shadow-xs hover:border-purple-400 hover:shadow-md transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="font-bold text-purple-700 text-xs">{req.request_no}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 uppercase">
                      {req.urgency}
                    </span>
                  </div>

                  <div className="mt-2 text-xs">
                    <div className="text-[10px] text-slate-400 font-medium">Destination Warehouse:</div>
                    <div className="font-bold text-slate-800 flex items-center space-x-1">
                      <WarehouseIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{req.warehouse_name}</span>
                    </div>
                  </div>

                  <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                    <div className="font-bold text-slate-900">{req.hardware_name}</div>
                    <div className="text-[11px] text-slate-500">
                      SKU: <span className="font-mono font-medium text-slate-700">{req.sku}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-500">Qty Needed:</span>
                      <span className="font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                        {req.requested_quantity} units
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Current WH Stock:</span>
                      <span className="font-bold text-rose-600">
                        {req.current_quantity_on_hand ?? 0} units
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-[10px] text-emerald-800 bg-emerald-50/70 p-1.5 rounded border border-emerald-200">
                    <div className="font-bold flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>AC Approved: {req.ac_approver_name}</span>
                    </div>
                    {req.ac_remarks && <div className="italic mt-0.5 opacity-90">"{req.ac_remarks}"</div>}
                  </div>
                </div>

                <button
                  onClick={() => handleIssuePoForRestock(req)}
                  className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>⚡ Issue PO for this Request</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search PO #, supplier, warehouse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
        >
          <option value="ALL">All Statuses</option>
          <option value="IN_TRANSIT">In Transit to Warehouse</option>
          <option value="ARRIVED_AND_ACCEPTED">Arrived & Accepted at WH</option>
        </select>
      </div>

      {/* Replenishment Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-3 px-3.5">PO Number & Date</th>
                <th className="py-3 px-3.5">Warehouse & Destination Branch</th>
                <th className="py-3 px-3.5">Supplier & GSD Officer</th>
                <th className="py-3 px-3.5">Hardware Restock Items</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Arrival & Confirmation Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No replenishment orders found.
                  </td>
                </tr>
              ) : (
                filtered.map((rep: Replenishment) => (
                  <tr key={rep.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-emerald-700">{rep.po_number}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{rep.created_at.slice(0, 10)}</div>
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900">{rep.warehouse_name}</div>
                      <div className="text-[10px] text-slate-500">{rep.warehouse_code} • {rep.warehouse_region}</div>
                      {rep.branch_name ? (
                        <div className="mt-1 inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Building2 className="w-3 h-3 text-blue-500" />
                          <span>For: {rep.branch_code} - {rep.branch_name}</span>
                        </div>
                      ) : (
                        <div className="mt-0.5 text-[10px] text-slate-400">General WH Inventory</div>
                      )}
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="font-medium text-slate-900">{rep.supplier_name}</div>
                      <div className="text-[10px] text-slate-500">Issued by: {rep.gsd_staff_name}</div>
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="space-y-1">
                        {rep.items?.map((it: any) => (
                          <div key={it.id} className="text-[11px] text-slate-800">
                            <span className="font-bold text-emerald-700">{it.quantity_ordered}x</span> {it.hardware_name}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      {rep.status === 'IN_TRANSIT' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                          <Truck className="w-3 h-3 mr-1" /> Shipped to WH
                        </span>
                      )}
                      {rep.status === 'ARRIVED_AT_WAREHOUSE' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 animate-pulse">
                          <Clock className="w-3 h-3 mr-1" /> At WH • Awaiting Branch
                        </span>
                      )}
                      {rep.status === 'BRANCH_CONFIRMED' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCheck className="w-3 h-3 mr-1" /> Confirmed by Branch
                        </span>
                      )}
                      {rep.status === 'ARRIVED_AND_ACCEPTED' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Accepted at WH
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      {rep.arrived_at && (
                        <div className="text-[11px]">
                          <div className="font-semibold text-slate-700">WH: {rep.arrived_at}</div>
                          <div className="text-[10px] text-slate-400">by {rep.warehouse_accepted_by}</div>
                        </div>
                      )}
                      {rep.branch_received_at && (
                        <div className="mt-1 text-[11px] text-emerald-700">
                          <div className="font-bold">Branch: {rep.branch_received_at}</div>
                          <div className="text-[10px] text-emerald-600">
                            by {rep.branch_confirmed_by} ({rep.branch_condition || 'GOOD'})
                          </div>
                        </div>
                      )}
                      {!rep.arrived_at && !rep.branch_received_at && (
                        <span className="text-amber-600 font-medium">Awaiting Arrival</span>
                      )}
                      {rep.arrived_at && (
                        <div className="mt-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewReport(rep.id)}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold border border-slate-200 transition"
                          >
                            <Printer className="w-3 h-3 text-slate-500" />
                            <span>Arrival Slip</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Replenishment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 text-xs">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="font-bold text-sm">Issue Purchasing / GSD Replenishment Order</h3>
                  {activeRestockRequestMeta && (
                    <div className="text-[10px] text-emerald-100">
                      Fulfilling Request {activeRestockRequestMeta.request_no} (AC Approved)
                    </div>
                  )}
                </div>
              </div>
              <button onClick={handleCloseCreateModal} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReplenishment} className="p-5 space-y-3.5">
              {/* Linked AC-Approved Restock Request Notice */}
              {activeRestockRequestMeta && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-purple-900 flex items-start justify-between">
                  <div>
                    <div className="font-bold flex items-center space-x-1.5">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span>Fulfilling Warehouse Restock Requisition {activeRestockRequestMeta.request_no}</span>
                    </div>
                    <div className="text-[11px] text-purple-700 mt-0.5">
                      Authorized by AC: <span className="font-semibold">{activeRestockRequestMeta.ac_approver_name}</span>
                      {activeRestockRequestMeta.ac_remarks && <span> — "{activeRestockRequestMeta.ac_remarks}"</span>}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-200/80 rounded text-[10px] font-black text-purple-900 uppercase">
                    {activeRestockRequestMeta.urgency}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Warehouse *</label>
                  <select
                    value={targetWhId}
                    onChange={(e) => setTargetWhId(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.code} - {wh.name} ({wh.region})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Destination Branch <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={destinationBranchId || 0}
                    onChange={(e) => setDestinationBranchId(Number(e.target.value) || null)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-medium"
                  >
                    <option value={0}>General Warehouse Stock (No branch)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name} ({b.region})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier / Vendor *</label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    placeholder="e.g. Direct Tech Distribution Inc."
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchasing Officer Name *</label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Estimated Arrival Date</label>
                <input
                  type="date"
                  value={estArrival}
                  onChange={(e) => setEstArrival(e.target.value)}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">Hardware to Restock</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold text-xs flex items-center space-x-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map((it: { hardware_id: number; quantity: number }, idx: number) => (
                    <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <select
                        value={it.hardware_id}
                        onChange={(e) => handleUpdateItemRow(idx, 'hardware_id', Number(e.target.value))}
                        className="flex-1 p-1.5 bg-white border border-slate-200 rounded text-xs"
                      >
                        {catalog.map((c: HardwareCatalogItem) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.sku})
                          </option>
                        ))}
                      </select>

                      <div className="w-24 flex items-center space-x-1">
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={it.quantity}
                          onChange={(e) => handleUpdateItemRow(idx, 'quantity', Number(e.target.value))}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded text-center font-bold text-xs"
                        />
                        <span className="text-[10px] text-slate-500">pcs</span>
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition cursor-pointer flex items-center space-x-1.5"
                >
                  <span>{activeRestockRequestMeta ? 'Dispatch PO & Fulfill Restock' : 'Dispatch PO to Warehouse'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Report Modal */}
      {reportData && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Goods Arrival & Branch Acceptance Report</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Official Report</span>
                </button>
                <button onClick={() => setReportData(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 text-xs text-slate-800" id="printable-report">
              {/* Report Header */}
              <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                    Hardware Stock Replenishment & Branch Acceptance Slip
                  </h2>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Official 3-Way Chain of Custody (Purchasing/GSD → Warehouse → Branch Destination)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-700">{reportData.report.po_number}</div>
                  <div className="text-[10px] text-slate-400">PO Date: {reportData.report.created_at?.slice(0, 10)}</div>
                </div>
              </div>

              {/* 3-Way Chain of Custody Info Card */}
              <div className={`grid ${reportData.report.destination_branch_id ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'} gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200`}>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">1. Sourcing & Origin:</span>
                  <div className="font-bold text-slate-900 text-xs">{reportData.report.supplier_name}</div>
                  <div className="text-slate-600 text-[11px] mt-0.5">Officer: {reportData.report.gsd_staff_name}</div>
                  <div className="text-slate-500 text-[10px] mt-0.5">PO Date: {reportData.report.created_at?.slice(0, 10)}</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">2. Receiving Warehouse:</span>
                  <div className="font-bold text-slate-900 text-xs">{reportData.report.warehouse_name} ({reportData.report.warehouse_code})</div>
                  <div className="text-slate-600 text-[11px] mt-0.5">{reportData.report.warehouse_address}</div>
                  <div className="text-emerald-700 font-semibold text-[10px] mt-0.5">
                    Arrived: {reportData.report.arrived_at || 'In Transit'}
                  </div>
                  <div className="text-slate-500 text-[10px]">Accepted by: {reportData.report.warehouse_accepted_by || '—'}</div>
                </div>

                {reportData.report.destination_branch_id && (
                  <div className="bg-blue-50/70 p-2.5 rounded border border-blue-100">
                    <span className="text-[10px] font-bold uppercase text-blue-700 block mb-1">3. Destination Branch:</span>
                    <div className="font-bold text-slate-900 text-xs">{reportData.report.branch_name} ({reportData.report.branch_code})</div>
                    <div className="text-slate-600 text-[10px] mt-0.5">{reportData.report.branch_region} • {reportData.report.branch_address}</div>
                    {reportData.report.status === 'BRANCH_CONFIRMED' ? (
                      <div className="mt-1.5 pt-1.5 border-t border-blue-200/60 space-y-0.5">
                        <div className="text-emerald-700 font-bold text-[10px]">
                          Received: {reportData.report.branch_received_at}
                        </div>
                        <div className="text-slate-700 text-[10px]">
                          Confirmed by: <strong>{reportData.report.branch_confirmed_by}</strong>
                        </div>
                        <div className="text-slate-600 text-[10px]">
                          Condition: <span className="font-semibold text-emerald-800 bg-emerald-100 px-1 rounded">{reportData.report.branch_condition || 'GOOD'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1.5 text-amber-700 text-[10px] font-medium bg-amber-50 p-1 rounded border border-amber-200">
                        Pending delivery & branch confirmation
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Hardware Items Table */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Replenished Hardware Items</h3>
                <table className="w-full text-left border border-slate-200 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                      <th className="p-2">Item Description & Specifications</th>
                      <th className="p-2">Category</th>
                      <th className="p-2 text-center">Qty Ordered</th>
                      <th className="p-2 text-center">Qty Received</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.items?.map((it: any) => (
                      <tr key={it.id}>
                        <td className="p-2">
                          <div className="font-bold text-slate-900">{it.hardware_name}</div>
                          <div className="text-[10px] text-slate-500">{it.sku} • {it.brand} {it.model}</div>
                        </td>
                        <td className="p-2 text-slate-600">{it.category_name}</td>
                        <td className="p-2 text-center font-medium">{it.quantity_ordered}</td>
                        <td className="p-2 text-center font-bold text-emerald-700">{it.quantity_received}</td>
                        <td className="p-2 text-center">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Restocked
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Remarks */}
              <div className={`grid ${reportData.report.destination_branch_id ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-3`}>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-0.5">Warehouse Receiving Notes:</span>
                  <span className="text-slate-600">{reportData.report.arrival_remarks || 'Shipment inspected and verified.'}</span>
                </div>
                {reportData.report.destination_branch_id && (
                  <div className="p-3 bg-blue-50/40 rounded border border-blue-200">
                    <span className="font-bold text-blue-900 block mb-0.5">Destination Branch Remarks:</span>
                    <span className="text-slate-700">
                      {reportData.report.branch_remarks || (reportData.report.status === 'BRANCH_CONFIRMED' ? 'Verified in good condition.' : 'Awaiting physical delivery receipt.')}
                    </span>
                  </div>
                )}
              </div>

              {/* Sign-off Blocks */}
              <div className={`grid ${reportData.report.destination_branch_id ? 'grid-cols-3' : 'grid-cols-2'} gap-6 pt-6 border-t border-slate-200 text-center`}>
                <div>
                  <div className="border-b border-slate-400 pb-1 mb-1 font-bold text-slate-900 text-xs">
                    {reportData.report.warehouse_accepted_by || '____________________'}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Warehouse Custodian (Received)</span>
                  {reportData.report.arrived_at && (
                    <div className="text-[9px] text-slate-400 mt-0.5">{reportData.report.arrived_at}</div>
                  )}
                </div>

                {reportData.report.destination_branch_id && (
                  <div>
                    <div className="border-b border-slate-400 pb-1 mb-1 font-bold text-slate-900 text-xs">
                      {reportData.report.branch_confirmed_by || '____________________'}
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Branch Custodian (Accepted)</span>
                    {reportData.report.branch_received_at ? (
                      <div className="text-[9px] text-emerald-600 font-medium mt-0.5">{reportData.report.branch_received_at}</div>
                    ) : (
                      <div className="text-[9px] text-amber-600 mt-0.5">Pending Delivery</div>
                    )}
                  </div>
                )}

                <div>
                  <div className="border-b border-slate-400 pb-1 mb-1 font-bold text-slate-900 text-xs">
                    {reportData.report.gsd_staff_name || '____________________'}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Purchasing / GSD Head (Acknowledged)</span>
                  <div className="text-[9px] text-slate-400 mt-0.5">{reportData.report.created_at?.slice(0, 10)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
