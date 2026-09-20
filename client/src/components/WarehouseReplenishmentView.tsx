import React, { useEffect, useState } from 'react';
import { Replenishment, Warehouse, UserRole } from '../types';
import { api } from '../services/api';
import {
  FileCheck,
  CheckCircle2,
  Clock,
  Truck,
  Printer,
  FileText,
  Warehouse as WarehouseIcon,
  Package,
  X
} from 'lucide-react';

interface WarehouseReplenishmentViewProps {
  currentRole: UserRole;
  selectedWarehouseId: number;
}

export const WarehouseReplenishmentView: React.FC<WarehouseReplenishmentViewProps> = ({
  currentRole,
  selectedWarehouseId,
}) => {
  const [replenishments, setReplenishments] = useState<Replenishment[]>([]);
  const [loading, setLoading] = useState(true);

  // Acceptance Modal
  const [activeRep, setActiveRep] = useState<Replenishment | null>(null);
  const [receiverName, setReceiverName] = useState('Danilo Dizon (Warehouse Head)');
  const [arrivedAt, setArrivedAt] = useState('');
  const [remarks, setRemarks] = useState('All cartons sealed and verified against Supplier Delivery Receipt.');
  const [itemQuantities, setItemQuantities] = useState<Record<number, number>>({});

  // Printable Report Modal
  const [reportData, setReportData] = useState<any | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Format current local time to datetime-local string (YYYY-MM-DDTHH:mm)
  const getNowLocalDateTime = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  const loadReplenishments = async () => {
    try {
      setLoading(true);
      const data = await api.getReplenishments({
        warehouse_id: selectedWarehouseId > 0 ? selectedWarehouseId : undefined,
      });
      setReplenishments(data);
    } catch (e: any) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Failed to load replenishments' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReplenishments();
  }, [selectedWarehouseId]);

  const handleOpenAcceptance = (rep: Replenishment) => {
    setActiveRep(rep);
    setArrivedAt(getNowLocalDateTime());
    const initialQtys: Record<number, number> = {};
    rep.items?.forEach((it) => {
      initialQtys[it.id] = it.quantity_ordered;
    });
    setItemQuantities(initialQtys);
  };

  const handleConfirmAcceptance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRep) return;

    try {
      const formattedArrival = arrivedAt.replace('T', ' ') + ':00';
      const received_items = Object.keys(itemQuantities).map((itemId) => ({
        item_id: Number(itemId),
        quantity_received: Number(itemQuantities[Number(itemId)]),
      }));

      await api.warehouseAcceptReplenishment(activeRep.id, {
        arrived_at: formattedArrival,
        warehouse_accepted_by: receiverName,
        arrival_remarks: remarks,
        received_items,
      });

      setFeedback({
        type: 'success',
        message: `Replenishment ${activeRep.po_number} goods verified and accepted! Exact arrival timestamp recorded (${formattedArrival}) and warehouse stock replenished.`,
      });

      // Load report directly
      handleViewReport(activeRep.id);

      setActiveRep(null);
      loadReplenishments();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Acceptance failed' });
    }
  };

  const handleViewReport = async (repId: number) => {
    try {
      const report = await api.getReplenishmentReport(repId);
      setReportData(report);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Could not load arrival report' });
    }
  };

  const pendingAcceptance = replenishments.filter((r) => r.status === 'IN_TRANSIT');
  const acceptedList = replenishments.filter((r) => r.status !== 'IN_TRANSIT' && r.status !== 'PENDING_SHIPMENT');

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
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-600">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Warehouse Replenishment Acceptance & Arrival Reports</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect incoming restock shipments from GSD, record exact arrival date & time, update warehouse stock, and print arrival reports.
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          {pendingAcceptance.length} Awaiting Warehouse Arrival
        </div>
      </div>

      {/* SECTION 1: INCOMING SHIPMENTS AWAITING ACCEPTANCE */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Truck className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-800">
            Incoming Replenishments In-Transit ({pendingAcceptance.length})
          </h2>
        </div>

        {pendingAcceptance.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No incoming replenishment shipments currently in transit to this warehouse.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingAcceptance.map((rep) => (
              <div
                key={rep.id}
                className="bg-white rounded-xl border-2 border-emerald-200 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                    <span className="font-bold text-emerald-700">{rep.po_number}</span>
                    <span className="text-[11px] text-slate-500">Shipped: {rep.shipped_at?.slice(0, 16)}</span>
                  </div>

                  <div className="mt-2 text-xs space-y-1">
                    <div className="font-bold text-slate-800 flex items-center space-x-1">
                      <WarehouseIcon className="w-3.5 h-3.5 text-amber-500" />
                      <span>{rep.warehouse_name} ({rep.warehouse_code})</span>
                    </div>
                    {rep.branch_name && (
                      <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <span>Destination Branch: {rep.branch_code} - {rep.branch_name}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-600">
                      <strong>Supplier:</strong> {rep.supplier_name}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <strong>Issued by:</strong> {rep.gsd_staff_name}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-xs space-y-1">
                    <span className="font-semibold text-slate-700 block text-[11px]">Restock Items in Shipment:</span>
                    {rep.items?.map((it) => (
                      <div key={it.id} className="flex justify-between text-slate-800">
                        <span>{it.hardware_name}</span>
                        <span className="font-bold text-emerald-700">{it.quantity_ordered} units</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Accept Button */}
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleOpenAcceptance(rep)}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept Replenishment at WH</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: ACCEPTED REPLENISHMENTS & GOODS ARRIVAL REPORTS */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-800">
            Accepted Replenishment Goods Receipts & Arrival Reports ({acceptedList.length})
          </h2>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-2.5 px-3">PO Number</th>
                  <th className="py-2.5 px-3">Warehouse & Destination Branch</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">WH Arrival Date & Time</th>
                  <th className="py-2.5 px-3 text-center">Branch Status</th>
                  <th className="py-2.5 px-3 text-right">Arrival Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {acceptedList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No accepted replenishments logged yet.
                    </td>
                  </tr>
                ) : (
                  acceptedList.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-bold text-emerald-700">{rep.po_number}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800">{rep.warehouse_name}</div>
                        {rep.branch_name && (
                          <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
                            Branch: {rep.branch_code} - {rep.branch_name}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{rep.supplier_name}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-emerald-700 flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{rep.arrived_at}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">by {rep.warehouse_accepted_by}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {rep.branch_name ? (
                          rep.status === 'BRANCH_CONFIRMED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Branch Received
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 animate-pulse">
                              Awaiting Branch Receipt
                            </span>
                          )
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            General WH Stock
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleViewReport(rep.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View / Print Report</span>
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

      {/* Accept Replenishment Modal */}
      {activeRep && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 text-xs">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm">Accept Replenishment Stock: {activeRep.po_number}</h3>
              </div>
              <button onClick={() => setActiveRep(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAcceptance} className="p-5 space-y-3.5">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="font-bold text-emerald-900">{activeRep.warehouse_name}</div>
                <div className="text-[11px] text-emerald-700">Supplier: {activeRep.supplier_name}</div>
              </div>

              {/* Exact Arrival Date & Time */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Exact Replenishment Arrival Date & Time *</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={arrivedAt}
                  onChange={(e) => setArrivedAt(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Warehouse Receiving Officer *
                </label>
                <input
                  type="text"
                  required
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* Verify Quantities Received */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Verify Received Quantities (Auto-updates Warehouse Stock)
                </label>
                <div className="space-y-2">
                  {activeRep.items?.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{it.hardware_name}</div>
                        <div className="text-[10px] text-slate-500">Ordered: {it.quantity_ordered} pcs</div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] text-slate-500">Received:</span>
                        <input
                          type="number"
                          min="0"
                          max={it.quantity_ordered * 2}
                          value={itemQuantities[it.id] ?? it.quantity_ordered}
                          onChange={(e) =>
                            setItemQuantities({ ...itemQuantities, [it.id]: Number(e.target.value) })
                          }
                          className="w-16 p-1 bg-white border border-slate-300 rounded font-bold text-center text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Arrival Remarks</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
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
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Confirm Acceptance & Restock
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
                <h3 className="font-bold text-sm">Goods Arrival Receipt Report</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
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
                    Hardware Stock Replenishment Arrival Report
                  </h2>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Official Warehouse Stock Inward Inspection & Verification Slip
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-700">{reportData.report.po_number}</div>
                  <div className="text-[10px] text-slate-400">Date Issued: {reportData.report.created_at?.slice(0, 10)}</div>
                </div>
              </div>

              {/* Warehouse, Supplier & Destination Info */}
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
