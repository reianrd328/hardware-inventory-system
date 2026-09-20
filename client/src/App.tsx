import React, { useState, useEffect } from 'react';
import { UserRole, Warehouse, Branch, AppUser } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { WarehouseStockView } from './components/WarehouseStockView';
import { RequisitionsView } from './components/RequisitionsView';
import { ApprovalsView } from './components/ApprovalsView';
import { WarehouseDispatchView } from './components/WarehouseDispatchView';
import { BranchAcceptanceView } from './components/BranchAcceptanceView';
import { GsdReplenishmentView } from './components/GsdReplenishmentView';
import { WarehouseReplenishmentView } from './components/WarehouseReplenishmentView';
import { MovementsAuditView } from './components/MovementsAuditView';
import { DirectoryView } from './components/DirectoryView';
import { UserManagementView } from './components/UserManagementView';
import { LoginView } from './components/LoginView';

export function App() {
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('hardware_inv_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('hardware_inv_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.assigned_warehouse_id) return u.assigned_warehouse_id;
      }
    } catch {}
    return 1;
  });
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [navigationMeta, setNavigationMeta] = useState<any>(null);

  useEffect(() => {
    if (currentUser?.assigned_warehouse_id) {
      setSelectedWarehouseId(currentUser.assigned_warehouse_id);
    }
  }, [currentUser]);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load initial network topology & staff user accounts
  const loadUsersList = async () => {
    try {
      const userList = await api.getUsers();
      setAllUsers(userList);
      if (currentUser) {
        // Update current user metadata if edited
        const updated = userList.find((u) => u.id === currentUser.id);
        if (updated) {
          setCurrentUser(updated);
          localStorage.setItem('hardware_inv_user', JSON.stringify(updated));
        }
      }
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const reloadWarehouses = async () => {
    try {
      const whList = await api.getWarehouses();
      setWarehouses(whList);
      if (whList.length > 0 && !whList.some((w) => w.id === selectedWarehouseId)) {
        setSelectedWarehouseId(whList[0].id);
      }
      await loadUsersList();
    } catch (err) {
      console.error('Failed to reload warehouses', err);
    }
  };

  const reloadBranches = async () => {
    try {
      const brList = await api.getBranches();
      setBranches(brList);
      await loadUsersList();
    } catch (err) {
      console.error('Failed to reload branches', err);
    }
  };

  useEffect(() => {
    async function initNetwork() {
      try {
        const [whList, brList] = await Promise.all([
          api.getWarehouses(),
          api.getBranches(),
        ]);
        setWarehouses(whList);
        setBranches(brList);
        await loadUsersList();
      } catch (err) {
        console.error('Failed to load initial data', err);
      } finally {
        setInitialLoading(false);
      }
    }
    initNetwork();
  }, []);

  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('hardware_inv_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    if (user.assigned_warehouse_id) {
      setSelectedWarehouseId(user.assigned_warehouse_id);
    }
    setActiveTab('dashboard');
    setNavigationMeta(null);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('hardware_inv_user');
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(null);
    setActiveTab('dashboard');
    setNavigationMeta(null);
  };

  const handleSelectUser = (user: AppUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('hardware_inv_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    if (user.assigned_warehouse_id) {
      setSelectedWarehouseId(user.assigned_warehouse_id);
    }
    // When switching role, if tab is not permitted in the new role, go to dashboard
    const role = user.role;
    const allowedTabsForRole: Record<UserRole, string[]> = {
      ADMIN: ['dashboard', 'users', 'stock', 'requests', 'approvals', 'dispatch', 'branch-acceptance', 'gsd-replenishment', 'warehouse-replenishment', 'movements', 'directory'],
      IT: ['dashboard', 'requests', 'directory'],
      AC: ['dashboard', 'approvals', 'stock', 'directory'],
      GSD: ['dashboard', 'gsd-replenishment', 'stock', 'movements', 'directory'],
      WAREHOUSE: ['dashboard', 'stock', 'dispatch', 'warehouse-replenishment', 'movements', 'directory', 'requests'],
      BRANCH: ['dashboard', 'branch-acceptance', 'requests', 'directory']
    };

    if (!allowedTabsForRole[role].includes(activeTab)) {
      setActiveTab('dashboard');
    }
    setNavigationMeta(null);
  };

  const handleNavigate = (tab: string, meta?: any) => {
    setNavigationMeta(meta || null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-bold text-sm tracking-wide">Connecting to 22 Regional Warehouses & 112 Branches...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, present the Role-Based Login Portal
  if (!currentUser) {
    return <LoginView onLogin={handleLogin} />;
  }

  const currentRole = currentUser?.role || 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navigation Bar with Role Separation */}
      <Navbar
        currentUser={currentUser}
        allUsers={allUsers}
        onSelectUser={handleSelectUser}
        onLogout={handleLogout}
        selectedWarehouseId={selectedWarehouseId}
        onWarehouseChange={setSelectedWarehouseId}
        warehouses={warehouses}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setNavigationMeta(null);
          setActiveTab(tab);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            currentRole={currentRole}
            onNavigate={handleNavigate}
          />
        )}

        {/* User Management & Role Assignment (Admin Exclusive) */}
        {activeTab === 'users' && currentRole === 'ADMIN' && (
          <UserManagementView
            warehouses={warehouses}
            branches={branches}
            onUsersUpdated={loadUsersList}
          />
        )}

        {activeTab === 'stock' && (
          <WarehouseStockView
            currentRole={currentRole}
            currentUser={currentUser}
            userWarehouseId={currentUser?.assigned_warehouse_id}
            selectedWarehouseId={selectedWarehouseId}
            onWarehouseChange={setSelectedWarehouseId}
            warehouses={warehouses}
            initialFilter={navigationMeta?.filter}
            onNavigateToRestock={(whId, hwId) =>
              handleNavigate('gsd-replenishment', { warehouse_id: whId, hardware_id: hwId })
            }
            onWarehousesUpdated={reloadWarehouses}
            onNavigateToTab={handleNavigate}
          />
        )}

        {activeTab === 'requests' && (
          <RequisitionsView
            currentRole={currentRole}
            branches={branches}
            warehouses={warehouses}
            initialTypeFilter={navigationMeta?.request_type}
            onNavigateToTab={handleNavigate}
          />
        )}

        {activeTab === 'approvals' && (
          <ApprovalsView
            currentRole={currentRole}
            currentUser={currentUser}
            onNavigateToDispatch={() => handleNavigate('dispatch')}
          />
        )}

        {activeTab === 'dispatch' && (
          <WarehouseDispatchView
            currentRole={currentRole}
            selectedWarehouseId={selectedWarehouseId}
            warehouses={warehouses}
            onWarehouseChange={setSelectedWarehouseId}
            onNavigateToTab={handleNavigate}
          />
        )}

        {activeTab === 'branch-acceptance' && (
          <BranchAcceptanceView
            currentRole={currentRole}
            branches={branches}
          />
        )}

        {activeTab === 'gsd-replenishment' && (
          <GsdReplenishmentView
            currentRole={currentRole}
            currentUser={currentUser}
            warehouses={warehouses}
            branches={branches}
            preselectedWarehouseId={navigationMeta?.warehouse_id}
            preselectedHardwareId={navigationMeta?.hardware_id}
          />
        )}

        {activeTab === 'warehouse-replenishment' && (
          <WarehouseReplenishmentView
            currentRole={currentRole}
            selectedWarehouseId={selectedWarehouseId}
          />
        )}

        {activeTab === 'movements' && (
          <MovementsAuditView
            currentRole={currentRole}
            warehouses={warehouses}
          />
        )}

        {activeTab === 'directory' && (
          <DirectoryView
            branches={branches}
            warehouses={warehouses}
            currentRole={currentRole}
            userWarehouseId={currentUser?.assigned_warehouse_id}
            onWarehousesUpdated={reloadWarehouses}
            onBranchesUpdated={reloadBranches}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 no-print mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-slate-300">
              Active User: {currentUser?.full_name} ({currentRole})
            </span>
            <span className="text-slate-500">• Access Control Active</span>
          </div>
          <div className="text-slate-500 text-[11px]">
            Enterprise Role Isolation • {warehouses.length} Warehouses & {branches.length} Branches Tracked
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
