import React, { useState } from 'react';
import { Branch, Warehouse, UserRole } from '../types';
import { api } from '../services/api';
import { WarehouseModal } from './WarehouseModal';
import { BranchModal } from './BranchModal';
import {
  Building2,
  Warehouse as WarehouseIcon,
  Search,
  MapPin,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  PackageX,
  ShieldAlert
} from 'lucide-react';

interface DirectoryViewProps {
  branches: Branch[];
  warehouses: Warehouse[];
  currentRole: UserRole;
  userWarehouseId?: number | null;
  onWarehousesUpdated?: () => void;
  onBranchesUpdated?: () => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  branches,
  warehouses,
  currentRole,
  userWarehouseId,
  onWarehousesUpdated,
  onBranchesUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'BRANCHES' | 'WAREHOUSES'>('WAREHOUSES');
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');

  // Warehouse Modal States (Admin Only)
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [warehouseToEdit, setWarehouseToEdit] = useState<Warehouse | null>(null);

  // Clear All Mock Warehouses Modal States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Delete Single Warehouse State
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Branch Modal & Delete States (Admin Only)
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchToEdit, setBranchToEdit] = useState<Branch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);

  // Toast / feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const regions = Array.from(new Set([...branches.map((b) => b.region), ...warehouses.map((w) => w.region)]));

  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase()) ||
      b.contact_person.toLowerCase().includes(search.toLowerCase()) ||
      b.area.toLowerCase().includes(search.toLowerCase());

    const matchesRegion = regionFilter === 'ALL' || b.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  const visibleWarehouses =
    currentRole === 'WAREHOUSE' && userWarehouseId
      ? warehouses.filter((w) => w.id === userWarehouseId)
      : warehouses;

  const filteredWarehouses = visibleWarehouses.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.code.toLowerCase().includes(search.toLowerCase()) ||
      w.contact_person.toLowerCase().includes(search.toLowerCase()) ||
      w.address.toLowerCase().includes(search.toLowerCase());

    const matchesRegion = regionFilter === 'ALL' || w.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  const handleOpenCreateModal = () => {
    setWarehouseToEdit(null);
    setShowWarehouseModal(true);
  };

  const handleOpenEditModal = (wh: Warehouse) => {
    setWarehouseToEdit(wh);
    setShowWarehouseModal(true);
  };

  const handleWarehouseSaved = (savedWh: Warehouse, isNew: boolean) => {
    setFeedback({
      type: 'success',
      message: isNew
        ? `Warehouse "${savedWh.name}" (${savedWh.code}) created successfully with dedicated custodian account!`
        : `Warehouse "${savedWh.name}" updated successfully.`
    });
    if (onWarehousesUpdated) onWarehousesUpdated();
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleDeleteSingle = async () => {
    if (!warehouseToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteWarehouse(warehouseToDelete.id);
      setFeedback({
        type: 'success',
        message: `Warehouse "${warehouseToDelete.name}" (${warehouseToDelete.code}) was deleted.`
      });
      setWarehouseToDelete(null);
      if (onWarehousesUpdated) onWarehousesUpdated();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete warehouse.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAllMockData = async () => {
    if (resetConfirmationText.trim().toUpperCase() !== 'RESET') {
      setFeedback({ type: 'error', message: 'Please type RESET to confirm data wipe.' });
      return;
    }
    try {
      setIsResetting(true);
      const res = await api.clearAllWarehouses();
      setFeedback({
        type: 'success',
        message: `Reset complete! All mock warehouse records wiped. A safety backup was saved (${res.backup.filename}). Ready for manual company entry.`
      });
      setShowResetModal(false);
      setResetConfirmationText('');
      if (onWarehousesUpdated) onWarehousesUpdated();
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Reset failed.' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenCreateBranchModal = () => {
    setBranchToEdit(null);
    setShowBranchModal(true);
  };

  const handleOpenEditBranchModal = (b: Branch) => {
    setBranchToEdit(b);
    setShowBranchModal(true);
  };

  const handleBranchSaved = (savedBranch: Branch, isNew: boolean) => {
    setFeedback({
      type: 'success',
      message: isNew
        ? `Branch "${savedBranch.name}" (${savedBranch.code}) registered successfully!`
        : `Branch "${savedBranch.name}" updated successfully.`
    });
    if (onBranchesUpdated) onBranchesUpdated();
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleDeleteBranch = async () => {
    if (!branchToDelete) return;
    try {
      setIsDeletingBranch(true);
      await api.deleteBranch(branchToDelete.id);
      setFeedback({
        type: 'success',
        message: `Branch "${branchToDelete.name}" (${branchToDelete.code}) was deleted.`
      });
      setBranchToDelete(null);
      if (onBranchesUpdated) onBranchesUpdated();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete branch.' });
    } finally {
      setIsDeletingBranch(false);
    }
  };

  // ONLY Administrator can add, edit, or delete warehouses and branches
  const isAdmin = currentRole === 'ADMIN';
  const canManage = isAdmin;

  return (
    <div className="space-y-5">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2.5 text-xs font-semibold">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-600">
            <WarehouseIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Facilities & Network Directory</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage company distribution hubs ({warehouses.length} Warehouses) and branch network ({branches.length} Branches).
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('WAREHOUSES')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'WAREHOUSES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Warehouses ({warehouses.length})
          </button>
          <button
            onClick={() => setActiveTab('BRANCHES')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'BRANCHES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Branches ({branches.length})
          </button>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'WAREHOUSES' ? `Search ${warehouses.length} warehouses...` : `Search ${branches.length} branches...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Warehouse Management Buttons (ADMIN only) */}
        {activeTab === 'WAREHOUSES' && isAdmin && (
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button
              onClick={() => {
                setResetConfirmationText('');
                setShowResetModal(true);
              }}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
              title="Wipe mock warehouses to populate real company records manually"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear All Mock WHs</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Warehouse</span>
            </button>
          </div>
        )}

        {/* Branch Management Buttons (ADMIN only) */}
        {activeTab === 'BRANCHES' && isAdmin && (
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button
              onClick={handleOpenCreateBranchModal}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Branch</span>
            </button>
          </div>
        )}
      </div>

      {/* Warehouses Tab Content */}
      {activeTab === 'WAREHOUSES' && (
        <>
          {warehouses.length === 0 ? (
            <div className="bg-white border border-dashed border-amber-300 rounded-2xl p-10 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 mx-auto bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-center text-amber-600">
                <WarehouseIcon className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">No Warehouses Configured</h3>
                <p className="text-xs text-slate-500">
                  You have cleared all mock warehouses. The system is ready for you to manually enter your company's actual distribution hubs and stock.
                </p>
              </div>
              {isAdmin ? (
                <button
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md shadow-amber-500/20 text-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register First Company Warehouse</span>
                </button>
              ) : (
                <p className="text-xs text-amber-800 font-semibold bg-amber-100/70 py-2 px-4 rounded-lg inline-block">
                  Please sign in as Administrator to register company warehouses.
                </p>
              )}
            </div>
          ) : filteredWarehouses.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
              No warehouses matched your search criteria "{search}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {filteredWarehouses.map((w) => (
                <div
                  key={w.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-amber-600 text-[11px] font-mono tracking-wider">
                          {w.code}
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm mt-0.5">{w.name}</h3>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 font-bold">
                          Active
                        </span>
                        {canManage && (
                          <div className="flex items-center space-x-1 pl-1">
                            <button
                              onClick={() => handleOpenEditModal(w)}
                              title="Edit Warehouse Facility"
                              className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setWarehouseToDelete(w)}
                              title="Delete Warehouse"
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-slate-600 text-[11px] mt-3">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{w.address} ({w.region})</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Supervisor: <strong>{w.contact_person}</strong></span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{w.phone} • {w.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Stock Status:</span>
                    <span className="font-bold text-slate-800">
                      {w.total_units_in_stock ?? 0} units ({w.total_tracked_items ?? 0} hardware lines)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Branches Tab Content */}
      {activeTab === 'BRANCHES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
          {filteredBranches.map((b) => (
            <div key={b.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-bold text-blue-600 text-[11px]">{b.code}</span>
                  <h3 className="font-bold text-slate-900 text-sm mt-0.5">{b.name}</h3>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                    {b.region.split(' ')[0]}
                  </span>
                  {isAdmin && (
                    <div className="flex items-center space-x-1 pl-1">
                      <button
                        onClick={() => handleOpenEditBranchModal(b)}
                        title="Edit Branch Location"
                        className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setBranchToDelete(b)}
                        title="Delete Branch"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-slate-600 text-[11px]">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{b.area}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="truncate">AM: {b.area_manager_name}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <WarehouseIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">Assigned Hub: {b.warehouse_name || 'Unassigned / Pending'}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{b.contact_person} • {b.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Warehouse Modal */}
      <WarehouseModal
        isOpen={showWarehouseModal}
        onClose={() => setShowWarehouseModal(false)}
        warehouseToEdit={warehouseToEdit}
        onSaved={handleWarehouseSaved}
      />

      {/* Create / Edit Branch Modal (ADMIN only) */}
      <BranchModal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        branchToEdit={branchToEdit}
        warehouses={warehouses}
        onSaved={handleBranchSaved}
      />

      {/* Delete Single Branch Confirmation Modal */}
      {branchToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Branch</h3>
                <p className="text-slate-500">{branchToDelete.code} - {branchToDelete.name}</p>
              </div>
            </div>

            <p className="text-slate-600">
              Are you sure you want to delete this branch? Its associated records and staff user assignment will be unlinked.
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setBranchToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingBranch}
                onClick={handleDeleteBranch}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition disabled:opacity-50 cursor-pointer"
              >
                {isDeletingBranch ? 'Deleting...' : 'Delete Branch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Warehouse Confirmation Modal */}
      {warehouseToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Warehouse</h3>
                <p className="text-slate-500">{warehouseToDelete.code} - {warehouseToDelete.name}</p>
              </div>
            </div>

            <p className="text-slate-600">
              Are you sure you want to delete this warehouse? Its tracked stocks, associated custodian user account, and related history will be removed. Branches will be unlinked.
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setWarehouseToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteSingle}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Warehouse'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Mock Warehouses Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl border border-rose-300">
                <ShieldAlert className="w-6 h-6 text-rose-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Clear All Mock Warehouses</h3>
                <p className="text-slate-500">Safeguarded Data Reset</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-1">
              <span className="font-bold block">Automatic Backup Included</span>
              <p className="text-[11px]">
                A snapshot backup of `inventory.db` will be written automatically to `server/data/backups/` before clearing.
              </p>
            </div>

            <p className="text-slate-600 leading-relaxed">
              This will remove all {warehouses.length} mock warehouses, mock stock quantities, movement ledger history, and mock warehouse accounts so you can enter your company's real records cleanly.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Type <span className="font-mono font-bold text-rose-600">RESET</span> to confirm:
              </label>
              <input
                type="text"
                placeholder="Type RESET"
                value={resetConfirmationText}
                onChange={(e) => setResetConfirmationText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting || resetConfirmationText.trim().toUpperCase() !== 'RESET'}
                onClick={handleClearAllMockData}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition disabled:opacity-40"
              >
                {isResetting ? 'Resetting Data...' : 'Confirm Reset & Backup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
