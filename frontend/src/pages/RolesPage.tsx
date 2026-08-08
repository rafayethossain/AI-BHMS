import { useState, useEffect, type FormEvent } from 'react';
import { usersApi } from '../api/client';
import type { Role, Permission } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

export default function RolesPage() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      const res = await usersApi.getRoles(params);
      setRoles(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load roles'); } finally { setLoading(false); }
  };

  const fetchPermissions = async () => {
    try {
      const res = await usersApi.getPermissions({ page_size: '500' });
      setPermissions(res.data.results);
    } catch { toast('error', 'Failed to load permissions'); }
  };

  useEffect(() => { fetchData(); }, [search, page, sortField, sortOrder]);
  useEffect(() => { fetchPermissions(); }, []);

  const openCreate = () => {
    setEditingRole(null);
    setForm({ name: '', description: '', permissions: [] });
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(p => p.id),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        permissions: form.permissions,
      };
      if (editingRole) {
        await usersApi.updateRole(editingRole.id, payload);
        toast('success', 'Role updated');
      } else {
        await usersApi.createRole(payload);
        toast('success', 'Role created');
      }
      setShowModal(false);
      fetchData();
    } catch { toast('error', editingRole ? 'Failed to update role' : 'Failed to create role'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await usersApi.deleteRole(id); setDeleteId(null); toast('success', 'Role deleted'); fetchData(); } catch { toast('error', 'Failed to delete role'); }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const togglePermission = (permId: string) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(id => id !== permId)
        : [...prev.permissions, permId],
    }));
  };

  const permissionsByModule = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const columns: Column[] = [
    { key: 'name', label: 'Name', sortable: true, render: (v) => <span className="font-medium text-heading">{String(v)}</span> },
    { key: 'description', label: 'Description', sortable: true, render: (v) => <span className="text-body">{String(v || '-')}</span> },
    { key: 'is_system', label: 'System', sortable: true,
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${v ? 'bg-amber-500/20 text-badge-amber' : 'bg-surface-alt/50 text-muted'}`}>{v ? 'Yes' : 'No'}</span> },
    { key: 'permissions', label: 'Permissions', sortable: false,
      render: (v) => {
        const perms = v as Permission[];
        return <span className="text-body text-sm">{perms?.length ?? 0} permissions</span>;
      },
    },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const r = row as unknown as Role;
      return (
        <div className="flex justify-end gap-3">
          <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="text-sm text-blue-400 hover:text-blue-300">Edit</button>
          {!r.is_system && (
            <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }} className="text-sm text-red-400 hover:text-red-300">Delete</button>
          )}
        </div>
      );
    }},
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Roles</h1>
            <p className="text-muted text-sm mt-1">{count} total roles</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            + New Role
          </button>
        </div>

        <DataTable
          data={roles as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search roles..."
          onSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
          loading={loading}
        />
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editingRole ? 'Edit Role' : 'New Role'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Role name" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-body mb-2">Permissions</label>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {Object.entries(permissionsByModule).map(([module, perms]) => (
                    <div key={module}>
                      <div className="text-xs font-medium text-muted uppercase tracking-wider mb-1">{module}</div>
                      <div className="flex flex-wrap gap-2">
                        {perms.map(p => (
                          <label key={p.id} className="flex items-center gap-1.5 px-2 py-1 bg-input border border-input-border rounded text-xs cursor-pointer hover:bg-surface-alt transition-colors">
                            <input type="checkbox" checked={form.permissions.includes(p.id)} onChange={() => togglePermission(p.id)}
                              className="w-3 h-3 rounded bg-surface-alt border-input-border text-emerald-500 focus:ring-emerald-500" />
                            <span className="text-body">{p.action}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  {Object.keys(permissionsByModule).length === 0 && (
                    <p className="text-sm text-faint">No permissions available</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {saving ? 'Saving...' : editingRole ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Role?</h2>
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
