import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import DesignSheetHeader from '../components/DesignSheetHeader';
import DesignSheetSketch from '../components/DesignSheetSketch';
import DesignSheetMaterial from '../components/DesignSheetMaterial';
import DesignSheetFitSpecs from '../components/DesignSheetFitSpecs';
import DesignSheetImages, { type DesignImagesUploadData } from '../components/DesignSheetImages';
import DesignSheetJobRequests from '../components/DesignSheetJobRequests';
import { merchApi, usersApi } from '../api/client';
import { toBomItemPatch, toMaterialRows } from '../api/materialGrid';
import type { MaterialItem } from '../components/DesignSheetMaterial';
import type { UserOption } from '../components/DesignSheetJobRequests';
import type { DesignSheet } from '../api/client';
import type { DesignImage } from '../api/client';

const DEFAULT_BLOCK_ORDER = [
  'header', 'sketch', 'material', 'fit_specs',
  'images', 'job_requests',
];

export default function DesignSheetPage() {
  const { id } = useParams<{ id: string }>();
  const [sheet, setSheet] = useState<DesignSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [designImages, setDesignImages] = useState<DesignImage[]>([]);
  const [fitCopySources, setFitCopySources] = useState<import('../components/DesignSheetFitSpecs').FitCopySourceOption[]>([]);

  useEffect(() => {
    usersApi
      .getUsers()
      .then((res) =>
        setUserOptions(
          res.data.results.map((u) => ({
            id: u.id,
            name: u.full_name || u.username,
          })),
        ),
      )
      .catch(() => setUserOptions([]));
    merchApi
      .getDesignSheets()
      .then((res) => setFitCopySources(res.data.results.map((s) => ({ id: s.id, file_number: s.file_number, style_code: s.style_code }))))
      .catch(() => setFitCopySources([]));
  }, []);

  const loadSheet = useCallback(() => {
    if (!id) {
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    setError(null);
    return merchApi
      .getDesignSheet(id)
      .then((res) => {
        setSheet(res.data);
        const styleId = res.data.style_id;
        if (styleId) {
          return merchApi
            .getStyleDesignImages(styleId)
            .then((imgRes) => setDesignImages(imgRes.data))
            .catch(() => setDesignImages([]));
        }
        setDesignImages([]);
        return undefined;
      })
      .catch(() => setError('Failed to load design sheet'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  const materialItems = sheet ? toMaterialRows(sheet.material_items ?? []) : [];

  const handleMaterialEdit = (field: string, value: unknown, row: MaterialItem) => {
    const rowId = typeof row.id === 'string' ? row.id : null;
    const patch = toBomItemPatch(field, value);
    if (!patch || !rowId) return;
    setError(null);
    merchApi
      .updateBOMItem(rowId, patch)
      .then(() => {
        setSheet((prev) =>
          prev
            ? {
                ...prev,
                material_items: prev.material_items?.map((item) =>
                  item.id === rowId ? { ...item, [field]: value } : item,
                ),
              }
            : prev,
        );
      })
      .catch(() => setError('Failed to save material edit'));
  };

  const handleMaterialAdd = () => {
    const bomId = materialItems[0]?.bom_id;
    if (!bomId) return;
    setError(null);
    merchApi
      .createBOMItem({ bom: bomId, item_name: 'New Item', category: 'Others' })
      .then(() => loadSheet())
      .catch(() => setError('Failed to add material item'));
  };

  const handleMaterialDelete = (row: MaterialItem) => {
    const rowId = typeof row.id === 'string' ? row.id : null;
    if (!rowId) return;
    setError(null);
    merchApi
      .deleteBOMItem(rowId)
      .then(() =>
        setSheet((prev) =>
          prev
            ? {
                ...prev,
                material_items: prev.material_items?.filter((item) => item.id !== rowId),
              }
            : prev,
        ),
      )
      .catch(() => setError('Failed to delete material item'));
  };

  const refreshSheet = () => {
    setError(null);
    return loadSheet();
  };

  const handleFitSpecCreate = (data: import('../components/DesignSheetFitSpecs').FitSpecFormData) => {
    if (!sheet) return;
    setError(null);
    merchApi
      .createFitSpecification({ design_sheet: sheet.id, ...data })
      .then(() => refreshSheet())
      .catch(() => setError('Failed to create fit spec'));
  };

  const handleFitSpecSelect = (fitSpecId: string) => {
    setError(null);
    merchApi
      .updateFitSpecification(fitSpecId, { is_selected: true })
      .then(() => refreshSheet())
      .catch(() => setError('Failed to select fit spec'));
  };

  const handleFitSpecUpdate = (fitSpecId: string, data: Record<string, unknown>) => {
    setError(null);
    merchApi
      .updateFitSpecification(fitSpecId, data)
      .then(() => refreshSheet())
      .catch(() => setError('Failed to update fit spec'));
  };

  const handleFitImageAdd = (fitSpecId: string, file: File) => {
    const form = new FormData();
    form.append('fit_spec', fitSpecId);
    form.append('image', file);
    setError(null);
    merchApi
      .createFitImage(form)
      .then(() => refreshSheet())
      .catch(() => setError('Failed to upload fit image'));
  };

  const handleFitImageDelete = (imageId: string) => {
    setError(null);
    merchApi
      .deleteFitImage(imageId)
      .then(() => refreshSheet())
      .catch(() => setError('Failed to delete fit image'));
  };

  const handleFitImageReorder = (imageId: string, newOrder: number) => {
    setError(null);
    merchApi
      .updateFitImage(imageId, { order: newOrder })
      .then(() => refreshSheet())
      .catch(() => setError('Failed to reorder fit image'));
  };

  const handleFitSpecCopyFromBase = (opts?: { include_annotations: boolean }) => {
    if (!sheet) return;
    setError(null);
    merchApi
      .copyFitSpec(sheet.id, opts ?? {})
      .then(() => refreshSheet())
      .catch(() => setError('Failed to copy fit spec from base'));
  };

  const handleFitSpecCopyFromOtherStyle = (sourceSheetId: string) => {
    if (!sheet) return;
    setError(null);
    merchApi
      .copyFitSpec(sheet.id, { source_design_sheet: sourceSheetId })
      .then(() => refreshSheet())
      .catch(() => setError('Failed to copy fit spec'));
  };

  const handleJobCreate = (data: import('../components/DesignSheetJobRequests').JobRequestFormData) => {
    if (!sheet) return;
    setError(null);
    merchApi
      .createDesignSheetJob(sheet.id, data)
      .then(() => refreshSheet())
      .catch(() => setError('Failed to create job request'));
  };

  const handleJobAllocate = (jobId: string, userId: string) => {
    setError(null);
    merchApi
      .updateDesignJobRequest(jobId, { allocated_to: userId })
      .then(() => refreshSheet())
      .catch(() => setError('Failed to allocate user'));
  };

  const handleDesignImageUpload = (data: DesignImagesUploadData) => {
    const form = new FormData();
    form.append('style', data.styleId);
    form.append('role', data.role);
    form.append('caption', data.caption);
    form.append('image', data.file);
    setError(null);
    merchApi
      .createDesignImage(form)
      .then(() => {
        setDesignImages([]);
        return loadSheet();
      })
      .then(() => refreshImages())
      .catch(() => setError('Failed to upload design image'));
  };

  const handleDesignImageSetMain = (imageId: string) => {
    setError(null);
    merchApi
      .setMainDesignImage(imageId)
      .then(() => refreshImages())
      .catch(() => setError('Failed to set main image'));
  };

  const handleDesignImageSetRole = (imageId: string, role: string) => {
    setError(null);
    merchApi
      .updateDesignImage(imageId, { role })
      .then(() => refreshImages())
      .catch(() => setError('Failed to update image role'));
  };

  const handleDesignImageDelete = (imageId: string) => {
    setError(null);
    merchApi
      .deleteDesignImage(imageId)
      .then(() => setDesignImages((prev) => prev.filter((i) => i.id !== imageId)))
      .catch(() => setError('Failed to delete image'));
  };

  const refreshImages = () => {
    if (!sheet?.style_id) return Promise.resolve();
    return merchApi
      .getStyleDesignImages(sheet.style_id)
      .then((res) => setDesignImages(res.data))
      .catch(() => setDesignImages([]));
  };

  const handleMoveBlock = (key: string, direction: 'up' | 'down') => {
    if (!sheet) return;
    const order = sheet.layout_order.length > 0
      ? [...sheet.layout_order]
      : [...DEFAULT_BLOCK_ORDER];
    const index = order.indexOf(key);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setError(null);
    merchApi
      .updateDesignSheet(sheet.id, { layout_order: next })
      .then(() =>
        setSheet((prev) => (prev ? { ...prev, layout_order: next } : prev)),
      )
      .catch(() => setError('Failed to reorder blocks'));
  };

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
            <div className="flex justify-end">
              <Link
                to={`/design-sheets/${sheet.id}/print`}
                className="px-3 py-1.5 rounded-lg bg-surface-alt text-muted text-sm font-medium border border-border hover:border-emerald-500/40"
              >
                Print Design Sheet
              </Link>
            </div>
            {(() => {
              const blockKeys = sheet.layout_order.length > 0
                ? sheet.layout_order
                : DEFAULT_BLOCK_ORDER;
              const blocks = new Map<string, React.ReactNode>([
                ['header',
                  <DesignSheetHeader key="header" sheet={sheet} onStatusChange={setSheet} />],
                ['sketch',
                  <DesignSheetSketch
                    key="sketch"
                    techpackId={sheet.tech_pack}
                    designSheetId={sheet.id}
                    sketchUrl={sheet.sketch_url}
                    annotations={sheet.sketch_annotations}
                    onAnnotationsChange={(annotations) => setSheet({ ...sheet, sketch_annotations: annotations })}
                    onSketchChange={(url) => setSheet({ ...sheet, sketch_url: url })}
                  />],
                ['material',
                  <DesignSheetMaterial
                    key="material"
                    bomItems={materialItems}
                    onItemEdit={handleMaterialEdit}
                    onItemAdd={handleMaterialAdd}
                    onItemDelete={handleMaterialDelete}
                  />],
                ['fit_specs',
                  <DesignSheetFitSpecs
                    key="fit_specs"
                    fitSpecs={sheet.fit_specs}
                    onCreateFitSpec={handleFitSpecCreate}
                    onSelectFitSpec={handleFitSpecSelect}
                    onAddFitImage={handleFitImageAdd}
                    onDeleteFitImage={handleFitImageDelete}
                    onReorderFitImage={handleFitImageReorder}
                    onCopyFromBase={handleFitSpecCopyFromBase}
                    onCopyFromOtherStyle={handleFitSpecCopyFromOtherStyle}
                    onUpdateFitSpec={handleFitSpecUpdate}
                    otherSheets={fitCopySources.filter((s) => s.id !== sheet.id)}
                  />],
                ['images',
                  <DesignSheetImages
                    key="images"
                    images={designImages}
                    styleId={sheet.style_id || undefined}
                    onUpload={handleDesignImageUpload}
                    onSetMain={handleDesignImageSetMain}
                    onSetRole={handleDesignImageSetRole}
                    onDelete={handleDesignImageDelete}
                  />],
                ['job_requests',
                  <DesignSheetJobRequests
                    key="job_requests"
                    jobRequests={sheet.job_requests}
                    users={userOptions}
                    onCreateJobRequest={handleJobCreate}
                    onAllocateUser={handleJobAllocate}
                  />],
              ]);
              return blockKeys.map((key, index) => {
                const node = blocks.get(key);
                if (!node) return null;
                return (
                  <div key={key} data-testid={`block-${key}`} className="space-y-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        data-testid={`move-up-${key}`}
                        disabled={index === 0}
                        aria-label={`Move ${key} section up`}
                        onClick={() => handleMoveBlock(key, 'up')}
                        className="px-2 py-1 rounded-md text-xs text-muted border border-border hover:border-emerald-500/40 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        data-testid={`move-down-${key}`}
                        disabled={index === blockKeys.length - 1}
                        aria-label={`Move ${key} section down`}
                        onClick={() => handleMoveBlock(key, 'down')}
                        className="px-2 py-1 rounded-md text-xs text-muted border border-border hover:border-emerald-500/40 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Move down
                      </button>
                    </div>
                    {node}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </main>
    </Layout>
  );
}