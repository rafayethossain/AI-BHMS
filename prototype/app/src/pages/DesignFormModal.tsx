import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Modal from '../components/Modal';
import type { DesignCreateInput, DesignMaterial, DesignRegisterRow, DesignStatus } from '../mock/types';

const STATUS_OPTIONS: DesignStatus[] = ['active', 'archived', 'draft'];

const STYLE_TYPE_OPTIONS = ['TOP', 'DRESS', 'JACKET', 'TROUSER', 'SKIRT', 'SHIRT', 'BLOUSE', 'SHORT', 'COAT', 'HOODIE', 'CARDIGAN', 'VEST', 'POLO'];

const CATEGORY_OPTIONS = ['Womenswear', 'Menswear', 'Outerwear', 'Activewear', 'Knitwear'];

const BUYER_OPTIONS = ['Nike Inc.', 'Zara', 'Primark', 'Aldi', 'Addidas', 'Walmart', 'Costco'];

const ISSUER_OPTIONS = ['Merchandising', 'Design Studio', 'Sampling'];

const MATERIAL_TYPE_OPTIONS = ['Cloth', 'Trims', 'Interfacing', 'Lining', 'Thread', 'Others'];

const inputCls =
  'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60';

const cellInputCls =
  'w-full min-w-[110px] bg-transparent px-1.5 py-1 text-xs text-heading focus:bg-surface focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded';

const thCls = 'px-2 py-1.5 text-xs font-medium text-muted whitespace-nowrap text-left';

let matSeed = 0;
const matId = () => `mat-form-${Date.now()}-${++matSeed}`;

function emptyMaterial(): DesignMaterial {
  return {
    id: matId(),
    type: 'Cloth',
    description: '',
    code: '',
    location: '',
    supplier: '',
    colour: '',
    width_size: '',
    qty: 0,
    unit: '',
    notes: '',
  };
}

interface DesignFormModalProps {
  mode: 'add' | 'edit';
  initial?: DesignRegisterRow;
  onClose: () => void;
  onSubmit: (input: DesignCreateInput) => void;
}

export default function DesignFormModal({ mode, initial, onClose, onSubmit }: DesignFormModalProps) {
  const isEdit = mode === 'edit';
  const [designCode, setDesignCode] = useState(initial?.design_code ?? '');
  const [styleType, setStyleType] = useState(initial?.style_type ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [buyer, setBuyer] = useState(initial?.buyer ?? '');
  const [status, setStatus] = useState<DesignStatus>(initial?.status ?? 'draft');
  const [issueDate, setIssueDate] = useState(initial?.issue_date ?? '');
  const [block, setBlock] = useState(initial?.block ?? '');
  const [designer, setDesigner] = useState(initial?.designer ?? '');
  const [size, setSize] = useState(initial?.size ?? '');
  const [issuer, setIssuer] = useState(initial?.issuer ?? '');
  const [length, setLength] = useState(initial?.length ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [designNotes, setDesignNotes] = useState(initial?.design_notes ?? '');
  const [sketchUrl, setSketchUrl] = useState(initial?.sketch_url ?? '');
  const [materials, setMaterials] = useState<DesignMaterial[]>(initial?.materials ?? []);

  const handleSketch = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSketchUrl(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  const updateMaterial = (id: string, partial: Partial<DesignMaterial>) =>
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, ...partial } : m)));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      design_code: designCode.trim(),
      style_type: styleType.trim() || undefined,
      category: category.trim(),
      buyer: buyer.trim(),
      status,
      issue_date: issueDate || undefined,
      block: block.trim() || undefined,
      designer: designer.trim() || undefined,
      size: size.trim() || undefined,
      issuer: issuer.trim() || undefined,
      length: length.trim() || undefined,
      description: description.trim() || undefined,
      design_notes: designNotes.trim() || undefined,
      sketch_url: sketchUrl || undefined,
      materials: materials.length > 0 ? materials : undefined,
    });
  };

  const canSubmit = designCode.trim().length > 0 && category.trim().length > 0 && buyer.trim().length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit Design' : 'New Design'}
      maxWidthClass="max-w-4xl"
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
            form="design-form"
            disabled={!canSubmit}
            className="px-3 py-1.5 text-sm text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Create Design'}
          </button>
        </>
      }
    >
      <form id="design-form" onSubmit={handleSubmit} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        <div>
          <label htmlFor="design-code" className="block text-sm text-body mb-1">
            Design Code
          </label>
          <input
            id="design-code"
            value={designCode}
            onChange={(e) => setDesignCode(e.target.value)}
            disabled={isEdit}
            className={inputCls}
          />
        </div>

        <hr className="border-border-subtle" />

        <div>
          <h4 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Design Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="style-type" className="block text-sm text-body mb-1">
                Style Type
              </label>
              <select id="style-type" value={styleType} onChange={(e) => setStyleType(e.target.value)} className={inputCls}>
                <option value="">Select style type</option>
                {STYLE_TYPE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm text-body mb-1">
                Category
              </label>
              <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                <option value="">Select category</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="buyer" className="block text-sm text-body mb-1">
                Buyer
              </label>
              <select id="buyer" value={buyer} onChange={(e) => setBuyer(e.target.value)} className={inputCls}>
                <option value="">Select buyer</option>
                {BUYER_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm text-body mb-1">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as DesignStatus)}
                className={inputCls}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="issue-date" className="block text-sm text-body mb-1">
                Issue Date
              </label>
              <input
                id="issue-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="block" className="block text-sm text-body mb-1">
                Block
              </label>
              <input id="block" value={block} onChange={(e) => setBlock(e.target.value)} placeholder="e.g. B2" className={inputCls} />
            </div>
            <div>
              <label htmlFor="designer" className="block text-sm text-body mb-1">
                Designer
              </label>
              <input
                id="designer"
                value={designer}
                onChange={(e) => setDesigner(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="issuer" className="block text-sm text-body mb-1">
                Issuer
              </label>
              <select id="issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} className={inputCls}>
                <option value="">Select issuer</option>
                {ISSUER_OPTIONS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="size" className="block text-sm text-body mb-1">
                Size
              </label>
              <input id="size" value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. S–XL" className={inputCls} />
            </div>
            <div>
              <label htmlFor="length" className="block text-sm text-body mb-1">
                Length
              </label>
              <input id="length" value={length} onChange={(e) => setLength(e.target.value)} placeholder="e.g. 38 in" className={inputCls} />
            </div>
          </div>
        </div>

        <hr className="border-border-subtle" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="description" className="block text-sm text-body mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="design-notes" className="block text-sm text-body mb-1">
              Design Notes
            </label>
            <textarea
              id="design-notes"
              value={designNotes}
              onChange={(e) => setDesignNotes(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </div>
        </div>

        <hr className="border-border-subtle" />

        <div>
          <h4 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Sketch</h4>
          <label htmlFor="sketch-file" className="block text-sm text-body mb-1">
            Sketch
          </label>
          <input
            id="sketch-file"
            type="file"
            accept="image/*"
            onChange={handleSketch}
            className="block w-full text-sm text-body file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-surface-alt file:text-body file:text-sm file:font-medium hover:file:bg-surface-hover"
          />
          {sketchUrl && (
            <div className="mt-2 flex items-start gap-3">
              <img
                src={sketchUrl}
                alt="Design sketch preview"
                className="w-28 h-28 object-cover rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={() => setSketchUrl('')}
                className="px-2 py-1 text-xs text-body border border-input-border rounded-lg hover:text-heading transition-colors"
              >
                Remove sketch
              </button>
            </div>
          )}
        </div>

        <hr className="border-border-subtle" />

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-medium text-muted uppercase tracking-wider">Materials Breakdown</h4>
            <button
              type="button"
              onClick={() => setMaterials((prev) => [...prev, emptyMaterial()])}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-surface-alt text-body hover:bg-surface-hover transition-colors"
            >
              Add material
            </button>
          </div>

          <datalist id="material-type-options">
            {MATERIAL_TYPE_OPTIONS.map((t) => (
              // oxlint-disable-next-line jsx-a11y/control-has-associated-label
              <option key={t} value={t} />
            ))}
          </datalist>

          {materials.length === 0 ? (
            <p className="text-sm text-muted py-2">No materials added. Click "Add material" to start the BOM.</p>
          ) : (
            <div
              data-testid="materials-grid-scroll"
              className="border border-input-border rounded-lg overflow-auto max-h-[300px] min-h-[180px]"
            >
              <table data-testid="materials-grid" className="w-full border-collapse text-left">
                <caption className="sr-only">Materials breakdown</caption>
                <thead className="sticky top-0 z-10 bg-surface-alt">
                  <tr className="border-b border-input-border">
                    <th className={thCls}>Type</th>
                    <th className={thCls}>Description</th>
                    <th className={thCls}>Code</th>
                    <th className={thCls}>Location</th>
                    <th className={thCls}>Supplier</th>
                    <th className={thCls}>Colour</th>
                    <th className={thCls}>Width/Size</th>
                    <th className={thCls}>Qty/Match</th>
                    <th className={thCls}>Unit</th>
                    <th className={`${thCls} min-w-[180px]`}>Notes</th>
                    <th className="w-10 px-2 py-1.5">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => (
                    <tr
                      key={m.id}
                      data-testid="material-row"
                      className="border-b border-border-subtle last:border-b-0 align-top"
                    >
                      <td className="px-1 py-1">
                        <input
                          aria-label="Material type"
                          list="material-type-options"
                          value={m.type}
                          onChange={(e) => updateMaterial(m.id, { type: e.target.value })}
                          className={cellInputCls}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          aria-label="Description"
                          value={m.description}
                          onChange={(e) => updateMaterial(m.id, { description: e.target.value })}
                          className={cellInputCls}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          aria-label="Code"
                          value={m.code}
                          onChange={(e) => updateMaterial(m.id, { code: e.target.value })}
                          className={cellInputCls}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          aria-label="Location"
                          value={m.location}
                          onChange={(e) => updateMaterial(m.id, { location: e.target.value })}
                          className={cellInputCls}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          aria-label="Supplier"
                          value={m.supplier}
                          onChange={(e) => updateMaterial(m.id, { supplier: e.target.value })}
                          className={cellInputCls}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          aria-label="Colour"
                          value={m.colour}
                          onChange={(e) => updateMaterial(m.id, { colour: e.target.value })}
                          className={cellInputCls}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          aria-label="Width/Size"
                          value={m.width_size}
                          onChange={(e) => updateMaterial(m.id, { width_size: e.target.value })}
                          placeholder="132CM"
                          className={cellInputCls}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          aria-label="Qty/Match"
                          type="number"
                          step="0.01"
                          min="0"
                          value={m.qty || ''}
                          onChange={(e) => updateMaterial(m.id, { qty: parseFloat(e.target.value) || 0 })}
                          className={`${cellInputCls} text-right`}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          aria-label="Unit"
                          value={m.unit}
                          onChange={(e) => updateMaterial(m.id, { unit: e.target.value })}
                          placeholder="m, pcs"
                          className={cellInputCls}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          aria-label="Notes"
                          value={m.notes}
                          onChange={(e) => updateMaterial(m.id, { notes: e.target.value })}
                          className={cellInputCls}
                        />
                      </td>
                      <td className="px-1 py-1 text-center">
                        <button
                          type="button"
                          aria-label="Remove material"
                          title="Remove material"
                          onClick={() => setMaterials((prev) => prev.filter((r) => r.id !== m.id))}
                          className="px-1.5 py-0.5 text-xs text-red-600 hover:text-red-500 hover:bg-surface-alt rounded transition-colors"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}