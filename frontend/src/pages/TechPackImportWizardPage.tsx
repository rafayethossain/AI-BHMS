import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { merchApi, setupApi } from '../api/client';
import type { Buyer, TechPackExtractResult, TechPackImportResult } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt/20 text-muted',
  extracted: 'bg-blue-500/20 text-badge-blue',
  in_progress: 'bg-amber-500/20 text-badge-amber',
  completed: 'bg-emerald-500/20 text-badge-emerald',
};

const DESIGN_FIELDS: { key: string; label: string }[] = [
  { key: 'issue_date', label: 'Issue Date' },
  { key: 'block', label: 'Block' },
  { key: 'based_on', label: 'Based On' },
  { key: 'customer', label: 'Customer' },
  { key: 'style_number', label: 'Style Number' },
  { key: 'size', label: 'Size' },
  { key: 'designer', label: 'Designer' },
  { key: 'pattern_cutter', label: 'Pattern Cutter' },
  { key: 'issuer', label: 'Issuer' },
  { key: 'cloth_code', label: 'Cloth Code' },
  { key: 'length', label: 'Length' },
  { key: 'sketch', label: 'Sketch' },
  { key: 'description', label: 'Description' },
  { key: 'note', label: 'Note' },
];

export default function TechPackImportWizardPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [buyer, setBuyer] = useState<string>('');
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [techpack, setTechpack] = useState<TechPackExtractResult | null>(null);
  const [importResult, setImportResult] = useState<TechPackImportResult | null>(null);

  useEffect(() => {
    setupApi.getBuyers({ page_size: '500' }).then((r) => setBuyers(r.data.results)).catch(() => {}); // Silently ignore - secondary dropdown data
  }, []);

  const design = techpack?.data?.design_info as Record<string, unknown> | undefined;
  const bomRows = techpack?.data?.bom_rows as Record<string, unknown>[] | undefined;
  const warnings = techpack?.data?.warnings as string[] | undefined;

  const handleExtract = async (e: FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !buyer) {
      toast('error', 'Select a buyer and a PDF file first');
      return;
    }
    setExtracting(true);
    try {
      const res = await merchApi.extractTechPack(pdfFile, buyer);
      setTechpack(res.data);
      toast('success', `Tech pack ${res.data.techpack_number} extracted`);
      setStep(1);
    } catch { toast('error', 'Failed to extract tech pack'); } finally { setExtracting(false); }
  };

  const handleDownloadExcel = async () => {
    if (!techpack) return;
    setDownloading(true);
    try {
      const res = await merchApi.getTechPackExcel(techpack.id);
      const blob = new Blob([res.data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${techpack.techpack_number}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast('success', 'Workbook downloaded');
    } catch { toast('error', 'Failed to download workbook'); } finally { setDownloading(false); }
  };

  const handleImport = async (e: FormEvent) => {
    e.preventDefault();
    if (!xlsxFile || !buyer) {
      toast('error', 'Select a buyer and the edited workbook first');
      return;
    }
    setImporting(true);
    try {
      const res = await merchApi.importTechPack(xlsxFile, buyer, techpack?.id);
      setImportResult(res.data);
      toast('success', res.data.created ? 'Style created from tech pack' : 'Style updated from tech pack');
      setStep(2);
    } catch { toast('error', 'Failed to import tech pack'); } finally { setImporting(false); }
  };

  const reset = () => {
    setStep(0); setPdfFile(null); setXlsxFile(null); setTechpack(null); setImportResult(null);
  };

  const onPdfChange = (e: ChangeEvent<HTMLInputElement>) => setPdfFile(e.target.files?.[0] || null);
  const onXlsxChange = (e: ChangeEvent<HTMLInputElement>) => setXlsxFile(e.target.files?.[0] || null);

  const fileInputClass = 'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-sm file:cursor-pointer hover:file:bg-emerald-500';

  return (
    <Layout>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Tech Pack Import</h1>
            <p className="text-muted text-sm mt-1">Upload a buyer tech pack PDF, review the extraction, and import it as a style + BOM.</p>
          </div>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((s) => (
              <span key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border ${step === s ? 'bg-emerald-600 border-emerald-500 text-white' : step > s ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-surface-alt border-input-border text-muted'}`}>
                {step > s ? '✓' : s + 1}
              </span>
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold mb-1">Step 1 — Upload the tech pack PDF</h2>
            <p className="text-muted text-sm mb-6">Select the buyer and the style PDF. It will be parsed into a structured design sheet + BOM.</p>
            <form onSubmit={handleExtract} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Buyer *</label>
                <SearchableSelect options={buyers.map(b => ({ value: b.id, label: b.name }))} value={buyer || null}
                  onChange={(v) => setBuyer(String(v || ''))} placeholder="Select buyer..." />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Tech Pack PDF *</label>
                <input type="file" accept=".pdf,application/pdf" className={fileInputClass} onChange={onPdfChange} />
                {pdfFile && <p className="text-xs text-muted mt-1">{pdfFile.name} ({Math.round(pdfFile.size / 1024)} KB)</p>}
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={extracting || !pdfFile || !buyer}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg font-medium transition-colors">
                  {extracting ? 'Extracting...' : 'Extract Tech Pack'}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 1 && techpack && (
          <div className="space-y-6">
            <div className="bg-surface rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">Step 2 — Review extraction</h2>
                  <p className="text-muted text-sm mt-1">Tech pack <span className="font-mono text-emerald-400">{techpack.techpack_number}</span></p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleDownloadExcel} disabled={downloading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm rounded-lg font-medium transition-colors">
                    {downloading ? 'Downloading...' : 'Download Excel'}
                  </button>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-body mb-3">Design Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {DESIGN_FIELDS.map(({ key, label }) => (
                  <div key={key} className="bg-surface-alt/40 rounded-lg px-3 py-2">
                    <dt className="text-xs text-muted">{label}</dt>
                    <dd className="text-sm text-heading truncate" title={design?.[key] ? String(design[key]) : ''}>{design?.[key] ? String(design[key]) : '—'}</dd>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-semibold text-body mb-3">BOM ({bomRows?.length || 0} rows)</h3>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-alt/40 text-muted">
                      {['Type', 'Description / Code', 'Location', 'Supplier', 'Colour', 'Width / Size', 'Qty', 'Match'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(bomRows?.length ? bomRows : [{ type: 'No rows extracted', description_code: '' }]).map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 whitespace-nowrap">{String(row.type || '')}</td>
                        <td className="px-3 py-2">{String(row.description_code || '')}</td>
                        <td className="px-3 py-2">{String(row.location || '')}</td>
                        <td className="px-3 py-2">{String(row.supplier || '')}</td>
                        <td className="px-3 py-2">{String(row.colour || '')}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{String(row.width_size || '')}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{row.qty != null ? String(row.qty) : ''}</td>
                        <td className="px-3 py-2">{String(row.match || '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {warnings && warnings.length > 0 && (
                <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-300">
                  {warnings.map((w, i) => <p key={i}>{w}</p>)}
                </div>
              )}
            </div>

            <div className="bg-surface rounded-xl border border-border p-6">
              <h2 className="text-lg font-bold mb-1">Step 3 — Import the edited workbook</h2>
              <p className="text-muted text-sm mb-6">Edit the downloaded workbook in Excel, then re-upload it here. A style, version, items, and BOM will be created.</p>
              <form onSubmit={handleImport} className="space-y-4">
                <div>
                  <label className="block text-sm text-body mb-1">Edited workbook (.xlsx) *</label>
                  <input type="file" accept=".xlsx" className={fileInputClass} onChange={onXlsxChange} />
                  {xlsxFile && <p className="text-xs text-muted mt-1">{xlsxFile.name} ({Math.round(xlsxFile.size / 1024)} KB)</p>}
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={reset} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Start Over</button>
                  <button type="submit" disabled={importing || !xlsxFile}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg font-medium transition-colors">
                    {importing ? 'Importing...' : 'Import Tech Pack'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {step === 2 && importResult && techpack && (
          <div className="bg-surface rounded-xl border border-border p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-bold mb-2">{importResult.created ? 'Style created' : 'Style updated'}</h2>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted mb-6">
              <span>Tech pack <span className="font-mono text-emerald-400">{techpack.techpack_number}</span></span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[techpack.status] || ''}`}>{techpack.status}</span>
            </div>
            <div className="max-w-md mx-auto bg-surface-alt/40 rounded-lg p-4 text-left space-y-2 text-sm mb-6">
              <div className="flex justify-between"><dt className="text-muted">Style</dt><dd className="text-heading font-medium">{importResult.style.name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Style Number</dt><dd className="font-mono text-emerald-400">{importResult.style.style_number}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Version</dt><dd className="text-heading">v{importResult.style_version.version_number}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">BOM</dt><dd className="text-heading">{importResult.bom.name} (v{importResult.bom.version})</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Style Items</dt><dd className="text-heading">{importResult.style_items_created}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">BOM Items</dt><dd className="text-heading">{importResult.bom_items_created}</dd></div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Link to={`/styles/${importResult.style.id}`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium transition-colors">View Style</Link>
              <button onClick={reset} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Import Another</button>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
