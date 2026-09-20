import React, { useEffect, useState } from 'react';
import { DashboardSummary, UserRole } from '../types';
import { api } from '../services/api';
import {
  AlertTriangle,
  CheckCircle2,
  PackageX,
  Warehouse as WarehouseIcon,
  Building2,
  Cpu,
  Clock,
  Truck,
  ArrowUpRight,
  PlusCircle,
  ShieldCheck,
  Package,
  Layers,
  Plus
} from 'lucide-react';

interface DashboardViewProps {
  currentRole: UserRole;
  onNavigate: (tab: string, meta?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ currentRole, onNavigate }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [urgentRestockAlerts, setUrgentRestockAlerts] = useState<any[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboard();
      setSummary(data.summary);
      setUrgentRestockAlerts(data.urgentRestockAlerts);
      setLowStockAlerts(data.lowStockAlerts);
    } catch (e) {
      console.error('Error fetching dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-500 font-medium">Loading hardware network telemetry...</span>
        </div>
      </div>
    );
  }

  const isGsd = currentRole === 'GSD' || currentRole === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Setup Warehouses Prompt Banner when 0 warehouses exist */}
      {summary.warehouseCount === 0 && (
        <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 border-2 border-amber-400/80 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-amber-600 text-white shadow-md shadow-amber-500/25 shrink-0">
              <WarehouseIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Setup Company Warehouses</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                All mock warehouses have been cleared. Register your company's actual distribution hubs in the Directory to start tracking hardware stock.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('directory')}
            className="flex items-center space-x-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Open Warehouses Directory</span>
          </button>
        </div>
      )}

      {/* Top Banner Notice for GSD (Purchasing Stock Replenishment) */}
      {isGsd && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-orange-500/10 border border-amber-300/60 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-rose-600 text-white shadow-md shadow-rose-500/20">
              <PackageX className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-base">GSD Stock Depletion Monitor</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                  {summary.outOfStockCount} Out-of-Stock Items
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                  {summary.lowStockCount} Low-Stock Alerts
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Purchasing/GSD is responsible for stock replenishment. Monitor depletion levels across all regional warehouses and initiate POs before branches experience fulfillment delays.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onNavigate('gsd-replenishment')}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Replenishment (PO)</span>
            </button>
            <button
              onClick={() => onNavigate('stock')}
              className="flex items-center space-x-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium shadow-sm transition"
            >
              <span>View Stock Grid</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Banner Notice for Area Managers (AC) - Approvals Queue Alert */}
      {currentRole === 'AC' && summary.pendingApprovals > 0 && (
        <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-300/60 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-purple-600 text-white shadow-md shadow-purple-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-base">Area Manager Requisition Queue</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                  {summary.pendingApprovals} Pending Approval{summary.pendingApprovals > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Branches in your area have submitted hardware requisitions awaiting Area Manager endorsement before warehouse dispatch.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onNavigate('approvals')}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Review Approvals Queue</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Stock */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Units Stocked</span>
            <Cpu className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.totalUnitsOnHand.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Across {summary.warehouseCount} warehouses</div>
        </div>

        {/* Out of Stock Alert (Red) */}
        <div 
          onClick={() => onNavigate('stock', { filter: 'OUT_OF_STOCK' })}
          className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-bold">Out of Stock (🔴)</span>
            <PackageX className="w-4 h-4 text-rose-600 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-rose-700">{summary.outOfStockCount}</div>
          <div className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center">
            <span>Needs Urgent Restock</span>
            <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </div>
        </div>

        {/* Low Stock Alert (Yellow) */}
        <div 
          onClick={() => onNavigate('stock', { filter: 'LOW_STOCK' })}
          className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-xs font-bold">Low Stock (🟡)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800">{summary.lowStockCount}</div>
          <div className="text-[11px] text-amber-700 mt-1 font-semibold flex items-center">
            <span>Below Par Level</span>
            <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </div>
        </div>

        {/* Pending AM Approvals */}
        <div 
          onClick={() => onNavigate('approvals')}
          className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-purple-700 mb-2">
            <span className="text-xs font-bold">Pending AM Review</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">{summary.pendingApprovals}</div>
          <div className="text-[11px] text-purple-600 mt-1 font-semibold flex items-center">
            <span>Area Manager Queue</span>
            <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </div>
        </div>

        {/* In-Transit to Branches */}
        <div 
          onClick={() => onNavigate('branch-acceptance')}
          className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-xs font-bold">In-Transit to Branch</span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">{summary.inTransitToBranches}</div>
          <div className="text-[11px] text-blue-600 mt-1 font-semibold flex items-center">
            <span>Awaiting Arrival Date</span>
            <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </div>
        </div>

        {/* Active Borrow Orders */}
        <div 
          onClick={() => onNavigate('requests', { request_type: 'BORROW' })}
          className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-indigo-700 mb-2">
            <span className="text-xs font-bold">Active Borrows</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700">{summary.activeBorrows}</div>
          <div className="text-[11px] text-indigo-600 mt-1 font-semibold flex items-center">
            <span>Temporary Equipment</span>
            <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </div>
        </div>
      </div>

      {/* Main Content Split: Out of Stock Attention Table & Workflow Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Urgent Restock Alerts for GSD & AC */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
              <h2 className="text-sm font-bold text-slate-800">Critical Stock Depletion Table</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Auto-refreshed par monitor</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Warehouse</th>
                  <th className="py-2.5 px-3">Hardware Item</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Available Stock</th>
                  <th className="py-2.5 px-3 text-center">Min Threshold</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {urgentRestockAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      No warehouses currently have 0 units. All inventory levels optimal!
                    </td>
                  </tr>
                ) : (
                  urgentRestockAlerts.slice(0, 7).map((item) => (
                    <tr key={item.stock_id} className="hover:bg-rose-50/40 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{item.warehouse_code}</div>
                        <div className="text-[10px] text-slate-500">{item.warehouse_name}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900">{item.hardware_name}</div>
                        <div className="text-[10px] text-slate-500">{item.brand} • {item.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {item.category_name}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                          0 Units (OUT)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                        {item.min_threshold} units
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isGsd ? (
                          <button
                            onClick={() => onNavigate('gsd-replenishment', { warehouse_id: item.warehouse_id, hardware_id: item.hardware_id })}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold transition shadow-sm"
                          >
                            Restock PO
                          </button>
                        ) : (
                          <button
                            onClick={() => onNavigate('stock', { warehouse_id: item.warehouse_id })}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
                          >
                            View Stock
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {urgentRestockAlerts.length > 7 && (
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => onNavigate('stock', { filter: 'OUT_OF_STOCK' })}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center space-x-1"
              >
                <span>View all {urgentRestockAlerts.length} depleted items in Stock Grid</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Action Workflows & Network Quick Stats */}
        <div className="space-y-4">
          {/* Quick Action Cards */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Role Workflows
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => onNavigate('requests')}
                className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">IT Branch Requisition</div>
                    <div className="text-[11px] text-slate-500">Submit hardware or borrow order</div>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
              </button>

              <button
                onClick={() => onNavigate('approvals')}
                className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Area Manager Approvals</div>
                    <div className="text-[11px] text-slate-500">{summary.pendingApprovals} pending AM review</div>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600" />
              </button>

              <button
                onClick={() => onNavigate('branch-acceptance')}
                className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Branch Delivery Acceptance</div>
                    <div className="text-[11px] text-slate-500">Record arrival date & time</div>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
              </button>

              <button
                onClick={() => onNavigate('warehouse-replenishment')}
                className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Warehouse Restock Acceptance</div>
                    <div className="text-[11px] text-slate-500">Accept GSD PO & generate report</div>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
              </button>
            </div>
          </div>

          {/* Network Footprint */}
          <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Distribution Network
            </h2>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <WarehouseIcon className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <div className="text-xl font-bold">{summary.warehouseCount}</div>
                <div className="text-[10px] text-slate-400">Warehouses Active</div>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <Building2 className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <div className="text-xl font-bold">{summary.branchCount}</div>
                <div className="text-[10px] text-slate-400">Connected Branches</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Catalog Hardware Items:</span>
              <span className="font-semibold text-slate-200">{summary.catalogCount} Models</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
