import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import Modal from '../components/Modal';
import StatusPill from '../components/StatusPill';
import { useOptimistic } from '../components/useOptimistic';
import { useToast } from '../components/Toast';
import { createDesign, deleteDesign, getDesigns, updateDesign } from '../mock/api';
import type { DesignCreateInput, DesignRegisterRow, DesignStatus } from '../mock/types';
import DesignFormModal from './DesignFormModal';
import CardListToggle from '../components/CardListToggle';
import DesignCard from './DesignCard';

const STATUS_OPTIONS: DesignStatus[] = ['active', 'archived', 'draft'];

export default function DesignsPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { items, setItems, optimistic } = useOptimistic<DesignRegisterRow>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<DesignRegisterRow | null>(null);
  const [viewing, setViewing] = useState<DesignRegisterRow | null>(null);
  const [deleting, setDeleting] = useState<DesignRegisterRow | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [cardQuery, setCardQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await getDesigns();
    setItems(rows);
    setLoading(false);
  }, [setItems]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))),
    [items],
  );
  const columns: SpreadsheetColumn[] = useMemo(
    () => [
      { title: 'Design Code', field: 'design_code', headerFilter: true, headerFilterType: 'input', frozen: true },
      { title: 'Style Type', field: 'style_type', headerFilter: true, headerFilterType: 'list' },
      {
        title: 'Category',
        field: 'category',
        headerFilter: true,
        headerFilterType: 'list',
        editor: 'select',
        editorParams: { values: categories },
      },
      { title: 'Buyer', field: 'buyer', headerFilter: true, headerFilterType: 'input', editor: true },
      { title: 'Version', field: 'current_version', minWidth: 90 },
      {
        title: 'Status',
        field: 'status',
        headerFilter: true,
        headerFilterType: 'list',
        editor: 'select',
        editorParams: { values: STATUS_OPTIONS },
      },
      { title: 'Live POs', field: 'live_po_count', hozAlign: 'right', bottomCalc: 'sum' },
      { title: 'Completed POs', field: 'completed_po_count', hozAlign: 'right', bottomCalc: 'sum' },
      { title: 'Created', field: 'created_at', headerFilter: true, headerFilterType: 'date', minWidth: 120 },
      { title: 'Issue Date', field: 'issue_date', headerFilter: true, headerFilterType: 'date', minWidth: 110 },
      { title: 'Block', field: 'block', headerFilter: true, headerFilterType: 'input' },
      { title: 'Designer', field: 'designer', headerFilter: true, headerFilterType: 'input' },
      { title: 'Size', field: 'size', headerFilter: true, headerFilterType: 'input' },
      { title: 'Issuer', field: 'issuer', headerFilter: true, headerFilterType: 'input' },
      { title: 'Length', field: 'length', headerFilter: true, headerFilterType: 'input' },
      { title: 'Description', field: 'description', headerFilter: true, headerFilterType: 'input' },
      { title: 'Design Notes', field: 'design_notes', headerFilter: true, headerFilterType: 'input' },
      { title: 'Materials', field: 'material_count', hozAlign: 'right' },
    ],
    [categories],
  );

  const gridData = useMemo(
    () => items.map((r) => ({ ...r, material_count: r.materials.length })),
    [items],
  );

  const filtered = useMemo(() => {
    const q = cardQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((d) =>
      [d.design_code, d.style_type ?? '', d.category, d.buyer].join(' ').toLowerCase().includes(q),
    );
  }, [items, cardQuery]);

  const handleCellEdited = async (field: string, value: unknown, row: Record<string, unknown>) => {
    if (typeof value !== 'string') return;
    if (field !== 'category' && field !== 'buyer' && field !== 'status') return;
    try {
      await optimistic(String(row.id), { [field]: value }, async (id) => {
        const next = await updateDesign(id, { [field]: value });
        if (!next) throw new Error('Design update failed');
        return next;
      });
    } catch {
      addToast('Failed to update design', 'error');
    }
  };

  const handleSave = async (input: DesignCreateInput) => {
    if (showForm === 'edit' && editing) {
      try {
        await optimistic(editing.id, input, async (id) => {
          const next = await updateDesign(id, input);
          if (!next) throw new Error('Design update failed');
          return next;
        });
        addToast('Design updated');
      } catch {
        addToast('Failed to update design', 'error');
      }
    } else {
      await createDesign(input);
      await load();
      addToast('Design created');
    }
    setShowForm(null);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const ok = await deleteDesign(deleting.id);
    if (ok) {
      setItems((prev) => prev.filter((d) => d.id !== deleting.id));
      addToast('Design deleted');
    } else {
      addToast('Failed to delete design', 'error');
    }
    setDeleting(null);
  };

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-heading">Design Register</h1>
          <p className="text-sm text-muted mt-1">Design sheets across the buying house</p>
        </div>
        <div className="flex items-center gap-2">
          <CardListToggle view={view} onChange={setView} />
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm('add');
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + New Design
          </button>
        </div>
      </div>

      <div className="mt-5">
        {view === 'list' ? (
          <SpreadsheetGrid
            data={gridData}
            columns={columns}
            height={480}
            toolbar
            title="Design Register"
            exportable
            printable
            printTitle="Design Register"
            columnChooser
            paginationSize={15}
            loading={loading}
            actionColumn
            onAdd={() => {
              setEditing(null);
              setShowForm('add');
            }}
            onView={(row) => setViewing(row as unknown as DesignRegisterRow)}
            onEdit={(row) => {
              const match = items.find((d) => d.id === String(row.id));
              if (match) {
                setEditing(match);
                setShowForm('edit');
              }
            }}
            onDelete={(row) => {
              const match = items.find((d) => d.id === String(row.id));
              if (match) setDeleting(match);
            }}
            onRowClick={(row) => setViewing(row as unknown as DesignRegisterRow)}
            onCellEdited={handleCellEdited}
            rowActions={(row) => [
              {
                label: 'Materials',
                action: () => navigate(`/designs/${String(row.design_code)}/materials`),
              },
              {
                label: 'Fit Specs',
                action: () => navigate(`/designs/${String(row.design_code)}/fits`),
              },
              {
                label: 'Job Description',
                action: () => navigate(`/designs/${String(row.design_code)}/jobs`),
              },
              {
                label: 'Costings',
                action: () => navigate(`/designs/${String(row.design_code)}/costings`),
              },
              {
                label: 'Print Design Sheet',
                action: () => navigate(`/designs/${String(row.design_code)}/print`),
              },
              {
                label: 'Sales Report',
                action: () => navigate(`/designs/${String(row.design_code)}/sales-report`),
              },
            ]}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <input
                data-testid="card-search"
                type="search"
                value={cardQuery}
                onChange={(e) => setCardQuery(e.target.value)}
                placeholder="Search design code, style type, category or buyer…"
                className="w-full max-w-xs px-3 py-2 text-sm bg-surface border border-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-muted">{filtered.length} designs</span>
            </div>
            {filtered.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-12 text-center">
                <p className="text-sm text-muted">
                  {loading ? 'Loading designs…' : 'No designs match your search.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((d) => (
                  <DesignCard key={d.id} design={d} onView={() => setViewing(d)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <DesignFormModal
          mode={showForm}
          initial={editing ?? undefined}
          onClose={() => {
            setShowForm(null);
            setEditing(null);
          }}
          onSubmit={(input) => void handleSave(input)}
        />
      )}

      {viewing && (
        <Modal
          open
          onClose={() => setViewing(null)}
          title={`Design ${viewing.design_code}`}
          maxWidthClass="max-w-3xl"
          contentClassName="max-h-[75vh] overflow-y-auto"
          footer={
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewing(null);
                    navigate(`/designs/${viewing.design_code}`);
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                >
                  Open full design
                </button>
                <Link
                  to={`/designs/${viewing.design_code}/print`}
                  className="px-3 py-1.5 text-sm font-medium text-emerald-600 border border-emerald-600/40 hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  Print Design Sheet
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="px-3 py-1.5 text-sm text-body border border-input-border rounded-lg hover:text-heading transition-colors"
              >
                Close
              </button>
            </div>
          }
        >
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">Design Code</dt>
              <dd className="text-heading font-medium mt-0.5">{viewing.design_code}</dd>
            </div>
            <div>
              <dt className="text-muted">Style Type</dt>
              <dd className="text-heading font-medium mt-0.5">{viewing.style_type ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Category</dt>
              <dd className="text-heading font-medium mt-0.5">{viewing.category}</dd>
            </div>
            <div>
              <dt className="text-muted">Buyer</dt>
              <dd className="text-heading font-medium mt-0.5">{viewing.buyer}</dd>
            </div>
            <div>
              <dt className="text-muted">Current Version</dt>
              <dd className="text-heading font-medium mt-0.5">{viewing.current_version}</dd>
            </div>
            <div>
              <dt className="text-muted">Status</dt>
              <dd className="mt-0.5">
                <StatusPill value={viewing.status} />
              </dd>
            </div>
            <div>
              <dt className="text-muted">Live POs</dt>
              <dd className="text-heading font-medium mt-0.5">{viewing.live_po_count}</dd>
            </div>
            <div>
              <dt className="text-muted">Completed POs</dt>
              <dd className="text-heading font-medium mt-0.5">{viewing.completed_po_count}</dd>
            </div>
            <div>
              <dt className="text-muted">Issue Date</dt>
              <dd className="text-heading font-medium mt-0.5">{viewing.issue_date || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Block</dt>
              <dd className="text-heading font-medium mt-0.5">{viewing.block || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Designer</dt>
              <dd className="text-heading font-medium mt-0.5">{viewing.designer || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Size</dt>
              <dd className="text-heading font-medium mt-0.5">{viewing.size || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Issuer</dt>
              <dd className="text-heading font-medium mt-0.5">{viewing.issuer || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Length</dt>
              <dd className="text-heading font-medium mt-0.5">{viewing.length || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">Description</dt>
              <dd className="text-heading font-medium mt-0.5">{viewing.description || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">Design Notes</dt>
              <dd className="text-heading font-medium mt-0.5">{viewing.design_notes || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">Sketch</dt>
              <dd className="mt-1">
                {viewing.sketch_url ? (
                  <img
                    src={viewing.sketch_url}
                    alt={`${viewing.design_code} sketch`}
                    className="w-40 h-40 object-cover rounded-lg border border-border"
                  />
                ) : (
                  <span className="text-sm text-muted">No sketch attached</span>
                )}
              </dd>
            </div>
          </dl>

          <hr className="my-6 border-border-subtle" />

          <div data-testid="materials-section">
            <h3 className="text-sm font-medium text-heading mb-2">
              Materials{' '}
              {viewing.materials.length > 0 && (
                <span className="text-xs text-muted font-normal">({viewing.materials.length} items)</span>
              )}
            </h3>
            {viewing.materials.length === 0 ? (
              <p className="text-sm text-muted">No materials added yet</p>
            ) : (
              <div
                data-testid="materials-section-scroll"
                className="overflow-auto max-h-[300px] min-h-[180px] border border-input-border rounded-lg"
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs text-muted">
                      <th className="py-2 pr-3 font-medium">Type</th>
                      <th className="py-2 pr-3 font-medium">Description/Code</th>
                      <th className="py-2 pr-3 font-medium">Location</th>
                      <th className="py-2 pr-3 font-medium">Supplier</th>
                      <th className="py-2 pr-3 font-medium">Colour</th>
                      <th className="py-2 pr-3 font-medium">W/Size</th>
                      <th className="py-2 pr-3 font-medium">Qty/Match</th>
                      <th className="py-2 pr-3 font-medium">Unit</th>
                      <th className="py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewing.materials.map((m) => (
                      <tr key={m.id} data-testid="material-row" className="border-b border-border/40">
                        <td className="py-2 pr-3 text-body">{m.type}</td>
                        <td className="py-2 pr-3 text-body">
                          <div className="font-medium text-heading">{m.description}</div>
                          <div className="text-xs text-muted">{m.code}</div>
                        </td>
                        <td className="py-2 pr-3 text-body">{m.location}</td>
                        <td className="py-2 pr-3 text-body">{m.supplier}</td>
                        <td className="py-2 pr-3 text-body">{m.colour}</td>
                        <td className="py-2 pr-3 text-body">{m.width_size}</td>
                        <td className="py-2 pr-3 text-body">{m.qty}</td>
                        <td className="py-2 pr-3 text-body">{m.unit}</td>
                        <td className="py-2 text-muted">{m.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal
          open
          onClose={() => setDeleting(null)}
          title="Delete design"
          footer={
            <>
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="px-3 py-1.5 text-sm text-body border border-input-border rounded-lg hover:text-heading transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                Delete
              </button>
            </>
          }
        >
          <p className="text-sm text-body">
            Delete design <span className="font-medium text-heading">{deleting.design_code}</span>? This
            cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}