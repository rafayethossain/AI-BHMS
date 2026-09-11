import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { merchApi } from '../api/client';
import { DESIGN_INFO_FIELDS } from '../components/designSheetFields';
import type { DesignSheet, DesignSheetMaterialItem } from '../api/client';

const PRINT_AREA_BG = '#ffffff';
const GREY_SURROUND = '#eef2f7';

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

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-700">
      <span className="inline-block h-3 w-1 rounded-full bg-emerald-600" aria-hidden="true" />
      {children}
    </h2>
  );
}

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
              <header data-testid="print-header" className="border-b-2 border-slate-800 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-bold tracking-widest text-white">
                      BHMS
                    </span>
                    <h1 className="text-lg font-bold uppercase tracking-tight text-slate-900">
                      Design Sheet
                    </h1>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>
                      File <span className="font-semibold text-slate-800">{sheet.file_number}</span>
                    </p>
                    <p className="mt-0.5">
                      {sheet.department ? `${sheet.department} · ` : ''}
                      <span className="capitalize">{sheet.status || '—'}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                      Buyer
                    </p>
                    <p
                      data-testid="print-buyer-name"
                      className="mt-0.5 truncate text-xl font-bold leading-tight text-emerald-900"
                    >
                      {sheet.buyer_name || '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      Style
                    </p>
                    <p
                      data-testid="print-style-code"
                      className="mt-0.5 truncate text-xl font-bold leading-tight text-slate-900"
                    >
                      {sheet.style_code || '—'}
                    </p>
                  </div>
                </div>
              </header>

              <section aria-label="Design information" className="mt-4">
                <SectionTitle>Design Information</SectionTitle>
                <dl data-testid="print-design-info" className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-0.5">
                  {DESIGN_INFO_FIELDS.map(({ key, label }) => {
                    const value = sheet[key];
                    return (
                      <div
                        key={key}
                        className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-1"
                      >
                        <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
                        <dd className="text-right text-sm font-medium text-slate-900">
                          {value ? String(value) : '—'}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>

              <section aria-label="Sketch" className="mt-5">
                <SectionTitle>Sketch</SectionTitle>
                <div data-testid="print-sketch" className="mt-1.5 border border-slate-200 p-3">
                  {sheet.sketch_url ? (
                    <img
                      src={sheet.sketch_url}
                      alt="Design sheet sketch"
                      className="mx-auto max-h-72 object-contain"
                    />
                  ) : (
                    <p className="py-6 text-center text-sm text-slate-500">No sketch uploaded</p>
                  )}
                </div>
              </section>

              <section aria-label="Fit specs" className="mt-5">
                <SectionTitle>Fit Specs</SectionTitle>
                <div data-testid="print-fit-specs" className="mt-1.5 border border-slate-200">
                  {visibleFitSpecs.length === 0 ? (
                    <p className="py-3 text-center text-sm text-slate-500">No fit specs</p>
                  ) : (
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-300 bg-slate-50">
                          <th className="px-2 py-1 text-left font-semibold text-slate-600 w-8">Print</th>
                          <th className="px-2 py-1 text-left font-semibold text-slate-600">Fit</th>
                          <th className="px-2 py-1 text-left font-semibold text-slate-600">Date</th>
                          <th className="px-2 py-1 text-left font-semibold text-slate-600">Description</th>
                          <th className="px-2 py-1 text-left font-semibold text-slate-600">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleFitSpecs.map((fs) => (
                          <tr key={fs.id} className="border-b border-slate-100">
                            <td className="px-2 py-1">
                              <input
                                type="checkbox"
                                data-testid={`print-fitspec-tick-${fs.id}`}
                                checked={tickedFitSpecs.has(fs.id)}
                                onChange={() => toggleFitSpec(fs.id)}
                                aria-label={`Include ${fs.fit_number} in print`}
                                className="accent-emerald-600"
                              />
                            </td>
                            <td className="px-2 py-1 font-semibold">
                              {fs.fit_number}
                              {fs.is_selected && <span className="ml-1 text-emerald-700">✓</span>}
                            </td>
                            <td className="px-2 py-1">{fs.fit_date || '—'}</td>
                            <td className="px-2 py-1">{fs.description || '—'}</td>
                            <td className="px-2 py-1">{fs.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              <section aria-label="Material breakdown" className="mt-5">
                <SectionTitle>Material Breakdown</SectionTitle>
                <table data-testid="print-material-grid" className="mt-1.5 w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-y border-slate-300 bg-slate-50">
                      <th className="px-1 py-1 text-left font-semibold text-slate-600 w-8">Print</th>
                      {MATERIAL_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className={`px-1 py-1 text-left font-semibold text-slate-600 ${
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
                        <td colSpan={gridColSpan} className="py-3 text-center text-slate-500">
                          No material items
                        </td>
                      </tr>
                    )}
                    {visibleMaterials.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="px-1 py-1">
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
                            className={`px-1 py-1 align-top ${col.align === 'right' ? 'text-right' : ''}`}
                          >
                            {item[col.key] === null || item[col.key] === '' || item[col.key] === undefined
                              ? ''
                              : String(item[col.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {visibleMaterials.length > 0 && (
                      <tr className="border-t border-slate-300 bg-slate-50">
                        <td className="px-1 py-1.5 font-semibold" colSpan={MATERIAL_COLUMNS.length}>
                          Total
                        </td>
                        <td data-testid="material-total" className="px-1 py-1.5 text-right font-semibold">
                          {totalQty.toLocaleString()}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>

              <footer data-testid="print-footer" className="mt-6 border-t border-slate-300 pt-3 text-center">
                <p className="text-sm font-bold tracking-[0.2em] text-slate-800">BHMS — Design Sheet</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  © {printedAt.getFullYear()} BHMS. All rights reserved.
                </p>
                <p data-testid="print-timestamp" className="mt-0.5 text-[11px] text-slate-500">
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