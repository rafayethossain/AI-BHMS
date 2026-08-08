import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import DataTable, { type Column } from '../components/DataTable';
import SearchableSelect from '../components/SearchableSelect';
import { setupApi } from '../api/client';
import { useToast } from '../contexts/ToastContext';

const OFFICE_TYPE_OPTIONS = [
  { value: 'hq', label: 'Headquarters' },
  { value: 'branch', label: 'Branch' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'factory', label: 'Factory' },
];

const OFFICE_TYPE_LABELS: Record<string, string> = {
  hq: 'Headquarters',
  branch: 'Branch',
  warehouse: 'Warehouse',
  factory: 'Factory',
};

interface OfficeRow {
  id: string;
  code: string;
  name: string;
  office_type: string;
  address: string;
  city: string;
  country: string | null;
  phone: string;
  email: string;
  is_active: boolean;
  status?: string;
}

const COLUMNS: Column[] = [
  { key: 'code', label: 'Code', className: 'font-mono text-emerald-400' },
  { key: 'name', label: 'Name' },
  { key: 'city', label: 'City' },
  { key: 'country', label: 'Country' },
  {
    key: 'office_type', label: 'Type',
    render: (v: unknown) => OFFICE_TYPE_LABELS[v as string] || String(v ?? '-'),
  },
  {
    key: 'is_active', label: 'Status',
    render: (v: unknown, row: Record<string, unknown>) => {
      const status = row.status as string | undefined;
      const isActive = status ? status === 'active' : !!v;
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      );
    },
  },
];

const EMPTY_FORM = {
  code: '',
  name: '',
  address: '',
  city: '',
  country: '',
  office_type: '',
  phone: '',
  email: '',
  is_active: 'true',
};

export default function OfficeManagementPage() {
  const { toast } = useToast();
  const [data, setData] = useState<OfficeRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: String(pageSize) };
      if (search) params.search = search;
      const res = await setupApi.getOffices(params);
      setData(res.data.results as unknown as OfficeRow[]);
      setTotalCount(res.data.count);
    } catch {
      toast('error', 'Failed to load offices');
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search]);

  const openCreate = () => {
    setEditingId(null);
    setFormValues(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditingId(row.id as string);
    setFormValues({
      code: (row.code as string) || '',
      name: (row.name as string) || '',
      address: (row.address as string) || '',
      city: (row.city as string) || '',
      country: (row.country as string) || '',
      office_type: (row.office_type as string) || '',
      phone: (row.phone as string) || '',
      email: (row.email as string) || '',
      is_active: row.status === 'inactive' ? 'false' : 'true',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      Object.entries(formValues).forEach(([k, v]) => {
        if (k === 'is_active') {
          payload[k] = v === 'true';
        } else {
          payload[k] = v || null;
        }
      });

      if (editingId) {
        await setupApi.updateOffice(editingId, payload);
        toast('success', 'Office updated successfully');
      } else {
        await setupApi.createOffice(payload);
        toast('success', 'Office created successfully');
      }
      setShowModal(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this office?')) return;
    try {
      await setupApi.deleteOffice(id);
      toast('success', 'Office deleted');
      fetchData();
    } catch {
      toast('error', 'Delete failed');
    }
  };

  const columnsWithActions: Column[] = [
    ...COLUMNS,
    {
      key: '_actions',
      label: 'Actions',
      className: 'text-right',
      render: (_v: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openEdit(row)}
            className="px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(row.id as string)}
            className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const updateField = (field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted mb-1">
              <a href="/setup" className="hover:text-heading transition-colors">Setup</a>
              <span>/</span>
              <span className="text-heading">Offices</span>
            </div>
            <h1 className="text-2xl font-bold text-heading">Offices</h1>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Add Office
          </button>
        </div>

        <DataTable
          data={data as unknown as Record<string, unknown>[]}
          columns={columnsWithActions}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search offices..."
          loading={loading}
          onRowClick={openEdit}
        />

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-heading">
                  {editingId ? 'Edit' : 'Add'} Office
                </h2>
                <button onClick={() => setShowModal(false)} className="text-muted hover:text-heading text-xl leading-none">&times;</button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Code</label>
                  <input
                    type="text"
                    value={formValues.code}
                    onChange={(e) => updateField('code', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-faint"
                    placeholder="Enter office code"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Name</label>
                  <input
                    type="text"
                    value={formValues.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-faint"
                    placeholder="Enter office name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Office Type</label>
                  <SearchableSelect
                    options={OFFICE_TYPE_OPTIONS}
                    value={formValues.office_type || null}
                    onChange={(v) => updateField('office_type', v as string || '')}
                    placeholder="Select office type..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Address</label>
                  <textarea
                    value={formValues.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none placeholder:text-faint"
                    placeholder="Enter address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted mb-1">City</label>
                    <input
                      type="text"
                      value={formValues.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-faint"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-1">Country</label>
                    <input
                      type="text"
                      value={formValues.country}
                      onChange={(e) => updateField('country', e.target.value)}
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-faint"
                      placeholder="Country"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formValues.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-faint"
                      placeholder="Phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-1">Email</label>
                    <input
                      type="email"
                      value={formValues.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-faint"
                      placeholder="Email"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValues.is_active === 'true'}
                    onChange={(e) => updateField('is_active', e.target.checked ? 'true' : 'false')}
                    className="w-4 h-4 rounded bg-surface-alt border-input-border text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-body">Active</span>
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
