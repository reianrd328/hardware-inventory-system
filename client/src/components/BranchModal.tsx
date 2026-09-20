import React, { useState, useEffect } from 'react';
import { Branch, Warehouse } from '../types';
import { api } from '../services/api';
import {
  X,
  Building2,
  MapPin,
  User,
  Phone,
  Mail,
  Warehouse as WarehouseIcon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save
} from 'lucide-react';

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchToEdit: Branch | null;
  warehouses: Warehouse[];
  onSaved: (branch: Branch, isNew: boolean) => void;
}

export const BranchModal: React.FC<BranchModalProps> = ({
  isOpen,
  onClose,
  branchToEdit,
  warehouses,
  onSaved,
}) => {
  const isEditing = !!branchToEdit;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('National Capital Region');
  const [customRegion, setCustomRegion] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [assignedWarehouseId, setAssignedWarehouseId] = useState<number | ''>('');
  const [areaManagerName, setAreaManagerName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PRESET_REGIONS = [
    'National Capital Region',
    'North Luzon',
    'South Luzon',
    'Visayas',
    'Mindanao',
    'Other / Custom Region'
  ];

  useEffect(() => {
    if (branchToEdit) {
      setCode(branchToEdit.code);
      setName(branchToEdit.name);
      if (PRESET_REGIONS.includes(branchToEdit.region)) {
        setRegion(branchToEdit.region);
        setCustomRegion('');
      } else {
        setRegion('Other / Custom Region');
        setCustomRegion(branchToEdit.region);
      }
      setArea(branchToEdit.area || '');
      setAddress(branchToEdit.address || '');
      setAssignedWarehouseId(branchToEdit.assigned_warehouse_id || '');
      setAreaManagerName(branchToEdit.area_manager_name || '');
      setContactPerson(branchToEdit.contact_person || '');
      setPhone(branchToEdit.phone || '');
      setEmail(branchToEdit.email || '');
    } else {
      setCode('');
      setName('');
      setRegion('National Capital Region');
      setCustomRegion('');
      setArea('');
      setAddress('');
      setAssignedWarehouseId(warehouses.length > 0 ? warehouses[0].id : '');
      setAreaManagerName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
    }
    setError(null);
  }, [branchToEdit, isOpen, warehouses]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalRegion = region === 'Other / Custom Region' ? customRegion.trim() : region;
    if (!finalRegion) {
      setError('Please specify a region.');
      return;
    }

    if (!code.trim() || !name.trim()) {
      setError('Branch Code and Branch Name are required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        region: finalRegion,
        area: area.trim() || finalRegion,
        address: address.trim() || 'Company Branch Office',
        assigned_warehouse_id: assignedWarehouseId ? Number(assignedWarehouseId) : null,
        area_manager_name: areaManagerName.trim() || 'Unassigned Area Manager',
        contact_person: contactPerson.trim() || 'Branch Custodian',
        phone: phone.trim() || 'N/A',
        email: email.trim() || 'branch@company.com',
      };

      if (isEditing && branchToEdit) {
        const res = await api.updateBranch(branchToEdit.id, payload);
        onSaved(res.branch, false);
      } else {
        const res = await api.createBranch(payload);
        onSaved(res.branch, true);
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving branch:', err);
      setError(err.message || 'Failed to save branch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEditing ? `Edit Branch: ${branchToEdit.name}` : 'Register Company Branch'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isEditing
                  ? `Update details and regional hub assignment for ${branchToEdit.code}`
                  : 'Add a new company branch location and link to a regional warehouse hub'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Identification */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Branch Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Branch Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BR-001"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Branch Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Branch - Makati CBD"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Regional & Hub Linkage */}
          <div className="space-y-3 pt-1">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              <span>Location & Assigned Distribution Hub</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Region <span className="text-rose-500">*</span>
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 text-xs focus:ring-2 focus:ring-blue-500/20"
                >
                  {PRESET_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Area / District</label>
                <input
                  type="text"
                  placeholder="e.g. Makati Metro Central"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                />
              </div>
            </div>

            {region === 'Other / Custom Region' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Custom Region Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter custom region name"
                  value={customRegion}
                  onChange={(e) => setCustomRegion(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Assigned Warehouse Hub
              </label>
              <select
                value={assignedWarehouseId}
                onChange={(e) => setAssignedWarehouseId(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold"
              >
                <option value="">-- Unassigned / Pending Hub --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name} ({w.region})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Physical Address</label>
              <input
                type="text"
                placeholder="e.g. Unit 102, Ayala Ave., Makati City"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Section 3: Key Personnel */}
          <div className="space-y-3 pt-1">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-purple-600" />
              <span>Branch Personnel & Contacts</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Area Manager (AM)</label>
                <input
                  type="text"
                  placeholder="e.g. Roberto Gomez"
                  value={areaManagerName}
                  onChange={(e) => setAreaManagerName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Custodian / Lead</label>
                <input
                  type="text"
                  placeholder="e.g. Maria Santos"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone / Hotline</label>
                <input
                  type="text"
                  placeholder="e.g. 0917-123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. branch.makati@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : isEditing ? 'Update Branch' : 'Register Branch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
