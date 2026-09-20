import React, { useEffect, useState } from 'react';
import { HardwareRequest, UserRole, Warehouse } from '../types';
import { api } from '../services/api';
import {
  Truck,
  Building2,
  UserCheck,
  Package,
  Barcode,
  Clock,
  ArrowRight,
  CheckCircle2,
  X,
  XCircle,
  Search,
  Filter,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Layers,
  Calendar,
  Warehouse as WarehouseIcon,
  HelpCircle
} from 'lucide-react';

interface WarehouseDispatchViewProps {
  currentRole: UserRole;
  selectedWarehouseId: number;
  warehouses?: Warehouse[];
  onWarehouseChange?: (id: number) => void;
  onNavigateToTab?: (tab: string, meta?: any) => void;
}

type TabFilter = 'READY' | 'PENDING_AM' | 'IN_TRANSIT' | 'REJECTED' | 'ALL';

export const WarehouseDispatchView: React.FC<WarehouseDispatchViewProps> = ({
  currentRole,
  selectedWarehouseId,
  warehouses = [],
  onWarehouseChange,
  onNavigateToTab,
}) => {
  const [allRequests, setAllRequests] = useState<HardwareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTabFilter, setActiveTabFilter] = useState<TabFilter>('READY');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Dispatch modal
  const [activeRequest, setActiveRequest] = useState<HardwareRequest | null>(null);
  const [dispatchedBy, setDispatchedBy] = useState('Eduardo Ramos (Warehouse Lead)');
  const [carrierName, setCarrierName] = useState('Company Logistics Van');
  const [trackingNo, setTrackingNo] = useState('');
  const [serials, setSerials] = useState<Record<number, string>>({});

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await api.getRequests({
        warehouse_id: selectedWarehouseId > 0 ? selectedWarehouseId : undefined,
      });
      setAllRequests(data);
    } catch (e: any) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Failed to load stock requests for warehouse' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [selectedWarehouseId]);

  // Derived counts for monitoring
  const readyRequests = allRequests.filter((r) => r.status === 'APPROVED');
  const pendingAcRequests = allRequests.filter((r) => r.status === 'PENDING_AM_APPROVAL');
  const inTransitRequests = allRequests.filter((r) => r.status === 'IN_TRANSIT');
  const rejectedRequests = allRequests.filter((r) => r.status === 'REJECTED');
  const arrivedRequests = allRequests.filter((r) => r.status === 'ARRIVED_AND_ACCEPTED');

  // Filtered requests based on active tab and search
  const filteredRequests = allRequests.filter((req) => {
    // Tab filter
    if (activeTabFilter === 'READY' && req.status !== 'APPROVED') return false;
    if (activeTabFilter === 'PENDING_AM' && req.status !== 'PENDING_AM_APPROVAL') return false;
    if (activeTabFilter === 'IN_TRANSIT' && req.status !== 'IN_TRANSIT') return false;
    if (activeTabFilter === 'REJECTED' && req.status !== 'REJECTED') return false;

    // Type filter
    if (typeFilter !== 'ALL' && req.request_type !== typeFilter) return false;

    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNo = req.request_no.toLowerCase().includes(q);
      const matchBranch = req.branch_name?.toLowerCase().includes(q);
      const matchRecipient = req.recipient_name.toLowerCase().includes(q);
      const matchAC = req.area_manager_name?.toLowerCase().includes(q) || req.am_approver_name?.toLowerCase().includes(q);
      const matchItem = req.items?.some(
        (it) => it.hardware_name?.toLowerCase().includes(q) || it.sku?.toLowerCase().includes(q)
      );
      if (!matchNo && !matchBranch && !matchRecipient && !matchAC && !matchItem) return false;
    }

    return true;
  });

  const handleOpenDispatch = (req: HardwareRequest) => {
    setActiveRequest(req);
    setTrackingNo(`TRK-${Date.now().toString().slice(-6)}`);
    const initialSerials: Record<number, string> = {};
    req.items?.forEach((it) => {
      initialSerials[it.id] = `SN-${it.sku || 'HW'}-${Math.floor(10000 + Math.random() * 90000)}`;
    });
    setSerials(initialSerials);
  };

  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;

    try {
      await api.dispatchRequest(activeRequest.id, {
        dispatched_by: dispatchedBy,
        carrier_name: carrierName,
        tracking_no: trackingNo,
        item_serials: serials,
      });

      setFeedback({
        type: 'success',
        message: `Hardware for ${activeRequest.request_no} successfully dispatched to ${activeRequest.branch_name}! Warehouse stock deducted and movement ledger recorded.`,
      });

      setActiveRequest(null);
      loadRequests();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Dispatch failed' });
    }
  };

  const currentWh = warehouses.find((w) => w.id === selectedWarehouseId);

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

      {/* Header & Warehouse Switcher */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-600">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900">
                Warehouse Stock Requests & Dispatch Queue
              </h1>
              {currentWh && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {currentWh.code} - {currentWh.name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitor incoming branch stock requests, track Area Coordinator (AC) approval status, and pack & dispatch approved orders.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          {currentRole === 'ADMIN' && warehouses.length > 1 && onWarehouseChange ? (
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500 font-medium">Warehouse:</span>
              <select
                value={selectedWarehouseId}
                onChange={(e) => onWarehouseChange(Number(e.target.value))}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.code} - {wh.name}
                  </option>
                ))}
              </select>
            </div>
          ) : currentWh ? (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
              <WarehouseIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>{currentWh.code} - {currentWh.name}</span>
            </div>
          ) : null}

          <button
            onClick={loadRequests}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            title="Refresh Requisitions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* AC Approval Status & Workflow Monitoring KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Ready for Dispatch */}
        <div
          onClick={() => setActiveTabFilter('READY')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTabFilter === 'READY'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-emerald-800 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ready for Dispatch</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              AC Approved
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">{readyRequests.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Requisitions approved by Area Coordinator ready for packing & shipment.
          </p>
        </div>

        {/* Pending AC Approval Monitoring */}
        <div
          onClick={() => setActiveTabFilter('PENDING_AM')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTabFilter === 'PENDING_AM'
              ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-purple-50/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-purple-800 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>Awaiting AC Approval</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 animate-pulse">
              Monitoring
            </span>
          </div>
          <div className="text-2xl font-black text-purple-900">{pendingAcRequests.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Branch requests pending Area Coordinator review before warehouse can fulfill.
          </p>
        </div>

        {/* In-Transit Shipments */}
        <div
          onClick={() => setActiveTabFilter('IN_TRANSIT')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTabFilter === 'IN_TRANSIT'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-blue-800 flex items-center space-x-1">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>In-Transit Shipments</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
              On Road
            </span>
          </div>
          <div className="text-2xl font-black text-blue-900">{inTransitRequests.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Dispatched orders currently with carrier awaiting branch confirmation.
          </p>
        </div>

        {/* Rejected by AC */}
        <div
          onClick={() => setActiveTabFilter('REJECTED')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTabFilter === 'REJECTED'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-rose-200 hover:bg-rose-50/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-rose-800 flex items-center space-x-1">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Declined by AC</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
              Rejected
            </span>
          </div>
          <div className="text-2xl font-black text-rose-900">{rejectedRequests.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Stock requisitions declined by Area Coordinator with recorded remarks.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTabFilter('READY')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              activeTabFilter === 'READY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready for Dispatch ({readyRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTabFilter('PENDING_AM')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              activeTabFilter === 'PENDING_AM'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>⏳ Pending AC Approval ({pendingAcRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTabFilter('IN_TRANSIT')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              activeTabFilter === 'IN_TRANSIT'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>In-Transit ({inTransitRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTabFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              activeTabFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Declined by AC ({rejectedRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTabFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
              activeTabFilter === 'ALL'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Requests ({allRequests.length})
          </button>
        </div>

        {/* Search & Request Type */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search req #, branch, item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          >
            <option value="ALL">All Types</option>
            <option value="PERMANENT">Permanent Stock</option>
            <option value="REPLACEMENT">Device Replacement</option>
            <option value="BORROW">Borrow Unit</option>
          </select>
        </div>
      </div>

      {/* Request Cards Grid */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          {activeTabFilter === 'READY' ? (
            <>
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Dispatch Queue is Clear</h3>
              <p className="text-xs text-slate-500">No approved orders currently waiting for warehouse fulfillment.</p>
              {pendingAcRequests.length > 0 && (
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTabFilter('PENDING_AM')}
                    className="text-purple-600 hover:text-purple-700 font-semibold text-xs inline-flex items-center space-x-1 cursor-pointer"
                  >
                    <span>View {pendingAcRequests.length} request(s) awaiting AC approval</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          ) : activeTabFilter === 'PENDING_AM' ? (
            <>
              <Clock className="w-10 h-10 text-purple-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Pending AC Approvals</h3>
              <p className="text-xs text-slate-500">There are no incoming branch requests awaiting Area Coordinator review.</p>
            </>
          ) : (
            <>
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Requisitions Found</h3>
              <p className="text-xs text-slate-500">No requests match the selected tab and filter criteria.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => {
            const isApproved = req.status === 'APPROVED';
            const isPendingAc = req.status === 'PENDING_AM_APPROVAL';
            const isRejected = req.status === 'REJECTED';
            const isInTransit = req.status === 'IN_TRANSIT';
            const isArrived = req.status === 'ARRIVED_AND_ACCEPTED';

            return (
              <div
                key={req.id}
                className={`bg-white rounded-xl border p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3.5 ${
                  isApproved
                    ? 'border-emerald-200'
                    : isPendingAc
                    ? 'border-purple-200 bg-gradient-to-b from-purple-50/20 to-white'
                    : isRejected
                    ? 'border-rose-200'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top Bar: Request No, Type, and AC Status */}
                  <div className="flex items-start justify-between pb-2 border-b border-slate-100 gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-blue-600 text-sm">{req.request_no}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {req.request_type}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Submitted {new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* AC Status Badge */}
                    <div>
                      {isApproved && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          AC Approved
                        </span>
                      )}
                      {isPendingAc && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 animate-pulse">
                          <Clock className="w-3 h-3 mr-1" />
                          ⏳ Awaiting AC Review
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle className="w-3 h-3 mr-1" />
                          Declined by AC
                        </span>
                      )}
                      {isInTransit && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                          <Truck className="w-3 h-3 mr-1" />
                          In Transit
                        </span>
                      )}
                      {isArrived && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                          Arrived & Accepted
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AC Review Status Banner */}
                  <div className="mt-2.5">
                    {isPendingAc && (
                      <div className="p-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start space-x-2">
                        <Clock className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">
                            Monitoring Mode: Awaiting AC Decision
                          </span>
                          <span className="text-[11px] text-purple-700">
                            Assigned AC: <strong>{req.area_manager_name || 'Area Coordinator'}</strong>. Warehouse dispatch is locked until AC approval is granted.
                          </span>
                        </div>
                      </div>
                    )}

                    {isApproved && (
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">
                            Approved by AC: {req.am_approver_name || req.area_manager_name || 'Area Coordinator'}
                          </span>
                          <span className="text-[11px] text-emerald-700">
                            {req.am_remarks ? `Remarks: "${req.am_remarks}"` : 'Order authorized for warehouse picking and dispatch.'}
                          </span>
                        </div>
                      </div>
                    )}

                    {isRejected && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start space-x-2">
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">
                            Declined by AC: {req.am_approver_name || 'Area Coordinator'}
                          </span>
                          <span className="text-[11px] text-rose-700">
                            Reason: "{req.am_remarks || 'Requisition denied by Area Manager'}"
                          </span>
                        </div>
                      </div>
                    )}

                    {isInTransit && (
                      <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start space-x-2">
                        <Truck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">
                            Dispatched via {req.carrier_name || 'Carrier'}
                          </span>
                          <span className="text-[11px] text-blue-700">
                            Waybill/Tracking: <strong>{req.tracking_no || 'N/A'}</strong> • Shipped by {req.dispatched_by || 'Warehouse Team'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Destination Branch & Recipient Details */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-medium block">Destination Branch:</span>
                      <div className="font-bold text-slate-800 flex items-center space-x-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{req.branch_name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {req.branch_area} • {req.branch_region}
                      </span>
                    </div>

                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-medium block">Recipient Custodian:</span>
                      <div className="font-bold text-slate-800 flex items-center space-x-1 mt-0.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{req.recipient_name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {req.recipient_role} {req.recipient_id ? `(${req.recipient_id})` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Business Purpose */}
                  {req.purpose && (
                    <div className="mt-2 text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded border border-slate-100">
                      <span className="font-semibold text-slate-700">Reason:</span> {req.purpose}
                    </div>
                  )}

                  {/* Items to Pack / Deliver */}
                  <div className="mt-3">
                    <span className="text-[11px] font-bold text-slate-700 block mb-1">Requested Hardware Items:</span>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {req.items?.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded border border-slate-200"
                        >
                          <div>
                            <div className="font-semibold text-slate-900">{it.hardware_name}</div>
                            <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                              <span>{it.category_name}</span>
                              <span>•</span>
                              <span className="font-mono">{it.sku}</span>
                            </div>
                          </div>
                          <span className="font-bold text-slate-800 px-2 py-0.5 bg-slate-200 rounded">
                            {it.quantity} units
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[10px] text-slate-400">
                    Warehouse: {req.warehouse_name || currentWh?.name || 'Assigned WH'}
                  </div>

                  <div>
                    {isApproved && (
                      <button
                        onClick={() => handleOpenDispatch(req)}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Pack & Dispatch Order</span>
                      </button>
                    )}

                    {isPendingAc && (
                      <span className="text-[11px] text-purple-700 font-semibold bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 inline-flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Awaiting AC Approval</span>
                      </span>
                    )}

                    {isRejected && (
                      <span className="text-[11px] text-rose-700 font-semibold bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 inline-flex items-center space-x-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Order Rejected by AC</span>
                      </span>
                    )}

                    {isInTransit && (
                      <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 inline-flex items-center space-x-1">
                        <Truck className="w-3.5 h-3.5" />
                        <span>Shipped (Waybill: {req.tracking_no})</span>
                      </span>
                    )}

                    {isArrived && (
                      <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 inline-flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Delivered & Closed</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dispatch Modal */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 text-xs">
            <div className="p-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-amber-100" />
                <h3 className="font-bold text-sm">Dispatch Order: {activeRequest.request_no}</h3>
              </div>
              <button onClick={() => setActiveRequest(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="p-5 space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Warehouse Dispatcher *</label>
                <input
                  type="text"
                  required
                  value={dispatchedBy}
                  onChange={(e) => setDispatchedBy(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Carrier / Logistics *</label>
                  <input
                    type="text"
                    required
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    placeholder="e.g. LBC, J&T, Company Van"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Waybill / Tracking # *</label>
                  <input
                    type="text"
                    required
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs uppercase"
                  />
                </div>
              </div>

              {/* Serial numbers assignment */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Serial Number(s) Tagging</label>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {activeRequest.items?.map((it) => (
                    <div key={it.id} className="p-2 bg-slate-50 rounded border border-slate-200">
                      <div className="text-[11px] font-semibold text-slate-800 mb-1">
                        {it.hardware_name} ({it.quantity} pcs)
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. SN-10023, SN-10024"
                        value={serials[it.id] || ''}
                        onChange={(e) => setSerials({ ...serials, [it.id]: e.target.value })}
                        className="w-full p-1.5 bg-white border border-slate-200 rounded font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px]">
                Confirming dispatch will deduct the quantities from the warehouse stock and mark the shipment as <strong>In Transit</strong> to {activeRequest.branch_name}.
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveRequest(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  Confirm & Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
