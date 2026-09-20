import React, { useEffect, useState } from 'react';
import { HardwareRequest, UserRole, WarehouseRestockRequest, AppUser } from '../types';
import { api } from '../services/api';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  UserCheck,
  Cpu,
  AlertCircle,
  MessageSquare,
  X,
  Warehouse as WarehouseIcon,
  Package,
  ArrowRight,
  Truck,
  TrendingDown,
  Layers,
  Send
} from 'lucide-react';

interface ApprovalsViewProps {
  currentRole: UserRole;
  currentUser?: AppUser | null;
  onNavigateToDispatch?: () => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({ currentRole, currentUser, onNavigateToDispatch }) => {
  const [activeTab, setActiveTab] = useState<'branch' | 'warehouse_restock'>('warehouse_restock');
  const [requests, setRequests] = useState<HardwareRequest[]>([]);
  const [warehouseRestockRequests, setWarehouseRestockRequests] = useState<WarehouseRestockRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Approval action modal for branch request
  const [activeRequest, setActiveRequest] = useState<HardwareRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [remarks, setRemarks] = useState('');
  const [approverName, setApproverName] = useState(
    currentUser?.full_name || 'Roberto "Bob" Valenzuela (Area Coordinator)'
  );

  // Approval action modal for warehouse restock request
  const [activeRestockReq, setActiveRestockReq] = useState<WarehouseRestockRequest | null>(null);
  const [restockReviewAction, setRestockReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [restockRemarks, setRestockRemarks] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadPending = async () => {
    try {
      setLoading(true);
      const [branchData, restockData] = await Promise.all([
        api.getRequests({ status: 'PENDING_AM_APPROVAL' }),
        api.getWarehouseRestockRequests({ status: 'PENDING_AC_APPROVAL' }),
      ]);
      setRequests(branchData);
      setWarehouseRestockRequests(restockData);
    } catch (e: any) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Failed to load pending approvals' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  useEffect(() => {
    if (currentUser?.full_name) {
      setApproverName(currentUser.full_name);
    }
  }, [currentUser]);

  const handleOpenReview = (req: HardwareRequest, action: 'APPROVE' | 'REJECT') => {
    setActiveRequest(req);
    setReviewAction(action);
    setRemarks(action === 'APPROVE' ? 'Approved for branch deployment.' : 'Request rejected.');
  };

  const handleOpenRestockReview = (req: WarehouseRestockRequest, action: 'APPROVE' | 'REJECT') => {
    setActiveRestockReq(req);
    setRestockReviewAction(action);
    setRestockRemarks(
      action === 'APPROVE'
        ? 'Approved stock replenishment. Forwarded to PU / GSD for Purchase Order issuance.'
        : 'Stock replenishment request rejected.'
    );
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;

    try {
      await api.reviewRequest(activeRequest.id, {
        action: reviewAction,
        approver_name: approverName,
        remarks: remarks,
      });

      setFeedback({
        type: 'success',
        message: `Requisition ${activeRequest.request_no} has been ${
          reviewAction === 'APPROVE' ? 'APPROVED and forwarded to Warehouse for dispatch' : 'REJECTED'
        }!`,
      });

      setActiveRequest(null);
      loadPending();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Review failed' });
    }
  };

  const handleSubmitRestockReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestockReq) return;

    try {
      await api.reviewWarehouseRestockRequest(activeRestockReq.id, {
        action: restockReviewAction,
        approver_name: approverName,
        remarks: restockRemarks,
      });

      setFeedback({
        type: 'success',
        message: `Warehouse Restock Requisition ${activeRestockReq.request_no} has been ${
          restockReviewAction === 'APPROVE'
            ? 'APPROVED and automatically routed to PU / GSD for Purchase Order issuance'
            : 'REJECTED'
        }!`,
      });

      setActiveRestockReq(null);
      loadPending();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Restock review failed' });
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
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

      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Area Coordinator (AC) Approvals Portal</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and authorize warehouse restock requests before they route to PU/GSD, and approve branch hardware deployments.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
            <span>{warehouseRestockRequests.length + requests.length} Total Pending</span>
          </div>
        </div>
      </div>

      {/* Segmented Queue Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('warehouse_restock')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'warehouse_restock'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <WarehouseIcon className="w-3.5 h-3.5" />
          <span>Warehouse Restock Requests (to PU / GSD)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'warehouse_restock'
                ? 'bg-purple-800 text-purple-100'
                : 'bg-purple-100 text-purple-800'
            }`}
          >
            {warehouseRestockRequests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('branch')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'branch'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Branch Requisitions (to Warehouse)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'branch'
                ? 'bg-purple-800 text-purple-100'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {requests.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Warehouse Restock Requests to PU / GSD */}
      {activeTab === 'warehouse_restock' && (
        <div>
          {warehouseRestockRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">All Warehouse Restock Requests Reviewed!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                When a regional warehouse has out-of-stock items (such as CPUs) and submits a restock request, it will appear here for your approval before being routed to PU / GSD.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {warehouseRestockRequests.map((req) => {
                const isOutOfStock = (req.current_quantity_on_hand ?? 0) <= 0;
                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-xl border border-purple-200/70 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>

                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-purple-700 text-sm tracking-wide">{req.request_no}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border uppercase ${getUrgencyBadge(req.urgency)}`}>
                            {req.urgency} Urgency
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {req.created_at.slice(0, 16)}
                        </span>
                      </div>

                      {/* Origin Warehouse & Requester */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-medium block">Source Warehouse:</span>
                          <div className="font-bold text-slate-800 flex items-center space-x-1">
                            <WarehouseIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="truncate">{req.warehouse_name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">{req.warehouse_code} • {req.warehouse_region}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-medium block">Requested By:</span>
                          <div className="font-bold text-slate-800 flex items-center space-x-1">
                            <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span className="truncate">{req.requested_by}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">Warehouse Custodian</span>
                        </div>
                      </div>

                      {/* Requested Hardware Info */}
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                              {req.category_name || 'Hardware Item'}
                            </span>
                            <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5 mt-0.5">
                              <Cpu className="w-4 h-4 text-purple-600 shrink-0" />
                              <span>{req.hardware_name}</span>
                            </h4>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              SKU: <span className="font-mono font-semibold text-slate-700">{req.sku}</span>
                              {req.model_chassis && <span> • Model: {req.model_chassis}</span>}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Requested</span>
                            <span className="text-sm font-black text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded border border-purple-200 inline-block mt-0.5">
                              {req.requested_quantity} units
                            </span>
                          </div>
                        </div>

                        {/* Current WH Stock Depletion Badge */}
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Current Warehouse Stock:</span>
                          {isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 flex items-center space-x-1">
                              <TrendingDown className="w-3 h-3" />
                              <span>0 UNITS (DEPLETED)</span>
                            </span>
                          ) : (
                            <span className="font-bold text-amber-700 text-xs">
                              {req.current_quantity_on_hand} units remaining
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Justification / Reason */}
                      <div className="mt-3 p-2.5 bg-purple-50/50 rounded-lg text-xs text-slate-700 border border-purple-100">
                        <span className="font-bold text-purple-900 block mb-0.5">Warehouse Justification / Reason:</span>
                        <p className="italic text-slate-800">{req.reason || 'Restock required to satisfy pending branch requests.'}</p>
                      </div>

                      {/* Routing Note */}
                      <div className="mt-2 text-[11px] text-slate-500 flex items-center space-x-1">
                        <Send className="w-3 h-3 text-purple-500 shrink-0" />
                        <span>Upon approval, forwarded directly to PU / GSD for Purchase Order issuance.</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleOpenRestockReview(req, 'REJECT')}
                        className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleOpenRestockReview(req, 'APPROVE')}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Approve & Forward to PU/GSD</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Branch Requisitions to Warehouse */}
      {activeTab === 'branch' && (
        <div>
          {requests.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Queue is Clear!</h3>
              <p className="text-xs text-slate-500 mt-1">All branch hardware requisitions have been reviewed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  {/* Header Info */}
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-blue-600 text-sm">{req.request_no}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {req.request_type}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {req.created_at.slice(0, 16)}
                      </span>
                    </div>

                    {/* Branch & Requester Info */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Target Branch:</span>
                        <div className="font-bold text-slate-800 flex items-center space-x-1">
                          <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate">{req.branch_name}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Recipient ("Who Get"):</span>
                        <div className="font-bold text-slate-800 flex items-center space-x-1">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{req.recipient_name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{req.recipient_role}</span>
                      </div>
                    </div>

                    {/* Purpose */}
                    <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-xs text-slate-700">
                      <span className="font-semibold text-slate-900 block mb-0.5">Purpose / Reason:</span>
                      {req.purpose}
                    </div>

                    {/* Requested Hardware Items */}
                    <div className="mt-3">
                      <span className="text-[11px] font-bold text-slate-700 block mb-1">Items Requested:</span>
                      <div className="space-y-1">
                        {req.items?.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between text-xs p-1.5 bg-blue-50/40 rounded border border-blue-100"
                          >
                            <span className="font-medium text-slate-800">{it.hardware_name}</span>
                            <span className="font-bold text-blue-700 px-2 py-0.5 bg-blue-100 rounded text-[11px]">
                              {it.quantity} units
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleOpenReview(req, 'REJECT')}
                      className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleOpenReview(req, 'APPROVE')}
                      className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Approve Requisition</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Modal for Branch Requisitions */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 text-xs">
            <div
              className={`p-4 text-white flex items-center justify-between ${
                reviewAction === 'APPROVE' ? 'bg-purple-700' : 'bg-rose-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                {reviewAction === 'APPROVE' ? (
                  <ShieldCheck className="w-5 h-5 text-purple-200" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-200" />
                )}
                <h3 className="font-bold text-sm">
                  {reviewAction === 'APPROVE' ? 'Approve' : 'Reject'} Branch Requisition {activeRequest.request_no}
                </h3>
              </div>
              <button onClick={() => setActiveRequest(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-5 space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Area Coordinator / Reviewer Name</label>
                <input
                  type="text"
                  required
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {reviewAction === 'APPROVE' ? 'Approval Remarks / Instructions' : 'Rejection Reason *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks..."
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveRequest(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-white font-semibold rounded-lg shadow-sm ${
                    reviewAction === 'APPROVE'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirm {reviewAction === 'APPROVE' ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal for Warehouse Restock Requests */}
      {activeRestockReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 text-xs">
            <div
              className={`p-4 text-white flex items-center justify-between ${
                restockReviewAction === 'APPROVE' ? 'bg-purple-700' : 'bg-rose-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                {restockReviewAction === 'APPROVE' ? (
                  <ShieldCheck className="w-5 h-5 text-purple-200" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-200" />
                )}
                <div>
                  <h3 className="font-bold text-sm">
                    {restockReviewAction === 'APPROVE' ? 'Authorize Restock Request' : 'Reject Restock Request'}
                  </h3>
                  <div className="text-[11px] opacity-80">{activeRestockReq.request_no} • {activeRestockReq.warehouse_name}</div>
                </div>
              </div>
              <button onClick={() => setActiveRestockReq(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRestockReview} className="p-5 space-y-3">
              <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-200 space-y-1">
                <div className="font-bold text-purple-900">{activeRestockReq.hardware_name}</div>
                <div className="text-[11px] text-slate-600">
                  Requested Quantity: <span className="font-bold text-purple-800">{activeRestockReq.requested_quantity} units</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Warehouse Stock: <span className="font-bold text-rose-700">{activeRestockReq.current_quantity_on_hand ?? 0} units</span>
                </div>
                <div className="text-[11px] text-slate-600 italic">
                  "{activeRestockReq.reason || 'No reason provided'}"
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Area Coordinator / Reviewer Name</label>
                <input
                  type="text"
                  required
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {restockReviewAction === 'APPROVE' ? 'Approval Remarks & Endorsement for PU/GSD' : 'Rejection Reason *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={restockRemarks}
                  onChange={(e) => setRestockRemarks(e.target.value)}
                  placeholder="Enter endorsement remarks for Purchasing / GSD..."
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {restockReviewAction === 'APPROVE' && (
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 text-[11px] flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>Approving will immediately notify PU & GSD and queue this order for PO issuance.</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveRestockReq(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-white font-semibold rounded-lg shadow-sm ${
                    restockReviewAction === 'APPROVE'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {restockReviewAction === 'APPROVE' ? 'Confirm & Send to PU/GSD' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
