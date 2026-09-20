import React, { useState, useEffect } from 'react';
import { Warehouse } from '../types';
import { api } from '../services/api';
import {
  X,
  Warehouse as WarehouseIcon,
  MapPin,
  User,
  Phone,
  Mail,
  KeyRound,
  Package,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldAlert
} from 'lucide-react';

interface WarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouseToEdit: Warehouse | null;
  onSaved: (warehouse: Warehouse, isNew: boolean) => void;
}

export const WarehouseModal: React.FC<WarehouseModalProps> = ({
  isOpen,
  onClose,
  warehouseToEdit,
  onSaved,
}) => {
  const isEditing = !!warehouseToEdit;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('National Capital Region');
  const [customRegion, setCustomRegion] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [initialStockMode, setInitialStockMode] = useState<'EMPTY' | 'DEFAULT_PAR'>('EMPTY');
  const [custodianUsername, setCustodianUsername] = useState('');
  const [custodianPassword, setCustodianPassword] = useState('wh123');

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
    if (warehouseToEdit) {
      setCode(warehouseToEdit.code);
      setName(warehouseToEdit.name);
      if (PRESET_REGIONS.includes(warehouseToEdit.region)) {
        setRegion(warehouseToEdit.region);
        setCustomRegion('');
      } else {
        setRegion('Other / Custom Region');
        setCustomRegion(warehouseToEdit.region);
      }
      setArea(warehouseToEdit.area || '');
      setAddress(warehouseToEdit.address || '');
      setContactPerson(warehouseToEdit.contact_person || '');
      setPhone(warehouseToEdit.phone || '');
      setEmail(warehouseToEdit.email || '');
    } else {
      // Default blank values for new warehouse
      setCode('');
      setName('');
      setRegion('National Capital Region');
      setCustomRegion('');
      setArea('');
      setAddress('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setInitialStockMode('EMPTY');
      setCustodianUsername('');
      setCustodianPassword('wh123');
    }
    setError(null);
  }, [warehouseToEdit, isOpen]);

  // Automatically suggest username as code changes when creating new
  const handleCodeChange = (newCode: string) => {
    const formatted = newCode.toUpperCase().replace(/\s+/g, '-');
    setCode(formatted);
    if (!isEditing) {
      const slug = formatted.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^wh/, '');
      setCustodianUsername(slug ? `wh_${slug}` : '');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalRegion = region === 'Other / Custom Region' ? customRegion.trim() : region.trim();

    if (!code.trim() || !name.trim() || !finalRegion || !address.trim() || !contactPerson.trim() || !phone.trim()) {
      setError('Please fill out all required fields marked with an asterisk (*).');
      return;
    }

    try {
      setSaving(true);
      if (isEditing && warehouseToEdit) {
        const res = await api.updateWarehouse(warehouseToEdit.id, {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          region: finalRegion,
          area: area.trim() || finalRegion,
          address: address.trim(),
          contact_person: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim() || `${code.toLowerCase()}@warehouse.company.com`,
          is_active: 1
        });
        onSaved(res.warehouse, false);
      } else {
        const res = await api.createWarehouse({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          region: finalRegion,
          area: area.trim() || finalRegion,
          address: address.trim(),
          contact_person: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim(),
          initial_stock_mode: initialStockMode,
          custodian_username: custodianUsername.trim() || undefined,
          custodian_password: custodianPassword.trim() || 'wh123'
        });
        onSaved(res.warehouse, true);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save warehouse');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-400/30">
              <WarehouseIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isEditing ? `Edit Warehouse: ${warehouseToEdit?.code}` : 'Register New Company Warehouse'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? 'Update warehouse facility details and custodian assignments.'
                  : 'Add your company’s real warehouse facility, assign custodian credentials & initialize stock.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Core Facility Info */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center space-x-1.5">
              <WarehouseIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Facility Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Warehouse Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. WH-CORP-01 or WH-MNL-MAIN"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  disabled={isEditing}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 disabled:text-slate-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Unique uppercase identifier code</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Warehouse Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Head Office Central Distribution Hub"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Region <span className="text-rose-500">*</span>
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {PRESET_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {region === 'Other / Custom Region' && (
                  <input
                    type="text"
                    placeholder="Enter custom region name..."
                    value={customRegion}
                    onChange={(e) => setCustomRegion(e.target.value)}
                    required
                    className="mt-2 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                  />
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Area / Zone / District
                </label>
                <input
                  type="text"
                  placeholder="e.g. Metro Manila East or Laguna Technopark"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Full Physical Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Building, Street, Barangay, City, Province, Postal Code"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Custodian & Contact Details */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Facility Custodian & Contact Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supervisor / Custodian Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Juan Dela Cruz"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contact Phone / Mobile <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. +63 917 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Warehouse Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. wh.main@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Dedicated Login Account & Initial Stock Setup (New Warehouse Only) */}
          {!isEditing && (
            <>
              {/* Account Provisioning */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                  <span>Dedicated Warehouse Staff Login Account</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  A dedicated login account with the <strong>WAREHOUSE</strong> role will automatically be provisioned so this facility can log in, accept shipments, and dispatch stock.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Login Username
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. wh_main"
                      value={custodianUsername}
                      onChange={(e) => setCustodianUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Initial Password
                    </label>
                    <input
                      type="text"
                      value={custodianPassword}
                      onChange={(e) => setCustodianPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Initial Stock Setup */}
              <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                <h3 className="font-bold text-amber-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-600" />
                  <span>Initial Stock Tracking Mode</span>
                </h3>
                <p className="text-[11px] text-amber-700">
                  Choose how hardware stock records should be initialized for this warehouse:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label
                    className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition ${
                      initialStockMode === 'EMPTY'
                        ? 'bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="stockMode"
                      checked={initialStockMode === 'EMPTY'}
                      onChange={() => setInitialStockMode('EMPTY')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Clean Slate (0 Units)</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        All catalog items start with 0 quantity on hand. You will manually record stock or replenish via GSD.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition ${
                      initialStockMode === 'DEFAULT_PAR'
                        ? 'bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="stockMode"
                      checked={initialStockMode === 'DEFAULT_PAR'}
                      onChange={() => setInitialStockMode('DEFAULT_PAR')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Standard Catalog Par Levels</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Pre-populates baseline buffer stocks according to standard hardware catalog thresholds.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
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
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center space-x-2 transition disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Warehouse...' : isEditing ? 'Update Warehouse' : 'Create Warehouse'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
