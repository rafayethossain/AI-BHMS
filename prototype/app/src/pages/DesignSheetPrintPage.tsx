import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDesignDetail } from '../mock/api';
import type { DesignDetail, DesignMaterial, DesignRegisterRow } from '../mock/types';

const PRINT_AREA_BG = '#ffffff';
const GREY_SURROUND = '#eef2f7';

const DESIGN_INFO_FIELDS: { label: string; value: (d: DesignRegisterRow) => string }[] = [
  { label: 'Issue Date', value: (d) => d.issue_date },
  { label: 'Block', value: (d) => d.block },
  { label: 'Version', value: (d) => d.current_version },
  { label: 'Size', value: (d) => d.size },
  { label: 'Designer', value: (d) => d.designer },
  { label: 'Issuer', value: (d) => d.issuer },
  { label: 'Length', value: (d) => d.length },
  { label: 'Description', value: (d) => d.description },
  { label: 'Note', value: (d) => d.design_notes },
];

const MATERIAL_COLUMNS: { key: keyof DesignMaterial; title: string; align?: 'right' }[] = [
  { key: 'type', title: 'Type' },
  { key: 'description', title: 'Description/Code' },
  { key: 'location', title: 'Location' },
  { key: 'supplier', title: 'Supplier' },
  { key: 'colour', title: 'Colour' },
  { key: 'width_size', title: 'W/Size' },
  { key: 'qty', title: 'Qty', align: 'right' },
  { key: 'unit', title: 'Unit' },
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
  const { designCode } = useParams<{ designCode: string }>();
  const [detail, setDetail] = useState<DesignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [tickedMaterials, setTickedMaterials] = useState<Set<string>>(new Set());

  const loadDetail = useCallback(() => {
    if (!designCode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getDesignDetail(designCode)
      .then((res) => setDetail(res ?? null))
      .finally(() => setLoading(false));
  }, [designCode]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const toggleMaterial = (itemId: string) => {
    setTickedMaterials((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  if (loading) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center"
        data-testid="design-sheet-print-loading"
      >
        <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const design = detail?.design ?? null;
  const materialSelective = tickedMaterials.size > 0;
  const visibleMaterials = (design?.materials ?? []).filter(
    (item) => !materialSelective || tickedMaterials.has(item.id),
  );
  const totalQty = visibleMaterials.reduce((sum, item) => {
    const qty = Number(item.qty);
    return Number.isFinite(qty) ? sum + qty : sum;
  }, 0);

  const currentVersion =
    detail?.versions.find((v) => v.is_current) ?? detail?.versions[detail.versions.length - 1];
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
            to={design ? `/designs/${design.design_code}` : '/design'}
            className="text-sm font-medium text-slate-600 hover:text-emerald-600"
          >
            {design ? '← Back to design' : '← Back to register'}
          </Link>
          <div className="flex items-center gap-2">
            {!preview && design && (
              <button
                type="button"
                data-testid="print-trigger"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg"
              >
                Print
              </button>
            )}
            {design && (
              <button
                type="button"
                data-testid="preview-toggle"
                onClick={() => setPreview((v) => !v)}
                className="px-4 py-2 bg-surface-alt text-slate-700 border border-slate-300 text-sm font-medium rounded-lg"
              >
                {preview ? 'Exit Preview' : 'Preview'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="py-8 no-bg" style={{ backgroundColor: GREY_SURROUND }}>
        <div
          data-testid="print-area"
          className="print-area mx-auto max-w-4xl border border-slate-300 px-8 py-6 text-slate-900"
          style={{ backgroundColor: PRINT_AREA_BG }}
        >
          {!design && (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-slate-700">Design not found</p>
              <Link
                to="/design"
                className="mt-2 inline-block text-sm font-medium text-emerald-600 hover:text-emerald-500"
              >
                Back to register
              </Link>
            </div>
          )}

          {design && (
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
                      File{' '}
                      <span data-testid="print-file" className="font-semibold text-slate-800">
                        {currentVersion?.fn_number || '—'}
                      </span>
                    </p>
                    <p className="mt-0.5">
                      <span data-testid="print-status" className="capitalize">
                        {design.status
                          ? design.status.charAt(0).toUpperCase() + design.status.slice(1)
                          : '—'}
                      </span>
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
                      {design.buyer || '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      Design
                    </p>
                    <p
                      data-testid="print-design-code"
                      className="mt-0.5 truncate text-xl font-bold leading-tight text-slate-900"
                    >
                      {design.design_code || '—'}
                    </p>
                  </div>
                </div>
              </header>

              <section aria-label="Design information" className="mt-4">
                <SectionTitle>Design Information</SectionTitle>
                <dl
                  data-testid="print-info-fields"
                  className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-0.5"
                >
                  {DESIGN_INFO_FIELDS.map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-1"
                    >
                      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
                      <dd className="text-right text-sm font-medium text-slate-900">
                        {value(design) ? value(design) : '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section aria-label="Sketch" className="mt-5">
                <SectionTitle>Sketch</SectionTitle>
                <div data-testid="print-sketch" className="mt-1.5 border border-slate-200 p-3">
                  {design.sketch_url ? (
                    <img
                      src={design.sketch_url}
                      alt="Design sheet sketch"
                      className="mx-auto max-h-72 object-contain"
                    />
                  ) : (
                    <p className="py-6 text-center text-sm text-slate-500">No sketch uploaded</p>
                  )}
                </div>
              </section>

              <section aria-label="Material breakdown" className="mt-5">
                <SectionTitle>Material Breakdown</SectionTitle>
                <table
                  data-testid="print-material-grid"
                  className="mt-1.5 w-full text-xs border-collapse"
                >
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
                            aria-label={`Include ${item.description || item.type} in print`}
                            className="accent-emerald-600"
                          />
                        </td>
                        {MATERIAL_COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            className={`px-1 py-1 align-top ${
                              col.align === 'right' ? 'text-right' : ''
                            }`}
                          >
                            {col.key === 'description' ? (
                              <>
                                <span className="font-medium">{item.description || '—'}</span>
                                {item.code ? (
                                  <span className="mt-0.5 block text-slate-500">{item.code}</span>
                                ) : null}
                              </>
                            ) : item[col.key] === null ||
                              item[col.key] === '' ||
                              item[col.key] === undefined ? (
                              ''
                            ) : (
                              String(item[col.key])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {visibleMaterials.length > 0 && (
                      <tr className="border-t border-slate-300 bg-slate-50">
                        <td className="px-1 py-1.5" />
                        <td className="px-1 py-1.5 font-semibold" colSpan={MATERIAL_COLUMNS.length - 1}>
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