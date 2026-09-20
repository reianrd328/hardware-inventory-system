import React, { useState, useEffect } from 'react';
import {
  UserRole,
  Warehouse,
  AppNotification,
  AppUser
} from '../types';
import {
  Server,
  Bell,
  CheckCheck,
  Building2,
  ShieldCheck,
  Package,
  Layers,
  FileCheck,
  Truck,
  FileText,
  Warehouse as WarehouseIcon,
  ChevronDown,
  Users,
  User,
  LogOut,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';

interface NavbarProps {
  currentUser: AppUser | null;
  allUsers: AppUser[];
  onSelectUser: (user: AppUser) => void;
  onLogout: () => void;
  selectedWarehouseId: number;
  onWarehouseChange: (id: number) => void;
  warehouses: Warehouse[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  onSelectUser,
  onLogout,
  selectedWarehouseId,
  onWarehouseChange,
  warehouses,
  activeTab,
  onTabChange
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const currentRole = currentUser?.role || 'ADMIN';

  // Role visual configuration
  const roleConfig: Record<UserRole, { label: string; badge: string; icon: any }> = {
    ADMIN: { label: 'Administrator', badge: 'bg-slate-900 text-white border border-slate-700', icon: Server },
    IT: { label: 'IT Requester', badge: 'bg-indigo-600 text-white', icon: Layers },
    AC: { label: 'Area Manager (AC)', badge: 'bg-purple-600 text-white', icon: ShieldCheck },
    GSD: { label: 'Purchasing / GSD', badge: 'bg-emerald-600 text-white', icon: Package },
    WAREHOUSE: { label: 'Warehouse Manager', badge: 'bg-amber-600 text-white', icon: WarehouseIcon },
    BRANCH: { label: 'Branch Custodian', badge: 'bg-blue-600 text-white', icon: Building2 },
  };

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications(currentRole);
      setNotifications(data);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentRole]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead(currentRole);
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  // Define tab navigation strictly by user role
  const getNavItemsForRole = (role: UserRole) => {
    switch (role) {
      case 'IT':
        return [
          { id: 'dashboard', label: 'IT Portal', icon: Layers },
          { id: 'requests', label: 'Requisitions & Borrowing', icon: FileText },
          { id: 'directory', label: 'Directory', icon: Building2 },
        ];
      case 'AC':
        return [
          { id: 'dashboard', label: 'Area Overview', icon: Layers },
          { id: 'approvals', label: 'AM Approvals Queue', icon: ShieldCheck },
          { id: 'stock', label: 'Warehouse Stock', icon: WarehouseIcon },
          { id: 'directory', label: 'Directory', icon: Building2 },
        ];
      case 'GSD':
        return [
          { id: 'dashboard', label: 'Stock Health Monitor', icon: Layers },
          { id: 'gsd-replenishment', label: 'GSD Replenishment (POs)', icon: Package },
          { id: 'stock', label: 'Warehouse Stock Monitor', icon: WarehouseIcon },
          { id: 'movements', label: 'Movements Audit', icon: Layers },
          { id: 'directory', label: 'Directory', icon: Building2 },
        ];
      case 'WAREHOUSE':
        return [
          { id: 'dashboard', label: 'Warehouse Hub', icon: Layers },
          { id: 'directory', label: '🏢 Warehouses & Network', icon: WarehouseIcon, highlight: true },
          { id: 'stock', label: 'Warehouse Inventory & Stock', icon: WarehouseIcon },
          { id: 'dispatch', label: '📦 Stock Requests & Dispatch', icon: Truck },
          { id: 'requests', label: '📋 Branch Requisitions Log', icon: FileText },
          { id: 'warehouse-replenishment', label: 'Restock Arrival Acceptance', icon: FileCheck },
          { id: 'movements', label: 'Movements Ledger', icon: Layers },
        ];
      case 'BRANCH':
        return [
          { id: 'dashboard', label: 'Branch Hub', icon: Layers },
          { id: 'directory', label: 'Network Directory', icon: Building2 },
          { id: 'branch-acceptance', label: 'Delivery Arrival Acceptance', icon: Building2 },
          { id: 'requests', label: 'Branch Equipment Log', icon: FileText },
        ];
      case 'ADMIN':
      default:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Layers },
          { id: 'directory', label: '🏢 Warehouses & Directory', icon: WarehouseIcon, highlight: true },
          { id: 'stock', label: 'Warehouse Stock', icon: WarehouseIcon },
          { id: 'users', label: 'User & Role Management', icon: Users },
          { id: 'requests', label: 'Requisitions', icon: FileText },
          { id: 'approvals', label: 'AM Approvals', icon: ShieldCheck },
          { id: 'dispatch', label: 'WH Dispatch', icon: Truck },
          { id: 'branch-acceptance', label: 'Branch Acceptance', icon: Building2 },
          { id: 'gsd-replenishment', label: 'GSD Replenish', icon: Package },
          { id: 'warehouse-replenishment', label: 'WH Restock', icon: FileCheck },
          { id: 'movements', label: 'Movements Audit', icon: Layers },
        ];
    }
  };

  const navItems = getNavItemsForRole(currentRole);
  const currentRoleInfo = roleConfig[currentRole];
  const RoleIcon = currentRoleInfo.icon;

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800 no-print">
      {/* Top Bar: Active User Session, Role Badge, Facility Binding, Notifications */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Network Breadcrumb & Role Portal Tag */}
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
            {currentRoleInfo.label} Portal
          </span>
          {currentUser?.warehouse_name && (
            <span className="hidden sm:inline-flex items-center space-x-1 text-amber-300 text-xs font-semibold">
              <WarehouseIcon className="w-3.5 h-3.5" />
              <span>Assigned: {currentUser.warehouse_code}</span>
            </span>
          )}
          {currentUser?.branch_name && (
            <span className="hidden sm:inline-flex items-center space-x-1 text-blue-300 text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>Assigned: {currentUser.branch_name}</span>
            </span>
          )}
        </div>

        {/* Right: Facility Selector, User Account Switcher, Notifications */}
        <div className="flex items-center space-x-3 ml-auto">
          {/* Warehouse Selector (Only relevant for Roles with cross-warehouse access or Admin) */}
          {(currentRole === 'ADMIN' || currentRole === 'GSD' || currentRole === 'AC') && (
            <div className="hidden md:flex items-center space-x-1.5 bg-slate-800/90 px-2.5 py-1 rounded border border-slate-700">
              <WarehouseIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 font-medium">Warehouse:</span>
              <select
                value={selectedWarehouseId}
                onChange={(e) => onWarehouseChange(Number(e.target.value))}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                <option value={0} className="bg-slate-800 text-white">
                  {warehouses.length === 0 ? 'No Warehouses Configured' : `All ${warehouses.length} Warehouses`}
                </option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id} className="bg-slate-800 text-white">
                    {wh.code} - {wh.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick-Action: Manage / Add Warehouses button (ADMIN only) */}
          {currentRole === 'ADMIN' && (
            <button
              onClick={() => onTabChange('directory')}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-bold text-[11px] shadow-sm transition cursor-pointer"
              title="Add or manage company warehouses"
            >
              <WarehouseIcon className="w-3.5 h-3.5" />
              <span>+ Warehouses</span>
            </button>
          )}

          {/* Active User Account Badge & Profile Card (Private - No other users listed) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700/80 px-2.5 py-1 rounded-lg border border-slate-700 transition cursor-pointer"
              title="View Active Account Info"
            >
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center font-bold text-[10px] text-white">
                {currentUser?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-semibold text-slate-200 text-xs leading-none">
                  {currentUser?.full_name || 'Staff User'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-1">
                  <span>@{currentUser?.username || 'user'}</span>
                  <span>•</span>
                  <span className="font-bold text-amber-300">{currentRole}</span>
                </div>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${currentRoleInfo.badge}`}>
                {currentRole}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Active User Profile Dropdown (Strictly Private - Shows ONLY current user's profile and Logout) */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 py-3 z-50 text-slate-200 animate-fadeIn">
                {/* User Info Header */}
                <div className="px-3.5 pb-3 border-b border-slate-700/80">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm text-white shadow-sm">
                      {currentUser?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-white text-xs truncate">
                        {currentUser?.full_name || 'Staff User'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        @{currentUser?.username || 'user'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Role Access
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${currentRoleInfo.badge}`}>
                      {currentRole}
                    </span>
                  </div>

                  <div className="mt-1.5 text-[11px] text-slate-300 flex items-center space-x-1">
                    <span className="text-slate-400">Assigned To:</span>
                    <span className="font-semibold text-amber-300 truncate">
                      {currentUser?.warehouse_code
                        ? `Warehouse ${currentUser.warehouse_code}`
                        : currentUser?.branch_code
                        ? `Branch ${currentUser.branch_code}`
                        : 'Enterprise Global'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-2 space-y-1">
                  {currentRole === 'ADMIN' && (
                    <button
                      onClick={() => {
                        onTabChange('users');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-700 transition text-left cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>User Management</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center space-x-2 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-600/80 transition text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dedicated Logout Icon Button */}
          <button
            onClick={onLogout}
            title="Log Out of System"
            className="flex items-center space-x-1 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline text-[11px] font-medium">Log Out</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-1.5 text-slate-300 hover:text-white rounded-md hover:bg-slate-800 transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] text-center leading-4 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer */}
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden text-slate-200">
                <div className="p-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-sm">Notifications ({unreadCount} unread)</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800 text-xs">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">No notifications for {currentRoleInfo.label}</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 transition hover:bg-slate-800/60 ${
                          !n.is_read ? 'bg-slate-800/40 border-l-2 border-amber-500' : 'opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span className="font-semibold text-amber-400">{n.type.replace(/_/g, ' ')}</span>
                          <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="font-medium text-slate-200">{n.title}</div>
                        <div className="text-slate-400 mt-1 leading-relaxed">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Bar: Dynamically filtered strictly for the user's role */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <RoleIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-blue-200">
                Hardware Stock Monitor
              </span>
              <span className="hidden md:inline ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {currentRoleInfo.label} Workspace
              </span>
            </div>
          </div>

          {/* Nav Tabs (Flex-wrap ensures all tabs are always 100% visible) */}
          <nav className="flex items-center space-x-1.5 flex-wrap gap-y-1.5 py-1">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-bold'
                      : tab.highlight
                      ? 'bg-amber-600/90 text-white hover:bg-amber-500 font-bold ring-1 ring-amber-400/40 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
