import React, { useEffect, useState } from 'react';
import { AppUser, UserRole, Warehouse, Branch } from '../types';
import { api } from '../services/api';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  Warehouse as WarehouseIcon,
  Package,
  Layers,
  Server,
  UserCheck,
  Edit,
  X
} from 'lucide-react';

interface UserManagementViewProps {
  warehouses: Warehouse[];
  branches: Branch[];
  onUsersUpdated?: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  warehouses,
  branches,
  onUsersUpdated,
}) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [assignRole, setAssignRole] = useState<UserRole>('IT');
  const [assignWarehouseId, setAssignWarehouseId] = useState<number | null>(null);
  const [assignBranchId, setAssignBranchId] = useState<number | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('IT');
  const [newWarehouseId, setNewWarehouseId] = useState<number | null>(1);
  const [newBranchId, setNewBranchId] = useState<number | null>(1);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (e: any) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenAssignModal = (user: AppUser) => {
    setSelectedUser(user);
    setAssignRole(user.role);
    setAssignWarehouseId(user.assigned_warehouse_id || (warehouses[0]?.id ?? 1));
    setAssignBranchId(user.assigned_branch_id || (branches[0]?.id ?? 1));
    setShowAssignModal(true);
  };

  const handleSaveRoleAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await api.assignUserRole(selectedUser.id, {
        role: assignRole,
        assigned_warehouse_id: assignWarehouseId,
        assigned_branch_id: assignBranchId,
      });

      setFeedback({
        type: 'success',
        message: `User "${selectedUser.full_name}" assigned role: ${assignRole} successfully!`,
      });

      setShowAssignModal(false);
      loadUsers();
      if (onUsersUpdated) onUsersUpdated();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update role' });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        username: newUsername,
        password: newPassword,
        full_name: newFullName,
        email: newEmail,
        role: newRole,
        assigned_warehouse_id: (newRole === 'WAREHOUSE' || newRole === 'AC' || newRole === 'IT') ? newWarehouseId : null,
        assigned_branch_id: newRole === 'BRANCH' ? newBranchId : null,
      });

      setFeedback({
        type: 'success',
        message: `New user account "${newUsername}" created with role ${newRole}!`,
      });

      setShowCreateModal(false);
      // reset
      setNewUsername('');
      setNewPassword('password123');
      setNewFullName('');
      setNewEmail('');
      loadUsers();
      if (onUsersUpdated) onUsersUpdated();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create user' });
    }
  };

  const handleToggleStatus = async (user: AppUser) => {
    try {
      await api.toggleUserStatus(user.id);
      loadUsers();
      setFeedback({
        type: 'success',
        message: `User "${user.username}" status updated.`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to update status' });
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white">Administrator</span>;
      case 'AC':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Area Manager (AC)</span>;
      case 'GSD':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Purchasing / GSD</span>;
      case 'WAREHOUSE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Warehouse Manager</span>;
      case 'BRANCH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Branch Custodian</span>;
      case 'IT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">IT Requester</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">{role}</span>;
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.warehouse_name && u.warehouse_name.toLowerCase().includes(search.toLowerCase())) ||
      (u.branch_name && u.branch_name.toLowerCase().includes(search.toLowerCase()));

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

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
          <div className="p-3 bg-slate-900 rounded-xl text-white shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900">User Access Control & Role Assignment</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white">
                Admin Exclusive
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Administrators assign permissions, designate stakeholder roles, and bind users to regional warehouses and branches.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Staff User</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff name, username, facility..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="font-semibold text-slate-500">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="ADMIN">Administrators</option>
            <option value="IT">IT Requesters</option>
            <option value="AC">Area Managers (AC)</option>
            <option value="GSD">Purchasing / GSD</option>
            <option value="WAREHOUSE">Warehouse Managers</option>
            <option value="BRANCH">Branch Custodians</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-3 px-3.5">Staff User & Profile</th>
                <th className="py-3 px-3.5">Assigned Role</th>
                <th className="py-3 px-3.5">Assigned Facility Node</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Admin Role Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No users found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    {/* User info */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900 text-sm">{u.full_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        @{u.username} • {u.email}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-3.5">
                      {getRoleBadge(u.role)}
                    </td>

                    {/* Facility */}
                    <td className="py-3 px-3.5">
                      {u.warehouse_name ? (
                        <div className="flex items-center space-x-1.5 text-slate-800">
                          <WarehouseIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="font-medium">{u.warehouse_code} - {u.warehouse_name}</span>
                        </div>
                      ) : u.branch_name ? (
                        <div className="flex items-center space-x-1.5 text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="font-medium">{u.branch_code} - {u.branch_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Global / Enterprise Access</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                          u.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                        title="Click to toggle status"
                      >
                        {u.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-right">
                      <button
                        onClick={() => handleOpenAssignModal(u)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 shadow-2xs transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Assign Role & Node</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Assignment Modal */}
      {showAssignModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 text-xs">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Assign Role: {selectedUser.full_name}</h3>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoleAssignment} className="p-5 space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-800">{selectedUser.full_name}</div>
                <div className="text-[11px] text-slate-500 font-mono">@{selectedUser.username} • {selectedUser.email}</div>
              </div>

              {/* Role Picker */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">Select Assigned Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { role: 'IT', label: 'IT Requester', desc: 'Hardware Requisitions' },
                    { role: 'AC', label: 'Area Manager (AC)', desc: 'Requisition Approvals' },
                    { role: 'GSD', label: 'Purchasing / GSD', desc: 'Stock Replenishment' },
                    { role: 'WAREHOUSE', label: 'Warehouse Manager', desc: 'WH Stock & Dispatch' },
                    { role: 'BRANCH', label: 'Branch Custodian', desc: 'Delivery Acceptance' },
                    { role: 'ADMIN', label: 'Administrator', desc: 'Full System Access' },
                  ] as const).map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => setAssignRole(r.role)}
                      className={`p-2.5 rounded-lg border text-left transition ${
                        assignRole === r.role
                          ? 'bg-blue-50 border-blue-600 text-blue-800 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold">{r.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Facility Node Picker */}
              {(assignRole === 'WAREHOUSE' || assignRole === 'AC' || assignRole === 'IT') && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Warehouse (22 Regional Warehouses)
                  </label>
                  <select
                    value={assignWarehouseId || 1}
                    onChange={(e) => setAssignWarehouseId(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.code} - {wh.name} ({wh.region})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {assignRole === 'BRANCH' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Branch (112 Connected Branches)
                  </label>
                  <select
                    value={assignBranchId || 1}
                    onChange={(e) => setAssignBranchId(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name} ({b.region})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Confirm Role Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 text-xs">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Register New Staff User</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. jdoe_warehouse"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Temporary Initial Password *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. password123"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name & Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe (Lead WH Supervisor)"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john.doe@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role Assigned by Admin *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <option value="IT">IT Requester</option>
                  <option value="AC">Area Manager (AC)</option>
                  <option value="GSD">Purchasing / GSD</option>
                  <option value="WAREHOUSE">Warehouse Manager</option>
                  <option value="BRANCH">Branch Custodian</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              {/* Conditional Facility Assignment */}
              {(newRole === 'WAREHOUSE' || newRole === 'AC' || newRole === 'IT') && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Warehouse</label>
                  <select
                    value={newWarehouseId || 1}
                    onChange={(e) => setNewWarehouseId(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {newRole === 'BRANCH' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Branch</label>
                  <select
                    value={newBranchId || 1}
                    onChange={(e) => setNewBranchId(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm"
                >
                  Register User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
