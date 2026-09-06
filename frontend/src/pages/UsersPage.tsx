import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { usersApi } from '../api/client';
import type { User, Role, UserRole } from '../api/client';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { useToast } from '../contexts/ToastContext';
import SearchableSelect from '../components/SearchableSelect';
import Layout from '../components/Layout';

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [roleLoading, setRoleLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: '1', page_size: '10000' };
      const res = await usersApi.getUsers(params);
      setUsers(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load users'); } finally { setLoading(false); }
  };

  const fetchRoles = useCallback(async () => {
    try {
      const res = await usersApi.getRoles({ page_size: '500' });
      setAllRoles(res.data.results);
    } catch { /* silent */ }
  }, []);

  const fetchUserRoles = useCallback(async (userId: string) => {
    setRoleLoading(true);
    try {
      const res = await usersApi.getUserRoles({ user: userId, page_size: '500' });
      setUserRoles(res.data.results);
      setSelectedRoleIds(new Set(res.data.results.map(ur => ur.role)));
    } catch { toast('error', 'Failed to load user roles'); } finally { setRoleLoading(false); }
  }, [toast]);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ email: '', username: '', first_name: '', last_name: '', phone: '', password: '', status: 'active' });
    setUserRoles([]);
    setSelectedRoleIds(new Set());
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      email: user.email,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || '',
      password: '',
      status: user.status || 'active',
    });
    fetchUserRoles(user.id);
    setShowModal(true);
  };

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds(prev => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId); else next.add(roleId);
      return next;
    });
  };

  const syncUserRoles = async (userId: string) => {
    const toAdd = Array.from(selectedRoleIds).filter(id => !userRoles.some(ur => ur.role === id));
    const toRemove = userRoles.filter(ur => !selectedRoleIds.has(ur.role));
    for (const roleId of toAdd) {
      try { await usersApi.assignUserRole(userId, roleId); } catch { /* continue */ }
    }
    for (const ur of toRemove) {
      try { await usersApi.removeUserRole(ur.id); } catch { /* continue */ }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        email: form.email,
        username: form.username,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || null,
        status: form.status,
      };
      if (form.password) payload.password = form.password;
      let userId: string;
      if (editingUser) {
        await usersApi.updateUser(editingUser.id, payload);
        userId = editingUser.id;
        toast('success', 'User updated');
      } else {
        const res = await usersApi.createUser(payload) as { data: { id: string } };
        userId = res.data.id;
        toast('success', 'User created');
      }
      await syncUserRoles(userId);
      setShowModal(false);
      fetchData();
    } catch { toast('error', editingUser ? 'Failed to update user' : 'Failed to create user'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await usersApi.deleteUser(id); setDeleteId(null); toast('success', 'User deleted'); fetchData(); } catch { toast('error', 'Failed to delete user'); }
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : '-';

  const gridData = users.map(u => ({
    id: u.id,
    full_name: u.full_name || '-',
    email: u.email,
    roles: (u.roles?.length ? u.roles.join(', ') : 'No roles'),
    status: u.status || 'active',
    mfa_enabled: u.mfa_enabled ? 'Enabled' : 'Disabled',
    last_login: formatDate(u.last_login ?? null),
  }));

  const columns: SpreadsheetColumn[] = [
    { title: 'Name', field: 'full_name', headerFilter: true },
    { title: 'Email', field: 'email', headerFilter: true },
    { title: 'Roles', field: 'roles' },
    { title: 'Status', field: 'status', headerFilter: true },
    { title: 'MFA', field: 'mfa_enabled' },
    { title: 'Last Login', field: 'last_login' },
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-muted text-sm mt-1">{count} total users</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            + New User
          </button>
        </div>

        <SpreadsheetGrid
          title="Users"
          toolbar={true}
          exportable={true}
          columnChooser={true}
          actionColumn={true}
          paginationSize={25}
          height={480}
          loading={loading}
          data={gridData}
          columns={columns}
          onAdd={openCreate}
          onEdit={(row) => {
            const u = users.find(x => x.id === row.id);
            if (u) openEdit(u);
          }}
          onDelete={(row) => setDeleteId(String(row.id))}
        />
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editingUser ? 'Edit User' : 'New User'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">First Name *</label>
                  <input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Last Name *</label>
                  <input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Username *</label>
                <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Password {editingUser ? '(leave blank to keep)' : '*'}</label>
                <input type="password" required={!editingUser} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Status</label>
                <SearchableSelect
                  options={[{value:'active', label:'Active'}, {value:'inactive', label:'Inactive'}, {value:'suspended', label:'Suspended'}]}
                  value={String(form.status)}
                  onChange={(v) => setForm({ ...form, status: String(v || 'active') })}
                />
              </div>

              <div className="border-t border-border pt-4">
                <label className="block text-sm font-medium text-heading mb-2">Role Mapping</label>
                {roleLoading ? (
                  <p className="text-muted text-xs">Loading roles...</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allRoles.length === 0 ? (
                      <p className="text-muted text-xs">No roles available. Create roles first.</p>
                    ) : (
                      allRoles.map((role) => (
                        <label key={role.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-alt/50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedRoleIds.has(role.id)}
                            onChange={() => handleRoleToggle(role.id)}
                            className="w-4 h-4 rounded border-input-border text-emerald-600 focus:ring-emerald-500 bg-input"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-heading font-medium">{role.name}</span>
                            {role.description && <span className="text-xs text-muted ml-2">- {role.description}</span>}
                          </div>
                          {role.is_system && <span className="text-xs text-muted bg-surface-alt/50 px-2 py-0.5 rounded">System</span>}
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {saving ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete User?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
