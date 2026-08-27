import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import DesignSheetHeader from '../components/DesignSheetHeader';
import DesignSheetSketch from '../components/DesignSheetSketch';
import { merchApi } from '../api/client';
import type { DesignSheet } from '../api/client';

export default function DesignSheetPage() {
  const { id } = useParams<{ id: string }>();
  const [sheet, setSheet] = useState<DesignSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    merchApi
      .getDesignSheet(id)
      .then((res) => {
        if (!cancelled) setSheet(res.data);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load design sheet');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div data-testid="design-sheet-loading" className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {!sheet && !error && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="w-14 h-14 mb-4 rounded-full bg-surface-alt/60 flex items-center justify-center">
              <svg className="w-7 h-7 text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">Design Sheets</h1>
            <p className="text-muted text-sm mt-1">
              Select a design sheet from the tech pack import flow to view its details.
            </p>
          </div>
        )}

        {sheet && (
          <div className="space-y-6">
            <DesignSheetHeader sheet={sheet} onStatusChange={setSheet} />
            <DesignSheetSketch
              techpackId={sheet.tech_pack}
              designSheetId={sheet.id}
              sketchUrl={sheet.sketch_url}
              annotations={sheet.sketch_annotations}
              onAnnotationsChange={(annotations) => setSheet({ ...sheet, sketch_annotations: annotations })}
              onSketchChange={(url) => setSheet({ ...sheet, sketch_url: url })}
            />

            <section className="bg-surface rounded-xl border border-border p-6">
              <h2 className="text-lg font-bold mb-3">Fit Specs</h2>
              {sheet.fit_specs.length === 0 ? (
                <p className="text-muted text-sm">No fit specs yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {sheet.fit_specs.map((fs) => (
                    <li key={fs.id} className="flex items-center gap-3 text-heading">
                      <span className="font-mono">{fs.fit_number}</span>
                      {fs.is_selected && <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-badge-emerald">Selected</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-surface rounded-xl border border-border p-6">
              <h2 className="text-lg font-bold mb-3">Job Requests</h2>
              {sheet.job_requests.length === 0 ? (
                <p className="text-muted text-sm">No job requests yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {sheet.job_requests.map((jr) => (
                    <li key={jr.id} className="flex items-center gap-3 text-heading">
                      <span className="font-mono">{jr.job_type}</span>
                      <span className="text-muted">{jr.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </Layout>
  );
}