import React, { useEffect, useState } from 'react';
import { StockMovement, Warehouse, UserRole } from '../types';
import { api } from '../services/api';
import {
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Download,
  Building2,
  Warehouse as WarehouseIcon,
  UserCheck,
  Filter
} from 'lucide-react';

interface MovementsAuditViewProps {
  currentRole: UserRole;
  warehouses: Warehouse[];
}

export const MovementsAuditView: React.FC<MovementsAuditViewProps> = ({
  currentRole,
  warehouses,
}) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedWhId, setSelectedWhId] = useState<number>(0);
  const [movementType, setMovementType] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const loadMovements = async () => {
    try {
      setLoading(true);
      const data = await api.getMovements({
        warehouse_id: selectedWhId > 0 ? selectedWhId : undefined,
        movement_type: movementType !== 'ALL' ? movementType : undefined,
        search: search || undefined,
        limit: 100,
      });
      setMovements(data);
    } catch (e) {
      console.error('Failed to load movements', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [selectedWhId, movementType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadMovements();
  };

  const exportCSV = () => {
    if (movements.length === 0) return;
    const headers = [
      'Date Time',
      'Movement Type',
      'Warehouse',
      'Destination Branch',
      'Hardware Item',
      'SKU',
      'Quantity',
      'Balance After',
      'Recipient ("Who Get")',
      'Reference No',
      'Performed By',
      'Notes'
    ];

    const rows = movements.map((m) => [
      `"${m.created_at}"`,
      `"${m.movement_type}"`,
      `"${m.warehouse_code} - ${m.warehouse_name}"`,
      `"${m.branch_name || 'N/A'}"`,
      `"${m.hardware_name}"`,
      `"${m.sku}"`,
      m.quantity,
      m.balance_after,
      `"${m.recipient_name || 'N/A'}"`,
      `"${m.reference_id || 'N/A'}"`,
      `"${m.performed_by}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stock_movements_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Incoming & Outgoing Stock Movements Ledger</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive chronological audit trail recording item dispatches, branch destinations, recipients, and replenishments.
            </p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Download className="w-4 h-4" />
          <span>Export Ledger to CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search item, recipient, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </form>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Movement Type */}
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Movement Types</option>
            <option value="OUT_DISPATCH">OUT: Dispatched to Branch</option>
            <option value="IN_REPLENISHMENT">IN: Restocked by GSD</option>
            <option value="IN_RETURN">IN: Returned Borrow</option>
            <option value="IN_ADJUSTMENT">IN: Inventory Adjustment</option>
            <option value="OUT_ADJUSTMENT">OUT: Inventory Adjustment</option>
          </select>

          {/* Warehouse */}
          <select
            value={selectedWhId}
            onChange={(e) => setSelectedWhId(Number(e.target.value))}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 max-w-[180px] truncate"
          >
            <option value={0}>All Warehouses</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.code} - {wh.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Warehouse</th>
                <th className="py-2.5 px-3">Hardware Item</th>
                <th className="py-2.5 px-3 text-center">Change</th>
                <th className="py-2.5 px-3 text-center">Balance</th>
                <th className="py-2.5 px-3">Branch & Recipient</th>
                <th className="py-2.5 px-3 text-right">Notes & Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No movement records found for the specified filters.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isOut = m.movement_type.startsWith('OUT');
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition">
                      {/* Timestamp */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                        {m.created_at}
                      </td>

                      {/* Movement Type Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isOut ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            <ArrowUpRight className="w-3 h-3 mr-0.5 text-rose-600" />
                            {m.movement_type.replace('OUT_', '')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <ArrowDownLeft className="w-3 h-3 mr-0.5 text-emerald-600" />
                            {m.movement_type.replace('IN_', '')}
                          </span>
                        )}
                      </td>

                      {/* Warehouse */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{m.warehouse_code}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{m.warehouse_name}</div>
                      </td>

                      {/* Item */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{m.hardware_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{m.sku}</div>
                      </td>

                      {/* Quantity change */}
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span className={isOut ? 'text-rose-600' : 'text-emerald-700'}>
                          {isOut ? `-${m.quantity}` : `+${m.quantity}`}
                        </span>
                      </td>

                      {/* Balance After */}
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                        {m.balance_after}
                      </td>

                      {/* Branch & Recipient */}
                      <td className="py-2.5 px-3">
                        {m.branch_name ? (
                          <div>
                            <div className="font-semibold text-slate-800 flex items-center space-x-1">
                              <Building2 className="w-3 h-3 text-blue-500 shrink-0" />
                              <span className="truncate max-w-[150px]">{m.branch_name}</span>
                            </div>
                            {m.recipient_name && (
                              <div className="text-[10px] text-slate-600 flex items-center space-x-1">
                                <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{m.recipient_name}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Central Inward / Restock</span>
                        )}
                      </td>

                      {/* Notes & Performed By */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="text-[11px] text-slate-700 truncate max-w-[200px] ml-auto">{m.notes}</div>
                        <div className="text-[10px] text-slate-400">By: {m.performed_by}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
