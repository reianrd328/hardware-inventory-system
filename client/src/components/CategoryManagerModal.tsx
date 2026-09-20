import React, { useState, useEffect } from 'react';
import { HardwareCategory } from '../types';
import { api } from '../services/api';
import {
  X,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Cpu,
  Monitor,
  HardDrive,
  Network,
  Printer,
  Zap,
  Server,
  Box,
  Tablet,
  Shield,
  Tag,
  AlertTriangle,
  RotateCcw,
  Check
} from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesUpdated: () => void;
}

const AVAILABLE_ICONS = [
  { name: 'Cpu', label: 'CPU / PC', icon: Cpu },
  { name: 'Monitor', label: 'Monitor', icon: Monitor },
  { name: 'HardDrive', label: 'Storage / RAM', icon: HardDrive },
  { name: 'Network', label: 'Networking', icon: Network },
  { name: 'Printer', label: 'Printer / POS', icon: Printer },
  { name: 'Zap', label: 'Power / UPS', icon: Zap },
  { name: 'Server', label: 'Server / Rack', icon: Server },
  { name: 'Tablet', label: 'Mobile / Tablet', icon: Tablet },
  { name: 'Shield', label: 'Security / Access', icon: Shield },
  { name: 'Layers', label: 'General Equipment', icon: Layers },
  { name: 'Box', label: 'Packaging / Parts', icon: Box },
  { name: 'Tag', label: 'Other Peripherals', icon: Tag }
];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  onCategoriesUpdated
}) => {
  const [categories, setCategories] = useState<HardwareCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Layers');
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await api.getCategories();
      setCategories(data);
      if (data.length === 0) {
        setShowAddForm(true);
      }
    } catch (err: any) {
      console.error('Failed to load categories', err);
      setFeedback({ type: 'error', message: err.message || 'Error loading categories' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setFeedback(null);
      setConfirmClear(false);
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setEditingCategoryId(null);
    setName('');
    setDescription('');
    setSelectedIcon('Layers');
    setShowAddForm(categories.length === 0);
  };

  const handleStartEdit = (cat: HardwareCategory) => {
    setEditingCategoryId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setSelectedIcon(cat.icon || 'Layers');
    setShowAddForm(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Category name cannot be empty.' });
      return;
    }

    try {
      if (editingCategoryId) {
        await api.updateCategory(editingCategoryId, {
          name: name.trim(),
          description: description.trim(),
          icon: selectedIcon
        });
        setFeedback({ type: 'success', message: `Category "${name.trim()}" updated successfully!` });
      } else {
        await api.createCategory({
          name: name.trim(),
          description: description.trim(),
          icon: selectedIcon
        });
        setFeedback({ type: 'success', message: `New category "${name.trim()}" created successfully!` });
      }

      resetForm();
      await loadCategories();
      onCategoriesUpdated();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save category.' });
    }
  };

  const handleDeleteCategory = async (cat: HardwareCategory) => {
    if (!window.confirm(`Are you sure you want to delete the category "${cat.name}"?`)) {
      return;
    }

    try {
      await api.deleteCategory(cat.id, true);
      setFeedback({ type: 'success', message: `Category "${cat.name}" removed.` });
      await loadCategories();
      onCategoriesUpdated();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete category.' });
    }
  };

  const handleClearAllCategories = async () => {
    try {
      const res = await api.clearAllCategories();
      setFeedback({
        type: 'success',
        message: `All mock categories and catalog items cleared! Backup saved: ${res.backup?.filename || 'complete'}.`
      });
      setConfirmClear(false);
      resetForm();
      await loadCategories();
      onCategoriesUpdated();
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to clear categories.' });
    }
  };

  const handleRestoreDefaults = async () => {
    if (!window.confirm('Restore standard factory hardware categories?')) {
      return;
    }
    try {
      await api.resetDefaultCategories();
      setFeedback({ type: 'success', message: 'Default hardware categories restored successfully.' });
      await loadCategories();
      onCategoriesUpdated();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to restore defaults.' });
    }
  };

  if (!isOpen) return null;

  const renderIcon = (iconName: string) => {
    const found = AVAILABLE_ICONS.find((i) => i.name.toLowerCase() === iconName.toLowerCase());
    const IconComp = found ? found.icon : Layers;
    return <IconComp className="w-4 h-4" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Hardware Category Management</h3>
              <p className="text-[11px] text-slate-400">
                Customize equipment classifications for company hardware inventory
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Feedback alert */}
          {feedback && (
            <div
              className={`p-3 rounded-xl font-semibold flex items-center justify-between shadow-xs ${
                feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <span>{feedback.message}</span>
              <button onClick={() => setFeedback(null)} className="text-slate-500 hover:text-slate-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800 text-xs">
                Registered Categories: {categories.length}
              </span>
              {categories.length === 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Clean Slate Ready
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  if (showAddForm && !editingCategoryId) {
                    setShowAddForm(false);
                  } else {
                    resetForm();
                    setShowAddForm(true);
                  }
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddForm && !editingCategoryId ? 'Close Form' : '+ New Category'}</span>
              </button>

              {categories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold transition"
                  title="Wipe mock categories and catalog items to input company records manually"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Records</span>
                </button>
              )}
            </div>
          </div>

          {/* Confirm Clear Danger Card */}
          {confirmClear && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5 animate-fadeIn">
              <div className="flex items-start space-x-2 text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs">Confirm Category & Catalog Wipe</h4>
                  <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                    This action will remove all current hardware categories and their demo catalog items so you can enter your company's actual categories manually.
                    An automatic database backup will be created before deletion.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearAllCategories}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs transition"
                >
                  Yes, Clear All Mock Categories
                </button>
              </div>
            </div>
          )}

          {/* Category Input / Edit Form */}
          {showAddForm && (
            <form onSubmit={handleSaveCategory} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs">
                  {editingCategoryId ? 'Edit Category' : 'Create New Hardware Category'}
                </h4>
                {editingCategoryId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-[11px] text-slate-500 hover:text-slate-700"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. CPU & Workstations, Point-of-Sale, Displays"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category Icon
                  </label>
                  <select
                    value={selectedIcon}
                    onChange={(e) => setSelectedIcon(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {AVAILABLE_ICONS.map((icon) => (
                      <option key={icon.name} value={icon.name}>
                        {icon.label} ({icon.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description / Subtitle
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Desktop computers, micro-PCs, towers, POS controller units"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 font-medium"
                >
                  Clear Fields
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition"
                >
                  {editingCategoryId ? 'Update Category' : '+ Add Category'}
                </button>
              </div>
            </form>
          )}

          {/* Empty State when 0 categories */}
          {categories.length === 0 && !loading && (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-3">
              <div className="w-12 h-12 mx-auto bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-center text-amber-600">
                <Layers className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">No Hardware Categories Configured</h4>
                <p className="text-[11px] text-slate-500">
                  All mock category records have been removed. Use the form above to add your company's actual equipment categories (e.g. Desktops, Monitors, POS Terminals, Network Switches).
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs text-xs"
                >
                  + Add Your First Category
                </button>
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium rounded-lg text-xs"
                >
                  Restore Standard Presets
                </button>
              </div>
            </div>
          )}

          {/* Categories Table / List */}
          {categories.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                    <th className="p-3">Category Name</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-center">Catalog Items</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                            {renderIcon(cat.icon)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{cat.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID #{cat.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">
                        {cat.description || '—'}
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {cat.item_count ?? 0} items
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                            title="Edit Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-slate-800 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restore Standard Defaults</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
