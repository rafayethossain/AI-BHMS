import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const materialCapture = vi.hoisted(() => ({
  current: null as null | {
    bomItems: Record<string, unknown>[];
    onItemEdit?: (field: string, value: unknown, row: Record<string, unknown>) => void;
    onItemAdd?: (row?: Record<string, unknown>) => void;
    onItemDelete?: (row: Record<string, unknown>) => void;
    onItemSelect?: (row: Record<string, unknown>) => void;
  },
}));

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('../../components/DesignSheetHeader', () => ({
  default: () => <div data-testid="header-mock" />,
}));

vi.mock('../../components/DesignSheetSketch', () => ({
  default: () => <div data-testid="sketch-mock" />,
}));

vi.mock('../../components/DesignSheetMaterial', () => ({
  default: (props: {
    bomItems: Record<string, unknown>[];
    onItemEdit?: (field: string, value: unknown, row: Record<string, unknown>) => void;
    onItemAdd?: (row?: Record<string, unknown>) => void;
    onItemDelete?: (row: Record<string, unknown>) => void;
    onItemSelect?: (row: Record<string, unknown>) => void;
  }) => {
    materialCapture.current = props;
    return <div data-testid="material-mock" />;
  },
}));

const fitSpecCapture = vi.hoisted(() => ({
  current: null as null | {
    fitSpecs: Record<string, unknown>[];
    onCreateFitSpec?: (data: Record<string, unknown>) => void;
    onSelectFitSpec?: (id: string) => void;
    onAddFitImage?: (fitSpecId: string, file: File) => void;
    onDeleteFitImage?: (imageId: string) => void;
    onReorderFitImage?: (imageId: string, newOrder: number) => void;
    onCopyFromBase?: () => void;
    onCopyFromOtherStyle?: (sourceSheetId: string) => void;
    otherSheets: { id: string; file_number: string; style_code: string }[];
  },
}));

const jobCapture = vi.hoisted(() => ({
  current: null as null | {
    jobRequests: Record<string, unknown>[];
    users: { id: string; name: string }[];
    onCreateJobRequest?: (data: Record<string, unknown>) => void;
    onAllocateUser?: (jobId: string, userId: string) => void;
  },
}));

vi.mock('../../components/DesignSheetFitSpecs', () => ({
  default: (props: {
    fitSpecs: Record<string, unknown>[];
    onCreateFitSpec?: (data: Record<string, unknown>) => void;
    onSelectFitSpec?: (id: string) => void;
    onAddFitImage?: (fitSpecId: string, file: File) => void;
    onDeleteFitImage?: (imageId: string) => void;
    onReorderFitImage?: (imageId: string, newOrder: number) => void;
    onCopyFromBase?: () => void;
    onCopyFromOtherStyle?: (sourceSheetId: string) => void;
    otherSheets: { id: string; file_number: string; style_code: string }[];
  }) => {
    fitSpecCapture.current = props;
    return <div data-testid="fitspec-mock" />;
  },
}));

vi.mock('../../components/DesignSheetJobRequests', () => ({
  default: (props: {
    jobRequests: Record<string, unknown>[];
    users: { id: string; name: string }[];
    onCreateJobRequest?: (data: Record<string, unknown>) => void;
    onAllocateUser?: (jobId: string, userId: string) => void;
  }) => {
    jobCapture.current = props;
    return <div data-testid="job-mock" />;
  },
}));

const merchApiMock = vi.hoisted(() => ({
  getDesignSheet: vi.fn(),
  updateBOMItem: vi.fn(),
  createBOMItem: vi.fn(),
  deleteBOMItem: vi.fn(),
  createFitSpecification: vi.fn(),
  updateFitSpecification: vi.fn(),
  createFitImage: vi.fn(),
  deleteFitImage: vi.fn(),
  updateFitImage: vi.fn(),
  copyFitSpec: vi.fn(),
  getDesignSheets: vi.fn(),
  createDesignSheetJob: vi.fn(),
  updateDesignJobRequest: vi.fn(),
  updateDesignSheet: vi.fn(),
}));

const usersApiMock = vi.hoisted(() => ({
  getUsers: vi.fn(),
}));

vi.mock('../../api/client', () => ({ merchApi: merchApiMock, usersApi: usersApiMock }));

import DesignSheetPage from '../DesignSheetPage';
import type { DesignSheet } from '../../api/client';

const baseSheet: DesignSheet = {
  id: 'ds-1',
  tech_pack: 'tp-1',
  status: 'new',
  style_code: '67741T',
  buyer_name: 'CMT Apparel',
  file_number: 'TP-1002',
  sketch_url: null,
  issue_date: null,
  block: '',
  based_on: '',
  customer: '',
  style_number: 'DS-STYLE-001',
  size: '',
  designer: '',
  pattern_cutter: '',
  issuer: '',
  cloth_code: '',
  length: '',
  sketch: '',
  description: '',
  note: '',
  sketch_annotations: [],
  layout_order: [],
  fit_specs: [],
  job_requests: [],
  created_at: '2026-08-27T10:00:00Z',
  updated_at: '2026-08-27T10:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/design-sheets/ds-1']}>
      <Routes>
        <Route path="/design-sheets/:id" element={<DesignSheetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DesignSheetPage material grid wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    materialCapture.current = null;
    fitSpecCapture.current = null;
    jobCapture.current = null;
    usersApiMock.getUsers.mockResolvedValue({
      data: {
        count: 2,
        results: [
          {
            id: 'u1',
            full_name: 'Alice Rahman',
            username: 'alice',
            first_name: 'Alice',
            last_name: 'Rahman',
            email: 'alice@demo.com',
          },
          {
            id: 'u2',
            full_name: 'Bob Chowdhury',
            username: 'bob',
            first_name: 'Bob',
            last_name: 'Chowdhury',
            email: 'bob@demo.com',
          },
        ],
      },
    });
    merchApiMock.getDesignSheets.mockResolvedValue({
      data: {
        count: 3,
        results: [
          { id: 'ds-1', file_number: 'TP-1002', style_code: '67741T' },
          { id: 'ds-2', file_number: 'TP-2001', style_code: '67711A' },
          { id: 'ds-3', file_number: 'TP-3003', style_code: '90001Z' },
        ],
      },
    });
  });

  it('passes mapped material rows into the Material grid', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({
      data: {
        ...baseSheet,
        material_items: [
          {
            id: 'bi-1',
            bom_id: 'bom-1',
            type: 'Cloth',
            description_code: 'SANDWASH LINEN XK-529',
            location: 'CUT ANGLE',
            supplier: 'FOURSEASONS',
            colour: 'WHITE',
            width_size: '60in',
            qty: 2.25,
            match: 'Left',
          },
          {
            id: 'bi-2',
            bom_id: 'bom-1',
            type: 'Trims',
            description_code: 'BUTTON 4 HOLES FV9757',
            location: '',
            supplier: '',
            colour: 'BLACK',
            width_size: '25mm',
            qty: null,
            match: '',
          },
        ],
      },
    });
    renderPage();
    expect(await screen.findByTestId('material-mock')).toBeInTheDocument();
    expect(materialCapture.current?.bomItems[0]).toMatchObject({
      id: 'bi-1',
      type: 'Cloth',
      description_code: 'SANDWASH LINEN XK-529',
      supplier: 'FOURSEASONS',
      qty: 2.25,
    });
  });

  it('persists grid edits through updateBOMItem and refreshes locally', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({
      data: {
        ...baseSheet,
        material_items: [
          {
            id: 'bi-1',
            bom_id: 'bom-1',
            type: 'Cloth',
            description_code: 'SANDWASH LINEN XK-529',
            location: 'CUT ANGLE',
            supplier: 'FOURSEASONS',
            colour: 'WHITE',
            width_size: '60in',
            qty: 2.25,
            match: 'Left',
          },
        ],
      },
    });
    merchApiMock.updateBOMItem.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByTestId('material-mock');
    await act(async () => {
      materialCapture.current?.onItemEdit?.('qty', 3, { id: 'bi-1' });
    });
    expect(merchApiMock.updateBOMItem).toHaveBeenCalledWith('bi-1', { ordered_qty: 3 });
    await waitFor(() => {
      expect(materialCapture.current?.bomItems[0].qty).toBe(3);
    });
  });

  it('does not send a patch for supplier edits', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({
      data: {
        ...baseSheet,
        material_items: [
          {
            id: 'bi-1',
            bom_id: 'bom-1',
            type: 'Cloth',
            description_code: 'SANDWASH LINEN XK-529',
            location: 'CUT ANGLE',
            supplier: 'FOURSEASONS',
            colour: 'WHITE',
            width_size: '60in',
            qty: 2.25,
            match: 'Left',
          },
        ],
      },
    });
    renderPage();
    await screen.findByTestId('material-mock');
    await act(async () => {
      materialCapture.current?.onItemEdit?.('supplier', 'NEW SUP', { id: 'bi-1' });
    });
    expect(merchApiMock.updateBOMItem).not.toHaveBeenCalled();
  });

  it('creates a BOM item and refetches when Add Item is used', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({
      data: {
        ...baseSheet,
        material_items: [
          {
            id: 'bi-1',
            bom_id: 'bom-1',
            type: 'Cloth',
            description_code: 'SANDWASH LINEN XK-529',
            location: '',
            supplier: '',
            colour: '',
            width_size: '',
            qty: 2.25,
            match: '',
          },
        ],
      },
    });
    merchApiMock.createBOMItem.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByTestId('material-mock');
    await act(async () => {
      materialCapture.current?.onItemAdd?.();
    });
    expect(merchApiMock.createBOMItem).toHaveBeenCalledWith({
      bom: 'bom-1',
      item_name: 'New Item',
      category: 'Others',
    });
    await waitFor(() => {
      expect(merchApiMock.getDesignSheet).toHaveBeenCalledTimes(2);
    });
  });
});

describe('DesignSheetPage fit spec + job request wiring', () => {
  const sheetWithFitAndJob: DesignSheet = {
    ...baseSheet,
    fit_specs: [
      {
        id: 'fs-1',
        design_sheet: 'ds-1',
        fit_number: 'DEV SPEC',
        fit_date: '2026-08-10',
        description: '',
        notes: '',
        is_selected: true,
        images: [],
        created_at: '2026-08-10T10:00:00Z',
      },
    ],
    job_requests: [
      {
        id: 'jr-1',
        design_sheet: 'ds-1',
        design_sheet_number: 'TP-1002',
        job_type: 'new_pattern',
        required_by: '2026-09-01',
        work_location: 'Cutting Section',
        no_of_garments: 120,
        allocated_to: null,
        allocated_to_name: null,
        notes: '',
        status: 'pending',
        created_at: '2026-08-10T10:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fitSpecCapture.current = null;
    jobCapture.current = null;
    usersApiMock.getUsers.mockResolvedValue({
      data: {
        count: 1,
        results: [
          {
            id: 'u1',
            full_name: 'Alice Rahman',
            username: 'alice',
            first_name: 'Alice',
            last_name: 'Rahman',
            email: 'alice@demo.com',
          },
        ],
      },
    });
    merchApiMock.getDesignSheets.mockResolvedValue({
      data: {
        count: 3,
        results: [
          { id: 'ds-1', file_number: 'TP-1002', style_code: '67741T' },
          { id: 'ds-2', file_number: 'TP-2001', style_code: '67711A' },
          { id: 'ds-3', file_number: 'TP-3003', style_code: '90001Z' },
        ],
      },
    });
  });

  it('passes fit specs, job requests and mapped users into the components', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: sheetWithFitAndJob });
    renderPage();
    await screen.findByTestId('fitspec-mock');
    expect(fitSpecCapture.current?.fitSpecs).toEqual([
      expect.objectContaining({ id: 'fs-1', fit_number: 'DEV SPEC', is_selected: true }),
    ]);
    expect(jobCapture.current?.jobRequests).toEqual([
      expect.objectContaining({ id: 'jr-1', job_type: 'new_pattern' }),
    ]);
    expect(jobCapture.current?.users).toEqual([{ id: 'u1', name: 'Alice Rahman' }]);
  });

  it('creates a fit spec through the API and refetches the sheet', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: baseSheet });
    merchApiMock.createFitSpecification.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByTestId('fitspec-mock');
    await act(async () => {
      fitSpecCapture.current?.onCreateFitSpec?.({
        fit_number: 'DEV SPEC',
        fit_date: '2026-09-01',
        description: 'First proto',
        notes: '',
      });
    });
    expect(merchApiMock.createFitSpecification).toHaveBeenCalledWith({
      design_sheet: 'ds-1',
      fit_number: 'DEV SPEC',
      fit_date: '2026-09-01',
      description: 'First proto',
      notes: '',
    });
    await waitFor(() => {
      expect(merchApiMock.getDesignSheet).toHaveBeenCalledTimes(2);
    });
  });

  it('selects a fit spec through a PATCH and refetches the sheet', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: baseSheet });
    merchApiMock.updateFitSpecification.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByTestId('fitspec-mock');
    await act(async () => {
      fitSpecCapture.current?.onSelectFitSpec?.('fs-2');
    });
    expect(merchApiMock.updateFitSpecification).toHaveBeenCalledWith('fs-2', { is_selected: true });
    await waitFor(() => {
      expect(merchApiMock.getDesignSheet).toHaveBeenCalledTimes(2);
    });
  });

  it('creates a job request through create-job and refetches the sheet', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: baseSheet });
    merchApiMock.createDesignSheetJob.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByTestId('job-mock');
    await act(async () => {
      jobCapture.current?.onCreateJobRequest?.({
        job_type: 'tech_sample',
        required_by: '2026-09-10',
        work_location: 'Sample Room',
        no_of_garments: 5,
        allocated_to: 'u1',
        notes: '',
      });
    });
    expect(merchApiMock.createDesignSheetJob).toHaveBeenCalledWith('ds-1', {
      job_type: 'tech_sample',
      required_by: '2026-09-10',
      work_location: 'Sample Room',
      no_of_garments: 5,
      allocated_to: 'u1',
      notes: '',
    });
    await waitFor(() => {
      expect(merchApiMock.getDesignSheet).toHaveBeenCalledTimes(2);
    });
  });

  it('allocates a user through PATCH and refetches the sheet', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: baseSheet });
    merchApiMock.updateDesignJobRequest.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByTestId('job-mock');
    await act(async () => {
      jobCapture.current?.onAllocateUser?.('jr-1', 'u1');
    });
    expect(merchApiMock.updateDesignJobRequest).toHaveBeenCalledWith('jr-1', {
      allocated_to: 'u1',
    });
    await waitFor(() => {
      expect(merchApiMock.getDesignSheet).toHaveBeenCalledTimes(2);
    });
  });

  it('uploads a fit image through the API and refetches the sheet', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: baseSheet });
    merchApiMock.createFitImage.mockResolvedValue({ data: {} });
    const file = new File(['x'], 'fit.png', { type: 'image/png' });
    renderPage();
    await screen.findByTestId('fitspec-mock');
    await act(async () => {
      fitSpecCapture.current?.onAddFitImage?.('fs-1', file);
    });
    expect(merchApiMock.createFitImage).toHaveBeenCalledTimes(1);
    const form = merchApiMock.createFitImage.mock.calls[0][0] as FormData;
    expect(form.get('fit_spec')).toBe('fs-1');
    expect(form.get('image')).toBe(file);
    await waitFor(() => {
      expect(merchApiMock.getDesignSheet).toHaveBeenCalledTimes(2);
    });
  });

  it('deletes a fit image through the API and refetches the sheet', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: baseSheet });
    merchApiMock.deleteFitImage.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByTestId('fitspec-mock');
    await act(async () => {
      fitSpecCapture.current?.onDeleteFitImage?.('img-1');
    });
    expect(merchApiMock.deleteFitImage).toHaveBeenCalledWith('img-1');
    await waitFor(() => {
      expect(merchApiMock.getDesignSheet).toHaveBeenCalledTimes(2);
    });
  });

  it('reorders a fit image via PATCH and refetches the sheet', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: baseSheet });
    merchApiMock.updateFitImage.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByTestId('fitspec-mock');
    await act(async () => {
      fitSpecCapture.current?.onReorderFitImage?.('img-2', 0);
    });
    expect(merchApiMock.updateFitImage).toHaveBeenCalledWith('img-2', { order: 0 });
    await waitFor(() => {
      expect(merchApiMock.getDesignSheet).toHaveBeenCalledTimes(2);
    });
  });

  it('lists other design sheets for the copy picker, excluding the current one', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: baseSheet });
    renderPage();
    await screen.findByTestId('fitspec-mock');
    await waitFor(() => {
      expect(fitSpecCapture.current?.otherSheets).toEqual([
        { id: 'ds-2', file_number: 'TP-2001', style_code: '67711A' },
        { id: 'ds-3', file_number: 'TP-3003', style_code: '90001Z' },
      ]);
    });
  });

  it('copies a fit spec from the base via the API and refetches the sheet', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: baseSheet });
    merchApiMock.copyFitSpec.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByTestId('fitspec-mock');
    await act(async () => {
      fitSpecCapture.current?.onCopyFromBase?.();
    });
    expect(merchApiMock.copyFitSpec).toHaveBeenCalledWith('ds-1', {});
    await waitFor(() => {
      expect(merchApiMock.getDesignSheet).toHaveBeenCalledTimes(2);
    });
  });

  it('copies a fit spec from another style via the API with the source id', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: baseSheet });
    merchApiMock.copyFitSpec.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByTestId('fitspec-mock');
    await act(async () => {
      fitSpecCapture.current?.onCopyFromOtherStyle?.('ds-2');
    });
    expect(merchApiMock.copyFitSpec).toHaveBeenCalledWith('ds-1', {
      source_design_sheet: 'ds-2',
    });
    await waitFor(() => {
      expect(merchApiMock.getDesignSheet).toHaveBeenCalledTimes(2);
    });
  });

  it('links to the printable design sheet page', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: sheetWithFitAndJob });
    renderPage();
    await screen.findByTestId('fitspec-mock');
    expect(screen.getByRole('link', { name: 'Print Design Sheet' })).toHaveAttribute(
      'href',
      '/design-sheets/ds-1/print',
    );
  });
});

describe('DesignSheetPage block layout order (design builder Phase 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fitSpecCapture.current = null;
    jobCapture.current = null;
    usersApiMock.getUsers.mockResolvedValue({
      data: {
        count: 2,
        results: [
          {
            id: 'u1',
            full_name: 'Alice Rahman',
            username: 'alice',
            first_name: 'Alice',
            last_name: 'Rahman',
            email: 'alice@demo.com',
          },
          {
            id: 'u2',
            full_name: 'Bob Chowdhury',
            username: 'bob',
            first_name: 'Bob',
            last_name: 'Chowdhury',
            email: 'bob@demo.com',
          },
        ],
      },
    });
    merchApiMock.getDesignSheets.mockResolvedValue({
      data: {
        count: 1,
        results: [{ id: 'ds-1', file_number: 'TP-1002', style_code: '67741T' }],
      },
    });
  });

  const blockKeys = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[data-testid^="block-"]')).map(
      (el) => el.getAttribute('data-testid'),
    );

  it('renders blocks in the persisted layout order', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({
      data: {
        ...baseSheet,
        layout_order: [
          'images', 'header', 'sketch', 'material',
          'fit_specs', 'job_requests',
        ],
      },
    });
    const { container } = renderPage();
    await screen.findByTestId('fitspec-mock');
    expect(blockKeys(container)).toEqual([
      'block-images',
      'block-header',
      'block-sketch',
      'block-material',
      'block-fit_specs',
      'block-job_requests',
    ]);
  });

  it('falls back to the standard block order when none is saved', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({
      data: { ...baseSheet, layout_order: [] },
    });
    const { container } = renderPage();
    await screen.findByTestId('fitspec-mock');
    expect(blockKeys(container)).toEqual([
      'block-header',
      'block-sketch',
      'block-material',
      'block-fit_specs',
      'block-images',
      'block-job_requests',
    ]);
  });

  it('moves a block up and persists the new order via PATCH', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({
      data: {
        ...baseSheet,
        layout_order: [
          'header', 'images', 'sketch', 'material',
          'fit_specs', 'job_requests',
        ],
      },
    });
    merchApiMock.updateDesignSheet.mockResolvedValue({
      data: {
        ...baseSheet,
        layout_order: [
          'images', 'header', 'sketch', 'material',
          'fit_specs', 'job_requests',
        ],
      },
    });
    renderPage();
    await screen.findByTestId('fitspec-mock');
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-up-images'));
    });
    expect(merchApiMock.updateDesignSheet).toHaveBeenCalledWith('ds-1', {
      layout_order: [
        'images', 'header', 'sketch', 'material',
        'fit_specs', 'job_requests',
      ],
    });
    await waitFor(() => {
      expect(screen.getByTestId('block-images')).not.toBe(null);
    });
  });

  it('moves a block down and persists the new order via PATCH', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: baseSheet });
    merchApiMock.updateDesignSheet.mockResolvedValue({ data: baseSheet });
    renderPage();
    await screen.findByTestId('fitspec-mock');
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-down-header'));
    });
    expect(merchApiMock.updateDesignSheet).toHaveBeenCalledWith('ds-1', {
      layout_order: [
        'sketch', 'header', 'material', 'fit_specs',
        'images', 'job_requests',
      ],
    });
  });

  it('disables move-up on the first block and move-down on the last block', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: baseSheet });
    const { container } = renderPage();
    await screen.findByTestId('fitspec-mock');
    expect(screen.getByTestId('move-up-header')).toBeDisabled();
    expect(screen.getByTestId('move-down-job_requests')).toBeDisabled();
    expect(container.querySelectorAll('[data-testid^="block-"]')).toHaveLength(6);
  });
});


