import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { usersApi } from '../api/client';
import type { User, Role, UserRole } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';
import SearchableSelect from '../components/SearchableSelect';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-badge-emerald',
  inactive: 'bg-surface-alt/50 text-muted',
  suspended: 'bg-red-500/20 text-badge-red',
};

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-purple-500/20 text-badge-purple',
  Manager: 'bg-blue-500/20 text-badge-blue',
  Merchandiser: 'bg-emerald-500/20 text-badge-emerald',
  'Production Manager': 'bg-amber-500/20 text-badge-amber',
  'Quality Manager': 'bg-red-500/20 text-badge-red',
  'Commercial Manager': 'bg-blue-500/20 text-badge-blue',
  'Shipping Manager': 'bg-emerald-500/20 text-badge-emerald',
  Viewer: 'bg-surface-alt/50 text-muted',
};

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
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
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
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

  useEffect(() => { fetchData(); }, [search, page, sortField, sortOrder]);
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

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : '-';

  const columns: Column[] = [
    { key: 'full_name', label: 'Name', sortable: true, render: (v) => <span className="font-medium text-heading">{String(v || '-')}</span> },
    { key: 'email', label: 'Email', sortable: true, render: (v) => <span className="text-body">{String(v)}</span> },
    { key: 'roles', label: 'Roles', sortable: false,
      render: (_v, row) => {
        const u = row as unknown as User;
        const roles = u.roles || [];
        if (roles.length === 0) return <span className="text-muted text-xs">No roles</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((r) => (
              <span key={r} className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[r] || 'bg-surface-alt/50 text-muted'}`}>{r}</span>
            ))}
          </div>
        );
      }},
    { key: 'status', label: 'Status', sortable: true,
      render: (v) => {
        const s = String(v || 'active');
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s] || STATUS_COLORS.active}`}>{s}</span>;
      }},
    { key: 'mfa_enabled', label: 'MFA', sortable: false,
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs ${v ? 'bg-emerald-500/20 text-badge-emerald' : 'bg-surface-alt/50 text-muted'}`}>{v ? 'Enabled' : 'Disabled'}</span> },
    { key: 'last_login', label: 'Last Login', sortable: true, render: (v) => <span className="text-muted text-xs">{formatDate(v as string | null)}</span> },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => (
      <div className="flex justify-end gap-3">
        <button onClick={(e) => { e.stopPropagation(); openEdit(row as unknown as User); }} className="text-sm text-blue-400 hover:text-blue-300">Edit</button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(String(row.id)); }} className="text-sm text-red-400 hover:text-red-300">Delete</button>
      </div>
    )},
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

        <DataTable
          data={users as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search users..."
          onSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
          loading={loading}
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
