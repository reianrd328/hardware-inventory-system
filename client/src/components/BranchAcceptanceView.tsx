import React, { useEffect, useState } from 'react';
import { HardwareRequest, Replenishment, Branch, UserRole } from '../types';
import { api } from '../services/api';
import {
  Building2,
  CheckCircle2,
  Clock,
  Truck,
  FileCheck,
  PackageCheck,
  Printer,
  CheckCheck,
  Boxes,
  FileText,
  X
} from 'lucide-react';

interface BranchAcceptanceViewProps {
  currentRole: UserRole;
  branches: Branch[];
}

export const BranchAcceptanceView: React.FC<BranchAcceptanceViewProps> = ({
  currentRole: _currentRole,
  branches,
}) => {
  // Navigation Subtabs
  const [activeTab, setActiveTab] = useState<'REQUISITIONS' | 'REPLENISHMENTS'>('REQUISITIONS');
  const [selectedBranchId, setSelectedBranchId] = useState<number>(0); // 0 = all branches

  // Requisitions Delivery State
  const [deliveries, setDeliveries] = useState<HardwareRequest[]>([]);
  const [loadingReq, setLoadingReq] = useState(true);
  const [activeDelivery, setActiveDelivery] = useState<HardwareRequest | null>(null);
  const [acceptedBy, setAcceptedBy] = useState('');
  const [arrivedAt, setArrivedAt] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [remarks, setRemarks] = useState('');

  // Replenishments Branch Confirmation State
  const [replenishments, setReplenishments] = useState<Replenishment[]>([]);
  const [loadingRep, setLoadingRep] = useState(true);
  const [activeRep, setActiveRep] = useState<Replenishment | null>(null);
  const [repConfirmedBy, setRepConfirmedBy] = useState('');
  const [repArrivedAt, setRepArrivedAt] = useState('');
  const [repCondition, setRepCondition] = useState('GOOD');
  const [repRemarks, setRepRemarks] = useState('');
  const [reportData, setReportData] = useState<{ report: Replenishment; items: any[] } | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Format current local time to datetime-local string (YYYY-MM-DDTHH:mm)
  const getNowLocalDateTime = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  const loadDeliveries = async () => {
    try {
      setLoadingReq(true);
      const data = await api.getRequests({
        branch_id: selectedBranchId > 0 ? selectedBranchId : undefined,
      });
      const relevant = data.filter((d) => d.status === 'IN_TRANSIT' || d.status === 'ARRIVED_AND_ACCEPTED');
      setDeliveries(relevant);
    } catch (e: any) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Failed to load branch deliveries' });
    } finally {
      setLoadingReq(false);
    }
  };

  const loadReplenishments = async () => {
    try {
      setLoadingRep(true);
      const data = await api.getReplenishments({
        branch_id: selectedBranchId > 0 ? selectedBranchId : undefined,
      });
      const forBranch = data.filter((r) => r.destination_branch_id != null);
      setReplenishments(forBranch);
    } catch (e: any) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Failed to load branch replenishments' });
    } finally {
      setLoadingRep(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
    loadReplenishments();
  }, [selectedBranchId]);

  // Handle Requisition Acceptance
  const handleOpenAcceptance = (delivery: HardwareRequest) => {
    setActiveDelivery(delivery);
    setAcceptedBy(delivery.recipient_name || 'Branch Head');
    setArrivedAt(getNowLocalDateTime());
    setCondition('GOOD');
    setRemarks('Hardware received in good physical condition. Tested with IT field staff.');
  };

  const handleConfirmAcceptance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDelivery) return;

    try {
      const formattedArrival = arrivedAt.replace('T', ' ') + ':00';
      await api.branchAcceptDelivery(activeDelivery.id, {
        branch_accepted_by: acceptedBy,
        branch_arrived_at: formattedArrival,
        branch_condition: condition,
        branch_remarks: remarks,
      });

      setFeedback({
        type: 'success',
        message: `Delivery acceptance recorded! Arrival datetime logged at ${formattedArrival}. Area Coordinator and GSD notified.`,
      });

      setActiveDelivery(null);
      loadDeliveries();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to record acceptance' });
    }
  };

  // Handle Replenishment Branch Confirmation
  const handleOpenRepConfirmation = (rep: Replenishment) => {
    setActiveRep(rep);
    const branchObj = branches.find((b) => b.id === rep.destination_branch_id);
    setRepConfirmedBy(branchObj?.contact_person || 'Branch Custodian');
    setRepArrivedAt(getNowLocalDateTime());
    setRepCondition('GOOD');
    setRepRemarks('Stock received and verified against warehouse delivery invoice. All quantities accounted for.');
  };

  const handleConfirmReplenishment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRep) return;

    try {
      const formattedArrival = repArrivedAt.replace('T', ' ') + ':00';
      await api.branchConfirmReplenishment(activeRep.id, {
        branch_received_at: formattedArrival,
        branch_confirmed_by: repConfirmedBy,
        branch_condition: repCondition,
        branch_remarks: repRemarks,
      });

      setFeedback({
        type: 'success',
        message: `Replenishment stock receipt confirmed for ${activeRep.po_number}! Arrival timestamp logged. Warehouse and Purchasing/GSD notified.`,
      });

      const repId = activeRep.id;
      setActiveRep(null);
      loadReplenishments();
      setTimeout(() => setFeedback(null), 5000);

      // Open printable report
      handleViewReport(repId);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to confirm replenishment receipt' });
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

  // Requisitions counts
  const inTransitReqs = deliveries.filter((d) => d.status === 'IN_TRANSIT');
  const acceptedReqs = deliveries.filter((d) => d.status === 'ARRIVED_AND_ACCEPTED');

  // Replenishments counts
  const pendingRepConfirmation = replenishments.filter((r) => r.status === 'ARRIVED_AT_WAREHOUSE');
  const confirmedReps = replenishments.filter((r) => r.status === 'BRANCH_CONFIRMED');
  const inTransitReps = replenishments.filter((r) => r.status === 'IN_TRANSIT');

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
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Branch Delivery & Stock Acceptance Portal</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirm physical arrival for both IT hardware requisitions and GSD warehouse stock replenishments across all 112 branches.
            </p>
          </div>
        </div>

        {/* Filter Branch */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-slate-600">Active Branch:</span>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(Number(e.target.value))}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg max-w-xs font-medium text-slate-800"
          >
            <option value={0}>All Branches (112 Branches)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} - {b.name} ({b.region})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subtab Switcher */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveTab('REQUISITIONS')}
          className={`py-3 px-4 text-xs font-bold flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'REQUISITIONS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>1. IT Requisitions Delivery Acceptance</span>
          {inTransitReqs.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 animate-pulse">
              {inTransitReqs.length} En Route
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('REPLENISHMENTS')}
          className={`py-3 px-4 text-xs font-bold flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'REPLENISHMENTS'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>2. GSD Replenishment Stock Acceptance</span>
          {pendingRepConfirmation.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 animate-pulse">
              {pendingRepConfirmation.length} Awaiting Receipt
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: IT REQUISITIONS DELIVERY ACCEPTANCE */}
      {/* ========================================================================= */}
      {activeTab === 'REQUISITIONS' && (
        <div className="space-y-5">
          {/* SECTION 1: INCOMING SHIPMENTS (AWAITING ACCEPTANCE) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-800">
                  Dispatched Requisitions En Route ({inTransitReqs.length})
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">
                Shipments dispatched by Warehouse Custodians to Branch
              </span>
            </div>

            {loadingReq ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                Loading requisitions deliveries...
              </div>
            ) : inTransitReqs.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                No requisition shipments currently in transit for the selected branch.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inTransitReqs.map((del) => (
                  <div
                    key={del.id}
                    className="bg-white rounded-xl border-2 border-amber-200 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-blue-600">{del.request_no}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                            In Transit
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Dispatched: {del.dispatched_at?.slice(0, 16) || 'Recently'}
                        </span>
                      </div>

                      <div className="mt-2 text-xs space-y-1">
                        <div className="font-bold text-slate-800 flex items-center space-x-1">
                          <Building2 className="w-3.5 h-3.5 text-blue-500" />
                          <span>{del.branch_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          <strong>Recipient:</strong> {del.recipient_name} ({del.recipient_role})
                        </div>
                        <div className="text-[11px] text-slate-600">
                          <strong>Carrier & Waybill:</strong> {del.carrier_name} • <span className="font-mono">{del.tracking_no}</span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-xs space-y-1">
                        <span className="font-semibold text-slate-700 block text-[11px]">En Route Hardware:</span>
                        {del.items?.map((it) => (
                          <div key={it.id} className="flex justify-between text-slate-800">
                            <span>{it.hardware_name}</span>
                            <span className="font-bold">{it.quantity} units</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Accept Button */}
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => handleOpenAcceptance(del)}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept Delivery at Branch</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: ACCEPTED & DELIVERED ARCHIVE */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-800">
                Delivered & Accepted Requisitions Archive ({acceptedReqs.length})
              </h2>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                      <th className="py-2.5 px-3">Req #</th>
                      <th className="py-2.5 px-3">Branch</th>
                      <th className="py-2.5 px-3">Recipient</th>
                      <th className="py-2.5 px-3">Exact Arrival Date & Time</th>
                      <th className="py-2.5 px-3">Accepted By & Condition</th>
                      <th className="py-2.5 px-3 text-right">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {acceptedReqs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          No accepted deliveries logged yet for this branch.
                        </td>
                      </tr>
                    ) : (
                      acceptedReqs.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-bold text-blue-600">
                            {req.request_no}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {req.branch_name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {req.recipient_name}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-emerald-700 flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{req.branch_arrived_at}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-900">{req.branch_accepted_by}</div>
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              req.branch_condition === 'GOOD'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {req.branch_condition}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500 text-[11px]">
                            {req.branch_remarks}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: GSD REPLENISHMENT STOCK ACCEPTANCE */}
      {/* ========================================================================= */}
      {activeTab === 'REPLENISHMENTS' && (
        <div className="space-y-5">
          {/* Status Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="p-2.5 bg-sky-50 rounded-lg text-sky-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900">{pendingRepConfirmation.length}</div>
                <div className="text-[11px] text-slate-500 font-medium">Ready for Branch Confirmation</div>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900">{inTransitReps.length}</div>
                <div className="text-[11px] text-slate-500 font-medium">En Route to Warehouse</div>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
                <CheckCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900">{confirmedReps.length}</div>
                <div className="text-[11px] text-slate-500 font-medium">Confirmed by Branch</div>
              </div>
            </div>
          </div>

          {/* SECTION 1: REPLENISHMENTS READY FOR BRANCH CONFIRMATION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Stock Replenishments Awaiting Branch Receipt ({pendingRepConfirmation.length})
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">
                Accepted by Warehouse Custodian • Ready for Branch Physical Verification
              </span>
            </div>

            {loadingRep ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                Loading replenishment shipments...
              </div>
            ) : pendingRepConfirmation.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                No replenishment shipments currently waiting for branch confirmation.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRepConfirmation.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-white rounded-xl border-2 border-sky-300 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-emerald-700">{rep.po_number}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 animate-pulse">
                            At Warehouse • Verify Receipt
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Dispatched: {rep.created_at?.slice(0, 10)}
                        </span>
                      </div>

                      <div className="mt-2 text-xs space-y-1">
                        <div className="font-bold text-slate-800 flex items-center space-x-1">
                          <Building2 className="w-3.5 h-3.5 text-blue-500" />
                          <span>Destination: {rep.branch_name} ({rep.branch_code})</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          <strong>Source Warehouse:</strong> {rep.warehouse_name} ({rep.warehouse_code})
                        </div>
                        <div className="text-[11px] text-slate-600">
                          <strong>Supplier:</strong> {rep.supplier_name} • Issued by {rep.gsd_staff_name}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-medium">
                          <strong>WH Arrival:</strong> {rep.arrived_at} (Accepted by {rep.warehouse_accepted_by})
                        </div>
                      </div>

                      {/* Items */}
                      <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-xs space-y-1">
                        <span className="font-semibold text-slate-700 block text-[11px]">Replenished Hardware:</span>
                        {rep.items?.map((it) => (
                          <div key={it.id} className="flex justify-between text-slate-800">
                            <span>{it.hardware_name}</span>
                            <span className="font-bold text-emerald-700">{it.quantity_ordered} units</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => handleViewReport(rep.id)}
                        className="text-[11px] text-slate-600 hover:text-slate-900 font-medium flex items-center space-x-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Warehouse Inward Slip</span>
                      </button>

                      <button
                        onClick={() => handleOpenRepConfirmation(rep)}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span>Confirm Stock Received at Branch</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: EN ROUTE TO WAREHOUSE (PIPELINE VISIBILITY) */}
          {inTransitReps.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-800">
                  En Route from Supplier to Warehouse Pipeline ({inTransitReps.length})
                </h2>
              </div>

              <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-3 text-xs space-y-2">
                <div className="text-amber-800 font-medium text-[11px]">
                  These replenishment orders are currently in transit from supplier to your regional warehouse. You will be prompted to confirm once received at the warehouse.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {inTransitReps.map((r) => (
                    <div key={r.id} className="bg-white p-2.5 rounded-lg border border-amber-200 flex justify-between items-center text-[11px]">
                      <div>
                        <span className="font-bold text-slate-900">{r.po_number}</span>
                        <div className="text-slate-500 text-[10px]">Destination: {r.branch_name} via {r.warehouse_code}</div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Supplier In Transit
                        </span>
                        <div className="text-slate-400 text-[10px]">Supplier: {r.supplier_name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: CONFIRMED & RECEIVED BY BRANCH ARCHIVE */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Confirmed Branch Replenishments Archive ({confirmedReps.length})
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">
                Complete 3-Stage Chain of Custody (Supplier → Warehouse → Branch)
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                      <th className="py-2.5 px-3">PO Number</th>
                      <th className="py-2.5 px-3">Destination Branch</th>
                      <th className="py-2.5 px-3">WH Arrived & Accepted</th>
                      <th className="py-2.5 px-3">Branch Received Date/Time</th>
                      <th className="py-2.5 px-3">Branch Receiver & Condition</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {confirmedReps.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          No confirmed branch replenishment receipts logged yet.
                        </td>
                      </tr>
                    ) : (
                      confirmedReps.map((rep) => (
                        <tr key={rep.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-bold text-emerald-700">
                            {rep.po_number}
                            <div className="text-[10px] text-slate-400 font-normal">{rep.supplier_name}</div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {rep.branch_name}
                            <div className="text-[10px] text-slate-500">{rep.branch_code} • {rep.branch_region}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-slate-800 font-medium">{rep.warehouse_name}</div>
                            <div className="text-[10px] text-slate-500">
                              {rep.arrived_at} by {rep.warehouse_accepted_by}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-emerald-700 flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{rep.branch_received_at}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-900">{rep.branch_confirmed_by}</div>
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              rep.branch_condition === 'GOOD'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {rep.branch_condition}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleViewReport(rep.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold inline-flex items-center space-x-1 transition"
                            >
                              <Printer className="w-3 h-3 text-slate-600" />
                              <span>Print Report</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REQUISITIONS ACCEPTANCE MODAL */}
      {/* ========================================================================= */}
      {activeDelivery && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 text-xs">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm">Accept Requisition Delivery: {activeDelivery.request_no}</h3>
              </div>
              <button onClick={() => setActiveDelivery(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAcceptance} className="p-5 space-y-3">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="font-bold text-emerald-900">{activeDelivery.branch_name}</div>
                <div className="text-[11px] text-emerald-700">
                  Carrier: {activeDelivery.carrier_name} • Tracking: {activeDelivery.tracking_no}
                </div>
              </div>

              {/* Exact Date & Time Arrived */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Exact Delivery Arrival Date & Time *</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={arrivedAt}
                  onChange={(e) => setArrivedAt(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-500">
                  Pre-filled with current system timestamp. You can adjust if recording an earlier arrival.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Received & Acknowledged By (Staff Name) *
                </label>
                <input
                  type="text"
                  required
                  value={acceptedBy}
                  onChange={(e) => setAcceptedBy(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Physical Condition Received *</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                >
                  <option value="GOOD">Good Condition - All seals & boxes intact</option>
                  <option value="DAMAGED_BOX_OK">Outer Box Damaged but Hardware Operable</option>
                  <option value="DAMAGED_REJECTED">Defective / Damaged in Transit</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Inspection Remarks / Serial Verification</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  placeholder="e.g. Verified serial numbers with delivery receipt..."
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveDelivery(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Confirm Arrival Acceptance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: GSD REPLENISHMENT BRANCH CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {activeRep && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 text-xs">
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCheck className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm">Confirm Stock Receipt: {activeRep.po_number}</h3>
              </div>
              <button onClick={() => setActiveRep(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReplenishment} className="p-5 space-y-3.5">
              {/* Routing Summary */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Destination Branch</span>
                    <div className="font-bold text-slate-900">{activeRep.branch_name} ({activeRep.branch_code})</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Restocked Via</span>
                    <div className="font-bold text-slate-800">{activeRep.warehouse_name}</div>
                  </div>
                </div>
                <div className="pt-1 text-[11px] text-slate-600 flex justify-between border-t border-slate-200/60">
                  <span>Supplier: <strong>{activeRep.supplier_name}</strong></span>
                  <span>WH Arrival: <strong>{activeRep.arrived_at}</strong></span>
                </div>
              </div>

              {/* Hardware Items Checklist */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Received Hardware Stock Items
                </label>
                <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200 max-h-36 overflow-y-auto">
                  {activeRep.items?.map((it) => (
                    <div key={it.id} className="p-2 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{it.hardware_name}</div>
                        <div className="text-[10px] text-slate-500">{it.sku} • {it.brand} {it.model}</div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                          {it.quantity_ordered} units
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exact Date & Time Arrived at Branch */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Exact Branch Arrival Date & Time *</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={repArrivedAt}
                  onChange={(e) => setRepArrivedAt(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
              </div>

              {/* Receiver Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Branch Receiver Staff Name *
                </label>
                <input
                  type="text"
                  required
                  value={repConfirmedBy}
                  onChange={(e) => setRepConfirmedBy(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  placeholder="e.g. Maria Clara Santos (Branch IT Custodian)"
                />
              </div>

              {/* Condition */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Physical Inspection Condition *</label>
                <select
                  value={repCondition}
                  onChange={(e) => setRepCondition(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                >
                  <option value="GOOD">Good Condition - Fully operational & complete packaging</option>
                  <option value="DAMAGED_BOX_OK">Outer Box Damaged but Hardware Tested Good</option>
                  <option value="DEFECTIVE_NEEDS_REPLACEMENT">Defective / Damaged in Transit (Flag for GSD)</option>
                </select>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Verification Remarks / Invoice Notes</label>
                <textarea
                  rows={2}
                  value={repRemarks}
                  onChange={(e) => setRepRemarks(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  placeholder="e.g. Inspected and verified stock count matching delivery documents..."
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveRep(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm flex items-center space-x-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Confirm Receipt of Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PRINTABLE 3-STAGE CHAIN OF CUSTODY REPORT MODAL */}
      {/* ========================================================================= */}
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
