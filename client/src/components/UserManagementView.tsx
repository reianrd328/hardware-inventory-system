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
  UserX,
  Edit,
  Key,
  Eye,
  EyeOff,
  Power,
  PowerOff,
  Lock,
  X,
  Sparkles,
  AlertCircle,
  Check
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

  // Comprehensive Edit User Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editRole, setEditRole] = useState<UserRole>('IT');
  const [editWarehouseId, setEditWarehouseId] = useState<number | null>(null);
  const [editBranchId, setEditBranchId] = useState<number | null>(null);
  const [editIsActive, setEditIsActive] = useState<number>(1);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Register New User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [showNewPassword, setShowNewPassword] = useState(false);
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

  const handleOpenEditModal = (user: AppUser) => {
    setEditingUser(user);
    setEditFullName(user.full_name || '');
    setEditUsername(user.username || '');
    setEditEmail(user.email || '');
    setEditPassword('');
    setShowEditPassword(false);
    setEditRole(user.role);
    setEditWarehouseId(user.assigned_warehouse_id || (warehouses[0]?.id ?? 1));
    setEditBranchId(user.assigned_branch_id || (branches[0]?.id ?? 1));
    setEditIsActive(user.is_active !== undefined ? user.is_active : 1);
    setShowEditModal(true);
  };

  const handleGenerateEditPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = 'Pass_';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditPassword(pass);
    setShowEditPassword(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editUsername.trim()) {
      setFeedback({ type: 'error', message: 'Username is required' });
      return;
    }
    if (!editFullName.trim()) {
      setFeedback({ type: 'error', message: 'Full name is required' });
      return;
    }

    try {
      setIsSavingUser(true);
      const res = await api.updateUser(editingUser.id, {
        username: editUsername.trim(),
        full_name: editFullName.trim(),
        email: editEmail.trim(),
        password: editPassword.trim() ? editPassword.trim() : undefined,
        role: editRole,
        assigned_warehouse_id: (editRole === 'WAREHOUSE' || editRole === 'AC' || editRole === 'IT') ? editWarehouseId : null,
        assigned_branch_id: editRole === 'BRANCH' ? editBranchId : null,
        is_active: editIsActive,
      });

      setFeedback({
        type: 'success',
        message: res.message || `User account "${editFullName}" updated successfully!`,
      });

      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
      if (onUsersUpdated) onUsersUpdated();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update user account' });
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        username: newUsername.trim(),
        password: newPassword.trim(),
        full_name: newFullName.trim(),
        email: newEmail.trim(),
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
      setShowNewPassword(false);
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
    if (user.username.toLowerCase() === 'admin' && user.is_active === 1) {
      setFeedback({
        type: 'error',
        message: 'The primary Administrator account cannot be disabled.',
      });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    try {
      const res = await api.toggleUserStatus(user.id);
      loadUsers();
      if (onUsersUpdated) onUsersUpdated();
      setFeedback({
        type: 'success',
        message: res.message || `User "${user.username}" status updated successfully.`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update status' });
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
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-50/70 transition ${
                      !u.is_active ? 'bg-slate-50/50 opacity-75' : ''
                    }`}
                  >
                    {/* User info */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">{u.full_name}</span>
                        {!u.is_active && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            Deactivated
                          </span>
                        )}
                      </div>
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

                    {/* Status Toggle Button */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={u.username.toLowerCase() === 'admin'}
                        title={
                          u.username.toLowerCase() === 'admin'
                            ? 'Primary Administrator account cannot be disabled'
                            : u.is_active
                            ? 'Click to disable user account'
                            : 'Click to enable user account'
                        }
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition shadow-2xs ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        } ${u.username.toLowerCase() === 'admin' ? 'cursor-default opacity-90' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          }`}
                        />
                        <span>{u.is_active ? 'Active' : 'Disabled'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Edit User & Credentials Button */}
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 shadow-2xs transition"
                          title="Edit user profile info, username, password and permissions"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit Info & Password</span>
                        </button>

                        {/* Quick Enable / Disable Action Button */}
                        {u.is_active ? (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={u.username.toLowerCase() === 'admin'}
                            title={
                              u.username.toLowerCase() === 'admin'
                                ? 'Admin account cannot be deactivated'
                                : `Deactivate account for @${u.username}`
                            }
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 shadow-2xs transition disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Disable</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            title={`Re-enable account for @${u.username}`}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 shadow-2xs transition"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Enable</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Edit User Account & Credentials Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 text-xs my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-400/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Edit User Account & Credentials</h3>
                  <p className="text-[11px] text-slate-400">
                    Editing: <span className="text-white font-semibold">{editingUser.full_name}</span> (@{editingUser.username})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Profile Identity Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name & Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="e.g. John Doe (Supervisor)"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Login Username <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                    <input
                      type="text"
                      required
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="username"
                      className="w-full pl-6 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="e.g. jdoe@company.com"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Password Section (Optional Reset) */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-600" />
                    <span>Reset / Update Login Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateEditPassword}
                    className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center space-x-1 hover:underline"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Password</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Leave this field blank to keep the current password unchanged. Enter a new password only to reset.
                </p>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="•••••••• (Leave blank to keep unchanged)"
                    className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title={showEditPassword ? 'Hide password' : 'Show password'}
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {editPassword && (
                  <div className="text-[11px] text-emerald-700 font-medium flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>New password will be: <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200">{editPassword}</span></span>
                  </div>
                )}
              </div>

              {/* Role Selection Grid */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Select System Role & Permissions <span className="text-rose-500">*</span>
                </label>
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
                      onClick={() => setEditRole(r.role)}
                      className={`p-2.5 rounded-lg border text-left transition ${
                        editRole === r.role
                          ? 'bg-blue-50 border-blue-600 text-blue-800 ring-1 ring-blue-500/30'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold">{r.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Facility Node Binding */}
              {(editRole === 'WAREHOUSE' || editRole === 'AC' || editRole === 'IT') && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Regional Warehouse (22 Operational Warehouses)
                  </label>
                  <select
                    value={editWarehouseId || 1}
                    onChange={(e) => setEditWarehouseId(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:bg-white"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.code} - {wh.name} ({wh.region})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editRole === 'BRANCH' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Branch Node (112 Connected Branches)
                  </label>
                  <select
                    value={editBranchId || 1}
                    onChange={(e) => setEditBranchId(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:bg-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name} ({b.region})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(editRole === 'ADMIN' || editRole === 'GSD') && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-[11px] flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span><strong>Global Scope:</strong> This role has enterprise-wide access across all warehouses and branch facilities.</span>
                </div>
              )}

              {/* Account Status (Enable / Disable) */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block font-bold text-slate-800 mb-1.5">
                  Account Login Status
                </label>
                {editingUser.username.toLowerCase() === 'admin' ? (
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-[11px] flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>The primary <strong>Administrator</strong> account must remain active to prevent system lockout.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditIsActive(1)}
                      className={`p-2.5 rounded-lg border text-left flex items-center space-x-2 transition ${
                        editIsActive === 1
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-400/30'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${editIsActive === 1 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <div>
                        <div className="font-bold text-xs">Enabled (Active)</div>
                        <div className="text-[10px] text-slate-500">Permitted to sign in</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditIsActive(0)}
                      className={`p-2.5 rounded-lg border text-left flex items-center space-x-2 transition ${
                        editIsActive === 0
                          ? 'bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-400/30'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${editIsActive === 0 ? 'bg-rose-500' : 'bg-slate-300'}`} />
                      <div>
                        <div className="font-bold text-xs">Disabled (Deactivated)</div>
                        <div className="text-[10px] text-slate-500">Sign-in blocked immediately</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition"
                  disabled={isSavingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition inline-flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSavingUser ? (
                    <span>Saving Changes...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save User Changes</span>
                    </>
                  )}
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
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="e.g. password123"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
