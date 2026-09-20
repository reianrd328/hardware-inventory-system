import React, { useEffect, useState } from 'react';
import {
  HardwareRequest,
  Branch,
  Warehouse,
  HardwareCatalogItem,
  UserRole
} from '../types';
import { api } from '../services/api';
import {
  PlusCircle,
  Search,
  Filter,
  FileText,
  UserCheck,
  Building2,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Warehouse as WarehouseIcon,
  X
} from 'lucide-react';

interface RequisitionsViewProps {
  currentRole: UserRole;
  branches: Branch[];
  warehouses: Warehouse[];
  initialTypeFilter?: string;
  onNavigateToTab?: (tab: string, meta?: any) => void;
}

export const RequisitionsView: React.FC<RequisitionsViewProps> = ({
  currentRole,
  branches,
  warehouses,
  initialTypeFilter,
  onNavigateToTab
}) => {
  const [requests, setRequests] = useState<HardwareRequest[]>([]);
  const [catalog, setCatalog] = useState<HardwareCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter || 'ALL');

  // Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [formType, setFormType] = useState<'PERMANENT' | 'REPLACEMENT' | 'BORROW'>('PERMANENT');
  const [formBranchId, setFormBranchId] = useState<number>(branches[0]?.id || 1);
  const [formWarehouseId, setFormWarehouseId] = useState<number>(warehouses[0]?.id || 1);
  const [formRequesterName, setFormRequesterName] = useState('Alex Reyes (IT Field Specialist)');
  const [formRecipientName, setFormRecipientName] = useState('');
  const [formRecipientRole, setFormRecipientRole] = useState('Branch Operations Head');
  const [formRecipientId, setFormRecipientId] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formReturnDate, setFormReturnDate] = useState('');
  
  // Dynamic Items in Request
  const [requestItems, setRequestItems] = useState<{ hardware_id: number; quantity: number }[]>([
    { hardware_id: 1, quantity: 1 }
  ]);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await api.getRequests();
      setRequests(data);

      const catData = await api.getCatalog();
      setCatalog(catData.items);
    } catch (e: any) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Failed to load requests' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAddItemRow = () => {
    setRequestItems([...requestItems, { hardware_id: catalog[0]?.id || 1, quantity: 1 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (requestItems.length > 1) {
      setRequestItems(requestItems.filter((_, i) => i !== idx));
    }
  };

  const handleUpdateItemRow = (idx: number, field: 'hardware_id' | 'quantity', val: number) => {
    const next = [...requestItems];
    next[idx][field] = val;
    setRequestItems(next);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRecipientName.trim()) {
      setFeedback({ type: 'error', message: 'Please specify who will receive the item (Recipient Name).' });
      return;
    }
    if (!formPurpose.trim()) {
      setFeedback({ type: 'error', message: 'Please specify the business justification/purpose.' });
      return;
    }

    try {
      const res = await api.createRequest({
        request_type: formType,
        branch_id: formBranchId,
        warehouse_id: formWarehouseId,
        requester_name: formRequesterName,
        requester_role: 'Senior IT Field Engineer',
        recipient_name: formRecipientName,
        recipient_role: formRecipientRole,
        recipient_id: formRecipientId,
        purpose: formPurpose,
        borrow_expected_return_date: formType === 'BORROW' ? formReturnDate : undefined,
        items: requestItems
      });

      setFeedback({
        type: 'success',
        message: `Hardware requisition ${res.request_no} created successfully! Notifications sent to Area Manager (AC) for approval & GSD.`
      });
      setShowNewModal(false);
      // Reset form
      setFormRecipientName('');
      setFormPurpose('');
      loadRequests();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit request' });
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.request_no.toLowerCase().includes(search.toLowerCase()) ||
      r.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.branch_name && r.branch_name.toLowerCase().includes(search.toLowerCase())) ||
      (r.warehouse_name && r.warehouse_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || r.request_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_AM_APPROVAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Clock className="w-3 h-3 mr-1" /> Pending AM Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <ShieldCheck className="w-3 h-3 mr-1" /> Approved (Ready for WH)
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
            <Truck className="w-3 h-3 mr-1" /> In Transit to Branch
          </span>
        );
      case 'ARRIVED_AND_ACCEPTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Arrived & Accepted
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 mr-1" /> Rejected by AM
          </span>
        );
      default:
        return <span className="text-slate-500">{status}</span>;
    }
  };

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

      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Branch Requisitions & Equipment Borrowing</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record recipient custodian ("who gets the item"), destination branch, AM approvals, and monitor delivery arrival.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Requisition / Borrow Order</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search request #, branch, recipient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_AM_APPROVAL">Pending AM Approval</option>
            <option value="APPROVED">Approved (Ready for WH)</option>
            <option value="IN_TRANSIT">In Transit to Branch</option>
            <option value="ARRIVED_AND_ACCEPTED">Arrived & Accepted</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Request Types</option>
            <option value="PERMANENT">Permanent Deployment</option>
            <option value="REPLACEMENT">Defective Replacement</option>
            <option value="BORROW">Temporary Borrow</option>
          </select>
        </div>
      </div>

      {/* Requests Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-3 px-3.5">Req # & Date</th>
                <th className="py-3 px-3.5">Destination Branch</th>
                <th className="py-3 px-3.5">Recipient Custodian ("Who Get")</th>
                <th className="py-3 px-3.5">Hardware Items</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Acceptance Date/Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No requisitions found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition">
                    {/* Req # & Type */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-blue-600">{req.request_no}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        <span className={`px-1.5 py-0.2 rounded font-semibold ${
                          req.request_type === 'BORROW'
                            ? 'bg-indigo-100 text-indigo-700'
                            : req.request_type === 'REPLACEMENT'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {req.request_type}
                        </span>
                        <span className="ml-1.5">{req.created_at.slice(0, 10)}</span>
                      </div>
                    </td>

                    {/* Destination Branch */}
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900 flex items-center space-x-1">
                        <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{req.branch_name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Source WH: {req.warehouse_code} • AM: {req.area_manager_name}
                      </div>
                    </td>

                    {/* Recipient Details */}
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900 flex items-center space-x-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{req.recipient_name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {req.recipient_role} {req.recipient_id ? `(${req.recipient_id})` : ''}
                      </div>
                    </td>

                    {/* Items Requested */}
                    <td className="py-3 px-3.5">
                      <div className="space-y-1">
                        {req.items?.map((it) => (
                          <div key={it.id} className="text-[11px] text-slate-800">
                            <span className="font-bold text-slate-900">{it.quantity}x</span> {it.hardware_name}
                            {it.serial_numbers && (
                              <span className="block text-[10px] font-mono text-slate-500">
                                SN: {it.serial_numbers}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      {getStatusBadge(req.status)}
                    </td>

                    {/* Arrival Acceptance Timestamp */}
                    <td className="py-3 px-3.5 text-right">
                      {req.branch_arrived_at ? (
                        <div>
                          <div className="font-semibold text-emerald-700">
                            {req.branch_arrived_at}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Accepted by: {req.branch_accepted_by} ({req.branch_condition})
                          </div>
                        </div>
                      ) : req.status === 'IN_TRANSIT' ? (
                        <div>
                          <span className="text-amber-600 font-semibold">En Route to Branch</span>
                          <div className="text-[10px] text-slate-400">Trk: {req.tracking_no || 'Pending'}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not yet delivered</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Requisition Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Create Branch Hardware Requisition / Borrow Order</h3>
              </div>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-5 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
              {/* Type of Request */}
              <div className="grid grid-cols-3 gap-2">
                {(['PERMANENT', 'REPLACEMENT', 'BORROW'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormType(t)}
                    className={`p-2 rounded-lg border text-center font-bold transition ${
                      formType === t
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {t === 'PERMANENT' && 'New Deployment'}
                    {t === 'REPLACEMENT' && 'Defective Replacement'}
                    {t === 'BORROW' && 'Temporary Borrow'}
                  </button>
                ))}
              </div>

              {/* Branch Destination (Searchable from 112 branches) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destination Branch (100+ Branches) *</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.region})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Source Warehouse (22 Warehouses) *</label>
                  <select
                    value={formWarehouseId}
                    onChange={(e) => setFormWarehouseId(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} - {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recipient Details ("Who get the item") */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>Item Recipient / Branch Custodian Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Recipient Name ("Who gets it") *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maria Santos"
                      value={formRecipientName}
                      onChange={(e) => setFormRecipientName(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Designation / Role *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Branch Teller"
                      value={formRecipientRole}
                      onChange={(e) => setFormRecipientRole(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Employee ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. EMP-9921"
                      value={formRecipientId}
                      onChange={(e) => setFormRecipientId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* If Borrow: Expected Return Date */}
              {formType === 'BORROW' && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div className="flex-1">
                    <label className="block font-semibold text-slate-800 mb-0.5">Expected Return Date *</label>
                    <input
                      type="date"
                      required
                      value={formReturnDate}
                      onChange={(e) => setFormReturnDate(e.target.value)}
                      className="p-1.5 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Purpose / Justification */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Business Purpose / Reason *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Teller Counter 3 CPU motherboard failure. Urgent replacement required for customer servicing."
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">Requested Hardware Items</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-blue-600 hover:text-blue-700 font-semibold text-xs flex items-center space-x-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Another Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {requestItems.map((itemRow, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <select
                        value={itemRow.hardware_id}
                        onChange={(e) => handleUpdateItemRow(idx, 'hardware_id', Number(e.target.value))}
                        className="flex-1 p-1.5 bg-white border border-slate-200 rounded text-xs"
                      >
                        {catalog.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.sku})
                          </option>
                        ))}
                      </select>

                      <div className="w-24 flex items-center space-x-1">
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={itemRow.quantity}
                          onChange={(e) => handleUpdateItemRow(idx, 'quantity', Number(e.target.value))}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded text-center font-bold text-xs"
                        />
                        <span className="text-[10px] text-slate-500">pcs</span>
                      </div>

                      {requestItems.length > 1 && (
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

              {/* Notice about AC & GSD Notification */}
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px]">
                <strong>Notification Alert:</strong> Submitting this request immediately notifies the assigned <strong>Area Manager (AC)</strong> for approval and sends a requisition alert to <strong>Purchasing / GSD</strong>.
              </div>

              {/* Submit */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Submit & Notify AC & GSD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
