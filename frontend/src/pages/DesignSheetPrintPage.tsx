import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { merchApi } from '../api/client';
import { DESIGN_INFO_FIELDS } from '../components/designSheetFields';
import type { DesignSheet, DesignSheetMaterialItem } from '../api/client';

const PRINT_AREA_BG = '#f8f3e6';
const GREY_SURROUND = '#e2e8f0';

const MATERIAL_COLUMNS: { key: keyof DesignSheetMaterialItem; title: string; align?: 'right' }[] = [
  { key: 'type', title: 'Type' },
  { key: 'description_code', title: 'Description/Code' },
  { key: 'location', title: 'Location' },
  { key: 'supplier', title: 'Supplier' },
  { key: 'colour', title: 'Colour' },
  { key: 'width_size', title: 'W/Size' },
  { key: 'qty', title: 'Qty', align: 'right' },
  { key: 'match', title: 'Match' },
];

export default function DesignSheetPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [sheet, setSheet] = useState<DesignSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [tickedMaterials, setTickedMaterials] = useState<Set<string>>(new Set());
  const [tickedFitSpecs, setTickedFitSpecs] = useState<Set<string>>(new Set());

  const loadSheet = useCallback(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    merchApi
      .getDesignSheet(id)
      .then((res) => setSheet(res.data))
      .catch(() => setError('Failed to load design sheet'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  const toggleMaterial = (itemId: string) => {
    setTickedMaterials((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleFitSpec = (specId: string) => {
    setTickedFitSpecs((prev) => {
      const next = new Set(prev);
      if (next.has(specId)) next.delete(specId);
      else next.add(specId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" data-testid="design-sheet-print-loading">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const materialSelective = tickedMaterials.size > 0;
  const visibleMaterials = (sheet?.material_items ?? []).filter(
    (item) => !materialSelective || tickedMaterials.has(item.id),
  );
  const totalQty = visibleMaterials.reduce((sum, item) => {
    const qty = Number(item.qty);
    return Number.isFinite(qty) ? sum + qty : sum;
  }, 0);

  const fitSpecSelective = tickedFitSpecs.size > 0;
  const visibleFitSpecs = (sheet?.fit_specs ?? []).filter(
    (fs) => !fitSpecSelective || tickedFitSpecs.has(fs.id),
  );

  const printedAt = new Date();
  const gridColSpan = MATERIAL_COLUMNS.length + 1;

  return (
    <>
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          .no-bg { background: #fff !important; }
          body { background: #fff; }
          .print-area { background: ${PRINT_AREA_BG} !important; }
          section { break-inside: avoid; }
        }
      `}</style>

      <div
        data-testid="print-toolbar"
        className="no-print sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200"
      >
        <div className="mx-auto max-w-4xl px-6 py-3 flex items-center justify-between gap-4">
          <Link
            to={`/design-sheets/${id}`}
            className="text-sm font-medium text-slate-600 hover:text-emerald-600"
          >
            ← Back to Design Sheet
          </Link>
          <div className="flex items-center gap-2">
            {!preview && (
              <button
                type="button"
                data-testid="print-trigger"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg"
              >
                Print
              </button>
            )}
            <button
              type="button"
              data-testid="preview-toggle"
              onClick={() => setPreview((v) => !v)}
              className="px-4 py-2 bg-surface-alt text-slate-700 border border-slate-300 text-sm font-medium rounded-lg"
            >
              {preview ? 'Exit Preview' : 'Preview'}
            </button>
          </div>
        </div>
      </div>

      <div className="py-8 no-bg" style={{ backgroundColor: GREY_SURROUND }}>
        <div
          data-testid="print-area"
          className="print-area mx-auto max-w-4xl border border-slate-300 px-8 py-6 text-slate-900"
          style={{ backgroundColor: PRINT_AREA_BG }}
        >
          {error && <div className="mb-6 text-red-600 text-sm">{error}</div>}

          {sheet && (
            <>
              <header data-testid="print-header" className="border-b border-slate-400 pb-4">
                <div className="flex items-end justify-between gap-4">
                  <h1 className="text-xl font-bold uppercase tracking-wide">Design Sheet</h1>
                  <p className="text-sm">
                    File: <span className="font-semibold">{sheet.file_number}</span>
                    <span className="mx-2 text-slate-400">·</span>
                    Style: <span className="font-semibold">{sheet.style_code}</span>
                    <span className="mx-2 text-slate-400">·</span>
                    <span>{sheet.buyer_name}</span>
                  </p>
                </div>
              </header>

              <section aria-label="Design information" className="mt-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Design Information
                </h2>
                <table data-testid="print-design-info" className="w-full text-sm">
                  <tbody>
                    {DESIGN_INFO_FIELDS.map(({ key, label }) => {
                      const value = sheet[key];
                      return (
                        <tr key={key} className="border-b border-slate-200">
                          <td className="py-1 pr-4 align-top w-40 text-slate-500">{label}</td>
                          <td className="py-1 align-top font-medium">{value ? String(value) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>

              <section aria-label="Sketch" className="mt-6">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Sketch</h2>
                <div data-testid="print-sketch" className="border border-slate-300 p-3">
                  {sheet.sketch_url ? (
                    <img
                      src={sheet.sketch_url}
                      alt="Design sheet sketch"
                      className="mx-auto max-h-80 object-contain"
                    />
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-8">No sketch uploaded</p>
                  )}
                </div>
              </section>

              <section aria-label="Fit specs" className="mt-6">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Fit Specs
                </h2>
                <div data-testid="print-fit-specs" className="border border-slate-300">
                  {visibleFitSpecs.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No fit specs</p>
                  ) : (
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-400">
                          <th className="py-1.5 px-2 text-left font-semibold text-slate-600 w-8">Print</th>
                          <th className="py-1.5 px-2 text-left font-semibold text-slate-600">Fit</th>
                          <th className="py-1.5 px-2 text-left font-semibold text-slate-600">Date</th>
                          <th className="py-1.5 px-2 text-left font-semibold text-slate-600">Description</th>
                          <th className="py-1.5 px-2 text-left font-semibold text-slate-600">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleFitSpecs.map((fs) => (
                          <tr key={fs.id} className="border-b border-slate-200">
                            <td className="py-1 px-2">
                              <input
                                type="checkbox"
                                data-testid={`print-fitspec-tick-${fs.id}`}
                                checked={tickedFitSpecs.has(fs.id)}
                                onChange={() => toggleFitSpec(fs.id)}
                                aria-label={`Include ${fs.fit_number} in print`}
                                className="accent-emerald-600"
                              />
                            </td>
                            <td className="py-1 px-2 font-semibold">
                              {fs.fit_number}
                              {fs.is_selected && <span className="ml-1 text-emerald-700">✓</span>}
                            </td>
                            <td className="py-1 px-2">{fs.fit_date || '—'}</td>
                            <td className="py-1 px-2">{fs.description || '—'}</td>
                            <td className="py-1 px-2">{fs.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              <section aria-label="Material breakdown" className="mt-6">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Material Breakdown
                </h2>
                <table data-testid="print-material-grid" className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-y border-slate-400">
                      <th className="py-1.5 px-1 text-left font-semibold text-slate-600 w-8">Print</th>
                      {MATERIAL_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className={`py-1.5 px-1 text-left font-semibold text-slate-600 ${
                            col.align === 'right' ? 'text-right' : ''
                          }`}
                        >
                          {col.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMaterials.length === 0 && (
                      <tr>
                        <td colSpan={gridColSpan} className="py-4 text-center text-slate-500">
                          No material items
                        </td>
                      </tr>
                    )}
                    {visibleMaterials.map((item) => (
                      <tr key={item.id} className="border-b border-slate-200">
                        <td className="py-1 px-1">
                          <input
                            type="checkbox"
                            data-testid={`print-item-tick-${item.id}`}
                            checked={tickedMaterials.has(item.id)}
                            onChange={() => toggleMaterial(item.id)}
                            aria-label={`Include ${item.description_code || item.type} in print`}
                            className="accent-emerald-600"
                          />
                        </td>
                        {MATERIAL_COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            className={`py-1 px-1 align-top ${col.align === 'right' ? 'text-right' : ''}`}
                          >
                            {item[col.key] === null || item[col.key] === '' || item[col.key] === undefined
                              ? ''
                              : String(item[col.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {visibleMaterials.length > 0 && (
                      <tr className="border-t border-slate-400">
                        <td className="py-1.5 px-1 font-semibold" colSpan={MATERIAL_COLUMNS.length}>
                          Total
                        </td>
                        <td data-testid="material-total" className="py-1.5 px-1 text-right font-semibold">
                          {totalQty.toLocaleString()}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>

              <footer data-testid="print-footer" className="mt-8 pt-3 border-t border-slate-400 text-center">
                <p className="text-sm font-semibold">CARMEL APPARELS</p>
                <p className="text-xs text-slate-500">
                  © {printedAt.getFullYear()} Carmel Apparels — BHMS Design Sheet
                </p>
                <p data-testid="print-timestamp" className="text-xs text-slate-500">
                  Printed on {printedAt.toLocaleString()}
                </p>
              </footer>
            </>
          )}
        </div>
      </div>
    </>
  );
}