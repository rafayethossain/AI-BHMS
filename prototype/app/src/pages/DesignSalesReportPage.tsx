import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StatusPill from '../components/StatusPill';
import { getDesignDetail } from '../mock/api';
import type { DesignDetail, SalesOrderStatuses } from '../mock/types';
import { buildSalesReportCsv, downloadTextFile, summarizeSalesReport } from './salesReport';

const PRINT_AREA_BG = '#ffffff';
const GREY_SURROUND = '#eef2f7';

const AREAS: (keyof SalesOrderStatuses)[] = [
  'fabric',
  'trims',
  'production',
  'delivery',
  'overall',
];

const AREA_LABELS: Record<keyof SalesOrderStatuses, string> = {
  fabric: 'Fabric',
  trims: 'Trims',
  production: 'Production',
  delivery: 'Delivery',
  overall: 'Overall',
};

const money = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-700">
      <span className="inline-block h-3 w-1 rounded-full bg-emerald-600" aria-hidden="true" />
      {children}
    </h2>
  );
}

export default function DesignSalesReportPage() {
  const { designCode } = useParams<{ designCode: string }>();
  const [detail, setDetail] = useState<DesignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [versionNumber, setVersionNumber] = useState('');

  useEffect(() => {
    if (!designCode) return;
    let cancelled = false;
    getDesignDetail(designCode)
      .then((res) => {
        if (cancelled) return;
        setDetail(res ?? null);
        const current =
          res?.versions.find((v) => v.is_current) ?? res?.versions[res.versions.length - 1];
        setVersionNumber(current?.version_number ?? '');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [designCode]);

  const rows = useMemo(
    () => (detail?.pos ?? []).filter((p) => p.version_number === versionNumber),
    [detail, versionNumber],
  );
  const summary = useMemo(() => summarizeSalesReport(rows), [rows]);

  const handleExport = () => {
    if (!detail) return;
    const fileName = `Sales-Order-Report-${detail.design.design_code}-${versionNumber || 'all'}.csv`;
    downloadTextFile(fileName, buildSalesReportCsv(rows));
  };

  if (loading) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center"
        data-testid="sales-report-loading"
      >
        <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const printedAt = new Date();

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
        <div className="mx-auto max-w-4xl px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Link
            to={detail ? `/designs/${detail.design.design_code}` : '/design'}
            className="text-sm font-medium text-slate-600 hover:text-emerald-600"
          >
            {detail ? '← Back to design' : '← Back to register'}
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            {detail && (
              <label className="flex items-center gap-2 text-xs text-slate-500">
                Version
                <select
                  aria-label="Version"
                  value={versionNumber}
                  onChange={(e) => setVersionNumber(e.target.value)}
                  className="px-2 py-1 text-sm rounded-lg border border-slate-300 bg-surface text-heading"
                >
                  {detail.versions.map((v) => (
                    <option key={v.id} value={v.version_number}>
                      {v.version_number}
                      {v.is_current ? ' (current)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!preview && detail && (
              <>
                <button
                  type="button"
                  data-testid="export-trigger"
                  onClick={handleExport}
                  className="px-4 py-2 bg-surface-alt text-slate-700 border border-slate-300 text-sm font-medium rounded-lg"
                >
                  Export
                </button>
                <button
                  type="button"
                  data-testid="print-trigger"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg"
                >
                  Print
                </button>
              </>
            )}
            {detail && (
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
          {!detail && (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-slate-700">Design {designCode} not found</p>
              <Link
                to="/design"
                className="mt-2 inline-block text-sm font-medium text-emerald-600 hover:text-emerald-500"
              >
                Back to register
              </Link>
            </div>
          )}

          {detail && (
            <>
              <header data-testid="print-header" className="border-b-2 border-slate-800 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-bold tracking-widest text-white">
                      BHMS
                    </span>
                    <h1 className="text-lg font-bold uppercase tracking-tight text-slate-900">
                      Sales Order Report
                    </h1>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>
                      Version{' '}
                      <span data-testid="report-version" className="font-semibold text-slate-800">
                        {versionNumber || '—'}
                      </span>
                    </p>
                    <p className="mt-0.5">
                      {summary.count} PO{summary.count === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                      Buyer
                    </p>
                    <p
                      data-testid="report-buyer"
                      className="mt-0.5 truncate text-xl font-bold leading-tight text-emerald-900"
                    >
                      {detail.design.buyer || '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      Design
                    </p>
                    <p
                      data-testid="report-design-code"
                      className="mt-0.5 truncate text-xl font-bold leading-tight text-slate-900"
                    >
                      {detail.design.design_code || '—'}
                    </p>
                  </div>
                </div>
              </header>

              <section aria-label="Sales orders" className="mt-4">
                <SectionTitle>Sales Orders</SectionTitle>
                {rows.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    No purchase orders on this version.
                  </p>
                ) : (
                  <table data-testid="report-table" className="mt-1.5 w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-y border-slate-300 bg-slate-50">
                        <th className="px-1 py-1 text-left font-semibold text-slate-600">PO Number</th>
                        <th className="px-1 py-1 text-right font-semibold text-slate-600">Qty</th>
                        <th className="px-1 py-1 text-right font-semibold text-slate-600">Unit Price</th>
                        <th className="px-1 py-1 text-right font-semibold text-slate-600">Value</th>
                        {AREAS.map((area) => (
                          <th key={area} className="px-1 py-1 text-left font-semibold text-slate-600">
                            {AREA_LABELS[area]}
                          </th>
                        ))}
                        <th className="px-1 py-1 text-left font-semibold text-slate-600">
                          Delivery Date
                        </th>
                        <th className="px-1 py-1 no-print">
                          <span className="sr-only">Open</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((po) => (
                        <tr
                          key={po.id}
                          data-testid="so-report-row"
                          className="border-b border-slate-100"
                        >
                          <td className="px-1 py-1 font-medium text-slate-800 whitespace-nowrap">
                            {po.po_number}
                          </td>
                          <td className="px-1 py-1 text-right tabular-nums">
                            {po.quantity.toLocaleString('en-US')}
                          </td>
                          <td className="px-1 py-1 text-right tabular-nums">{po.unit_price}</td>
                          <td className="px-1 py-1 text-right tabular-nums">
                            {money(Number(po.total_value))}
                          </td>
                          {AREAS.map((area) => (
                            <td key={area} className="px-1 py-1 align-top">
                              <StatusPill value={po.statuses[area].code} risk={po.statuses[area]} />
                            </td>
                          ))}
                          <td className="px-1 py-1 whitespace-nowrap text-slate-700">
                            {po.delivery_date}
                          </td>
                          <td className="px-1 py-1 no-print">
                            <Link
                              to={`/purchase-orders/${po.po_number}`}
                              className="text-xs font-medium text-emerald-600 hover:text-emerald-500 whitespace-nowrap"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-slate-300 bg-slate-50">
                        <td className="px-1 py-1.5 font-semibold" colSpan={1}>
                          Total
                        </td>
                        <td
                          data-testid="report-total-qty"
                          className="px-1 py-1.5 text-right font-semibold tabular-nums"
                        >
                          {summary.quantity.toLocaleString('en-US')}
                        </td>
                        <td className="px-1 py-1.5">{' '}</td>
                        <td
                          data-testid="report-total-value"
                          className="px-1 py-1.5 text-right font-semibold tabular-nums"
                        >
                          {money(summary.value)}
                        </td>
                        <td className="px-1 py-1.5" colSpan={7}>
                          {' '}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </section>

              <footer
                data-testid="print-footer"
                className="mt-6 border-t border-slate-300 pt-3 text-center"
              >
                <p className="text-sm font-bold tracking-[0.2em] text-slate-800">
                  BHMS — Sales Order Report
                </p>
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
