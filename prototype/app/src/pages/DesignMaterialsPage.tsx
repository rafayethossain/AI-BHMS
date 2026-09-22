import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { addDesignMaterial, deleteDesignMaterial, getDesignByCode, getDesignMaterials, updateDesignMaterial } from '../mock/api';
import type { DesignMaterial, DesignRegisterRow } from '../mock/types';

const MATERIAL_TYPE_OPTIONS = ['Cloth', 'Trims', 'Interfacing', 'Lining', 'Thread', 'Others'];
const UNIT_OPTIONS = ['m', 'pcs', 'pc', 'yd', 'roll'];

const inputCls =
  'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60';

const thCls = 'px-3 py-2.5 text-xs font-medium text-muted whitespace-nowrap text-left border-b border-border/60';

export default function DesignMaterialsPage() {
  const { designCode } = useParams<{ designCode: string }>();
  const { addToast } = useToast();
  const [design, setDesign] = useState<DesignRegisterRow | null>(null);
  const [materials, setMaterials] = useState<DesignMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<'add' | 'edit' | null>(null);
  const [editingMat, setEditingMat] = useState<DesignMaterial | null>(null);
  const [deleting, setDeleting] = useState<DesignMaterial | null>(null);

  useEffect(() => {
    if (!designCode) return;
    let cancelled = false;
    (async () => {
      const [d, mats] = await Promise.all([
        getDesignByCode(designCode),
        getDesignMaterials(designCode),
      ]);
      if (!cancelled) {
        setDesign(d ?? null);
        setMaterials(mats);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [designCode]);

  const refresh = async () => {
    if (!designCode) return;
    const mats = await getDesignMaterials(designCode);
    setMaterials(mats);
  };

  const handleAdd = async (input: Omit<DesignMaterial, 'id'>) => {
    if (!designCode) return;
    try {
      await addDesignMaterial(designCode, input);
      addToast('Material added');
      setShowForm(null);
      await refresh();
    } catch {
      addToast('Failed to add material', 'error');
    }
  };

  const handleEdit = async (input: Omit<DesignMaterial, 'id'>) => {
    if (!designCode || !editingMat) return;
    try {
      await updateDesignMaterial(designCode, editingMat.id, input);
      addToast('Material updated');
      setShowForm(null);
      setEditingMat(null);
      await refresh();
    } catch {
      addToast('Failed to update material', 'error');
    }
  };

  const handleDelete = async () => {
    if (!designCode || !deleting) return;
    try {
      await deleteDesignMaterial(designCode, deleting.id);
      addToast('Material deleted');
      setDeleting(null);
      await refresh();
    } catch {
      addToast('Failed to delete material', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-muted text-sm">
        Loading materials…
      </div>
    );
  }

  if (!design) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted mb-3">Design {designCode} not found.</p>
        <Link to="/design" className="text-sm text-emerald-400 hover:text-emerald-300 underline">
          Back to register
        </Link>
      </div>
    );
  }

  const totalQty = materials.reduce((sum, m) => sum + m.qty, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border/40 px-6 py-4 bg-surface/50">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              to="/design"
              className="text-sm text-muted hover:text-heading transition-colors shrink-0"
            >
              ← Back
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-heading truncate">
                {design.design_code} — Materials
              </h1>
              <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                <span>{design.buyer}</span>
                <span className="text-border-subtle">·</span>
                <span>{design.style_type ?? design.category}</span>
                <span className="text-border-subtle">·</span>
                <span>{materials.length} item{materials.length !== 1 ? 's' : ''}</span>
                <span className="text-border-subtle">·</span>
                <span>Total: {totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setEditingMat(null); setShowForm('add'); }}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shrink-0"
          >
            + Add Material
          </button>
        </div>
      </div>

      {/* Materials table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {materials.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted mb-3">No materials yet. Add the first material for this design.</p>
            <button
              type="button"
              onClick={() => { setEditingMat(null); setShowForm('add'); }}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
            >
              + Add Material
            </button>
          </div>
        ) : (
          <div className="border border-input-border rounded-lg overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-surface-alt border-b border-border/60">
                  <th className={thCls}>Type</th>
                  <th className={thCls}>Description</th>
                  <th className={thCls}>Code</th>
                  <th className={thCls}>Location</th>
                  <th className={thCls}>Supplier</th>
                  <th className={thCls}>Colour</th>
                  <th className={thCls}>W/Size</th>
                  <th className={`${thCls} text-right`}>Qty</th>
                  <th className={thCls}>Unit</th>
                  <th className={thCls}>Notes</th>
                  <th className="w-24 px-3 py-2.5 text-xs font-medium text-muted text-right border-b border-border/60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id} className="border-b border-border/40 hover:bg-surface-alt/30 transition-colors">
                    <td className="px-3 py-2 text-body">{m.type}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-heading">{m.description}</div>
                    </td>
                    <td className="px-3 py-2 text-body">{m.code}</td>
                    <td className="px-3 py-2 text-body">{m.location}</td>
                    <td className="px-3 py-2 text-body">{m.supplier}</td>
                    <td className="px-3 py-2 text-body">{m.colour}</td>
                    <td className="px-3 py-2 text-body">{m.width_size}</td>
                    <td className="px-3 py-2 text-body text-right tabular-nums">
                      {m.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-body">{m.unit}</td>
                    <td className="px-3 py-2 text-muted">{m.notes || '—'}</td>
                    <td className="px-3 py-2 text-right" aria-label="Row actions">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditingMat(m); setShowForm('edit'); }}
                          className="px-2 py-1 text-xs text-amber-400 hover:text-amber-300 hover:bg-surface-alt rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(m)}
                          className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-surface-alt rounded transition-colors"
                        >
                          Delete
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

      {/* Add/Edit Material Modal */}
      {showForm && (
        <MaterialFormModal
          mode={showForm}
          initial={editingMat}
          onClose={() => { setShowForm(null); setEditingMat(null); }}
          onSubmit={showForm === 'add' ? handleAdd : handleEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleting && (
        <Modal
          open
          onClose={() => setDeleting(null)}
          title="Delete Material"
          maxWidthClass="max-w-sm"
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
                onClick={handleDelete}
                className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                Delete
              </button>
            </>
          }
        >
          <p className="text-sm text-body">
            Delete <span className="font-medium text-heading">{deleting.description || deleting.code}</span> from this
            design? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Add / Edit modal ---------- */

interface MaterialFormModalProps {
  mode: 'add' | 'edit';
  initial?: DesignMaterial | null;
  onClose: () => void;
  onSubmit: (input: Omit<DesignMaterial, 'id'>) => void;
}

function MaterialFormModal({ mode, initial, onClose, onSubmit }: MaterialFormModalProps) {
  const [type, setType] = useState(initial?.type ?? 'Cloth');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [supplier, setSupplier] = useState(initial?.supplier ?? '');
  const [colour, setColour] = useState(initial?.colour ?? '');
  const [widthSize, setWidthSize] = useState(initial?.width_size ?? '');
  const [qty, setQty] = useState(String(initial?.qty ?? ''));
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      type: type.trim() || 'Cloth',
      description: description.trim(),
      code: code.trim(),
      location: location.trim(),
      supplier: supplier.trim(),
      colour: colour.trim(),
      width_size: widthSize.trim(),
      qty: parseFloat(qty) || 0,
      unit: unit.trim(),
      notes: notes.trim(),
    });
  };

  const canSubmit = description.trim().length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'add' ? 'Add Material' : 'Edit Material'}
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-body border border-input-border rounded-lg hover:text-heading transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="material-form"
            disabled={!canSubmit}
            className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            {mode === 'add' ? 'Add Material' : 'Save Changes'}
          </button>
        </>
      }
    >
      <form id="material-form" onSubmit={handleSubmit} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        <div>
          <h4 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Material Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="mat-type" className="block text-sm text-body mb-1">Type</label>
              <select
                id="mat-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputCls}
              >
                {MATERIAL_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="mat-description" className="block text-sm text-body mb-1">Description *</label>
              <input
                id="mat-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label htmlFor="mat-code" className="block text-sm text-body mb-1">Code</label>
              <input id="mat-code" value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="mat-location" className="block text-sm text-body mb-1">Location</label>
              <input id="mat-location" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="mat-supplier" className="block text-sm text-body mb-1">Supplier</label>
              <input id="mat-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="mat-colour" className="block text-sm text-body mb-1">Colour</label>
              <input id="mat-colour" value={colour} onChange={(e) => setColour(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="mat-width-size" className="block text-sm text-body mb-1">Width/Size</label>
              <input id="mat-width-size" value={widthSize} onChange={(e) => setWidthSize(e.target.value)} placeholder="e.g. 132CM" className={inputCls} />
            </div>
            <div>
              <label htmlFor="mat-qty" className="block text-sm text-body mb-1">Qty</label>
              <input
                id="mat-qty"
                type="number"
                step="0.01"
                min="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="mat-unit" className="block text-sm text-body mb-1">Unit</label>
              <select id="mat-unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
                <option value="">Select unit</option>
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="mat-notes" className="block text-sm text-body mb-1">Notes</label>
              <textarea
                id="mat-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
