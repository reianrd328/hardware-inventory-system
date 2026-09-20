import React, { useState, useEffect } from 'react';
import { AppUser, UserRole, Warehouse } from '../types';
import { api } from '../services/api';
import {
  Server,
  Layers,
  ShieldCheck,
  Package,
  Warehouse as WarehouseIcon,
  Building2,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Sparkles
} from 'lucide-react';

interface LoginViewProps {
  onLogin: (user: AppUser) => void;
}

interface DemoAccount {
  role: UserRole;
  roleName: string;
  username: string;
  password: string;
  title: string;
  description: string;
  badge: string;
  icon: any;
  color: string;
}

export const ALL_WAREHOUSES = [
  { id: 1, code: 'WH-NCR-01', name: 'Central Metro Manila Logistics Hub', username: 'wh_ncr01' },
  { id: 2, code: 'WH-NCR-02', name: 'North NCR Distribution Center', username: 'wh_ncr02' },
  { id: 3, code: 'WH-NCR-03', name: 'South NCR Logistics Depot', username: 'wh_ncr03' },
  { id: 4, code: 'WH-NCR-04', name: 'East NCR Logistics Depot', username: 'wh_ncr04' },
  { id: 5, code: 'WH-NCR-05', name: 'West NCR Port Logistics Hub', username: 'wh_ncr05' },
  { id: 6, code: 'WH-NLZ-01', name: 'Northern Luzon Central Hub', username: 'wh_nlz01' },
  { id: 7, code: 'WH-NLZ-02', name: 'Pangasinan Regional Depot', username: 'wh_nlz02' },
  { id: 8, code: 'WH-NLZ-03', name: 'Baguio & CAR Logistics Hub', username: 'wh_nlz03' },
  { id: 9, code: 'WH-NLZ-04', name: 'Cagayan Valley Regional Depot', username: 'wh_nlz04' },
  { id: 10, code: 'WH-SLZ-01', name: 'Southern Luzon Central Hub', username: 'wh_slz01' },
  { id: 11, code: 'WH-SLZ-02', name: 'Cavite Industrial Depot', username: 'wh_slz02' },
  { id: 12, code: 'WH-SLZ-03', name: 'Batangas Port Logistics Hub', username: 'wh_slz03' },
  { id: 13, code: 'WH-SLZ-04', name: 'Bicol Regional Logistics Depot', username: 'wh_slz04' },
  { id: 14, code: 'WH-VIS-01', name: 'Central Visayas Main Hub', username: 'wh_vis01' },
  { id: 15, code: 'WH-VIS-02', name: 'Cebu South Logistics Depot', username: 'wh_vis02' },
  { id: 16, code: 'WH-VIS-03', name: 'Western Visayas Logistics Hub', username: 'wh_vis03' },
  { id: 17, code: 'WH-VIS-04', name: 'Negros Regional Depot', username: 'wh_vis04' },
  { id: 18, code: 'WH-VIS-05', name: 'Eastern Visayas Logistics Depot', username: 'wh_vis05' },
  { id: 19, code: 'WH-MIN-01', name: 'Southern Mindanao Central Hub', username: 'wh_min01' },
  { id: 20, code: 'WH-MIN-02', name: 'Northern Mindanao Logistics Depot', username: 'wh_min02' },
  { id: 21, code: 'WH-MIN-03', name: 'SOCCSKSARGEN Regional Depot', username: 'wh_min03' },
  { id: 22, code: 'WH-MIN-04', name: 'Zamboanga Peninsula Depot', username: 'wh_min04' },
];

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'ADMIN',
    roleName: 'System Administrator',
    username: 'admin',
    password: 'admin123',
    title: 'Superuser Access',
    description: 'Manage users, assign stakeholder roles, full visibility across all 22 WHs & 112 branches.',
    badge: 'bg-slate-900 text-white',
    icon: Server,
    color: 'border-slate-800 hover:border-slate-600',
  },
  {
    role: 'IT',
    roleName: 'IT Requester',
    username: 'it_alex',
    password: 'it123',
    title: 'Alex Reyes (Senior IT)',
    description: 'Submit branch hardware requests, borrow equipment, track approval & dispatch status.',
    badge: 'bg-indigo-600 text-white',
    icon: Layers,
    color: 'border-indigo-300 hover:border-indigo-500',
  },
  {
    role: 'AC',
    roleName: 'Area Manager (AC)',
    username: 'am_bob',
    password: 'ac123',
    title: 'Roberto "Bob" (NCR Area)',
    description: 'Review branch requisitions, approve/reject with remarks, monitor stock depletion.',
    badge: 'bg-purple-600 text-white',
    icon: ShieldCheck,
    color: 'border-purple-300 hover:border-purple-500',
  },
  {
    role: 'GSD',
    roleName: 'Purchasing / GSD',
    username: 'gsd_carla',
    password: 'gsd123',
    title: 'Carla Mendoza (GSD Lead)',
    description: 'Monitor stock shortages & out-of-stock items, generate replenishment POs to warehouses.',
    badge: 'bg-emerald-600 text-white',
    icon: Package,
    color: 'border-emerald-300 hover:border-emerald-500',
  },
  {
    role: 'WAREHOUSE',
    roleName: 'Warehouse Custodian',
    username: 'wh_ncr01',
    password: 'wh123',
    title: 'Regional Hub Custodian',
    description: 'All 22 warehouses equipped with dedicated accounts. Customize par levels, dispatch & accept goods.',
    badge: 'bg-amber-600 text-white',
    icon: WarehouseIcon,
    color: 'border-amber-300 hover:border-amber-500',
  },
  {
    role: 'BRANCH',
    roleName: 'Branch Custodian',
    username: 'branch_maria',
    password: 'branch123',
    title: 'Maria Santos (Branch 001)',
    description: 'Record delivery arrival datetime, inspect equipment condition, sign off branch acceptance.',
    badge: 'bg-blue-600 text-white',
    icon: Building2,
    color: 'border-blue-300 hover:border-blue-500',
  },
];

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole>('ADMIN');
  const [selectedWhId, setSelectedWhId] = useState<number>(1);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    api.getWarehouses().then((list) => {
      setWarehouses(list);
      if (list.length > 0) {
        setSelectedWhId(list[0].id);
      }
    }).catch(console.error);
  }, []);

  const getWhUsername = (wh: Warehouse) => {
    const slug = wh.code.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^wh/, '');
    return `wh_${slug}`;
  };

  const handleLoginSubmit = async (e?: React.FormEvent, customUsername?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const userToAuth = (customUsername || username).trim();
    const passToAuth = customPassword || password;

    if (!userToAuth || !passToAuth) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.login(userToAuth, passToAuth);
      if (res.success && res.user) {
        onLogin(res.user);
      } else {
        setErrorMessage('Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (account: DemoAccount, autoSubmit: boolean = false) => {
    let effectiveUser = account.username;
    if (account.role === 'WAREHOUSE') {
      if (warehouses.length > 0) {
        const wh = warehouses.find((w) => w.id === selectedWhId) || warehouses[0];
        effectiveUser = getWhUsername(wh);
      } else {
        setErrorMessage('No company warehouses exist yet. Please log in as System Administrator (admin / admin123) to register your company warehouses.');
        return;
      }
    }
    setUsername(effectiveUser);
    setPassword(account.password);
    setSelectedDemoRole(account.role);
    setErrorMessage(null);
    if (autoSubmit) {
      handleLoginSubmit(undefined, effectiveUser, account.password);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xl shadow-blue-500/25 mb-4 ring-4 ring-blue-500/20">
          <Server className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Hardware Inventory & Monitoring System
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400">
          Enterprise Stock In/Out Tracking • 22 Warehouses • 112 Regional Branches
        </p>
      </div>

      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Login Form Card (5 cols on large screens) */}
        <div className="lg:col-span-5 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-blue-400" />
              <span>Role-Based Portal Sign In</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your authorized staff credentials to enter your role portal.
            </p>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or it_alex"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-xs font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 text-xs font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Authenticate & Enter Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <span className="text-[11px] text-slate-400">
              Need assistance or role permissions reassigned? Contact your{' '}
              <strong className="text-slate-300">System Administrator</strong>.
            </span>
          </div>
        </div>

        {/* Right Side: Quick Role Demo Accounts Grid (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-7">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Quick Role Demo Accounts
              </h3>
            </div>
            <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
              1-Click Fast Sign In
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-5">
            Click any stakeholder role below to instantly load credentials and test their isolated portal workspace:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              const isSelected = selectedDemoRole === acc.role;
              const currentWh = warehouses.find((w) => w.id === selectedWhId) || warehouses[0];
              const cardUsername = acc.role === 'WAREHOUSE'
                ? (currentWh ? getWhUsername(currentWh) : 'No Warehouses')
                : acc.username;
              const cardSubtitle = acc.role === 'WAREHOUSE'
                ? (currentWh ? `${currentWh.code} • ${currentWh.name.split(' (')[0]}` : 'Configure in Admin')
                : acc.title;

              return (
                <div
                  key={acc.role}
                  className={`group relative text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-blue-500 shadow-md shadow-blue-500/10'
                      : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                  }`}
                  onClick={() => handleSelectDemo(acc, false)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-lg ${acc.badge}`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white leading-tight">
                          {acc.roleName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {cardSubtitle}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-snug mb-2 line-clamp-2">
                    {acc.description}
                  </p>

                  {/* Warehouse Dropdown Selector for Company Warehouses */}
                  {acc.role === 'WAREHOUSE' && (
                    <div
                      className="mt-2 mb-2.5 p-2 bg-slate-950/70 rounded-lg border border-amber-500/40"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold mb-1">
                        <span>Select Company Warehouse ({warehouses.length} Hubs):</span>
                        <span className="text-[9px] text-slate-400 font-mono">pwd: wh123</span>
                      </div>
                      {warehouses.length > 0 ? (
                        <select
                          value={selectedWhId}
                          onChange={(e) => {
                            const id = Number(e.target.value);
                            setSelectedWhId(id);
                            const wh = warehouses.find((w) => w.id === id);
                            if (wh) {
                              setUsername(getWhUsername(wh));
                              setPassword('wh123');
                              setSelectedDemoRole('WAREHOUSE');
                            }
                          }}
                          className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded text-[11px] text-amber-200 font-medium focus:ring-1 focus:ring-amber-500 outline-none"
                        >
                          {warehouses.map((wh) => (
                            <option key={wh.id} value={wh.id}>
                              {wh.code} - {wh.name} ({getWhUsername(wh)})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-[10px] text-amber-400 py-1">
                          No warehouses configured yet. Sign in as <strong>admin</strong> to add company warehouses.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                    <div className="text-slate-300 font-mono text-[10px]">
                      <span className="text-slate-500">user:</span> {cardUsername}
                      <span className="mx-1 text-slate-600">|</span>
                      <span className="text-slate-500">pwd:</span> {acc.password}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectDemo(acc, true);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-blue-400 bg-blue-950/60 border border-blue-800 hover:bg-blue-900/80 transition"
                      title={`Sign in immediately as ${acc.roleName}`}
                    >
                      Sign In →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center space-x-3 text-xs text-slate-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-[11px] leading-relaxed">
              <strong className="text-slate-200">Strict Role Portal Isolation:</strong> Requisitions, AM Approvals, WH Dispatches, and Restock Replenishments are strictly partitioned to prevent unauthorized operations.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
