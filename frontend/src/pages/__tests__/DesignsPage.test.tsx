import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const gridCapture = vi.hoisted(() => ({
  lastProps: null as Record<string, unknown> | null,
  reset() {
    this.lastProps = null;
  },
}));

const cardCapture = vi.hoisted(() => ({
  cards: [] as Array<Record<string, unknown>>,
  reset() {
    this.cards = [];
  },
}));

vi.mock('../../api/client', () => ({
  merchApi: {
    getDesignSheets: vi.fn(),
    initDesignSheet: vi.fn(),
    exportDesignSheets: vi.fn(),
    updateStyle: vi.fn(),
  },
  setupApi: {
    getTypes: vi.fn(),
    getCategories: vi.fn(),
    getBuyers: vi.fn(),
  },
}));

vi.mock('../../components/SpreadsheetGrid', () => ({
  default: (props: Record<string, unknown>) => {
    gridCapture.lastProps = props;
    const { data } = props as { data: Record<string, unknown>[] };
    return (
      <div data-testid="spreadsheet-grid">
        {(data as Record<string, unknown>[]).map((row) => (
          <div key={String(row.id)} data-testid={`grid-row-${String(row.id)}`}>
            <span>{String(row.style_code)}</span>
            <span>{String(row.design)}</span>
            <span>{String(row.status)}</span>
            {row.risk_date ? <span>{String(row.risk_date)}</span> : null}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('../../components/EntityCard', () => ({
  CardListToggle: ({ onChange }: { view: 'grid' | 'list'; onChange: (v: 'grid' | 'list') => void }) => (
    <div>
      <button data-testid="toggle-grid" onClick={() => onChange('grid')}>
        grid
      </button>
      <button data-testid="toggle-list" onClick={() => onChange('list')}>
        list
      </button>
    </div>
  ),
  default: (props: Record<string, unknown>) => {
    cardCapture.cards.push(props);
    const { title, code, url, actions } = props as {
      title: string;
      code: string;
      url: string;
      actions?: { onClick: () => void }[];
    };
    return (
      <div data-testid="entity-card" data-url={url}>
        <span>{String(title)}</span>
        <span>{String(code)}</span>
        <button onClick={() => actions?.[0]?.onClick()}>card-view</button>
      </div>
    );
  },
}));

import DesignsPage from '../DesignsPage';
import { merchApi, setupApi } from '../../api/client';

type SpreadsheetColumnLike = {
  title: string;
  field: string;
  headerFilter?: boolean;
  headerFilterType?: string;
  hozAlign?: string;
  editor?: boolean | string;
  editorParams?: Record<string, unknown>;
};

const DESIGN_REGISTER_COLUMNS = [
  'Design',
  'Style Code',
  'Buyer',
  'Style Type',
  'Category',
  'Based on',
  'Relationship',
  'Status',
  'Department',
  'Designer',
  'Risk Date',
  'Live Orders',
  'Completed Orders',
  'Pattern Request Date',
  'Annotation',
  'Notes',
  'Sketch',
];

const design = {
  id: 'reg-1',
  style_code: 'REG-1001',
  style_name: 'Relaxed Jogger',
  product_type_id: 'pt-1',
  product_type_name: 'Jogger',
  product_category_name: 'Apparel',
  based_on: '59073T',
  relationship: 'based_on',
  style_number: 'REG-1001',
  buyer_id: 'b-1',
  buyer_name: 'Alpha Buyer',
  block: '59073T',
  description: 'Front pocket changed',
  status: 'new',
  department: 'Apparel',
  designer: 'Emmi.Huynh',
  risk_date: '2026-09-01',
  live_orders_count: 3,
  completed_orders_count: 2,
  pattern_request_date: '2026-08-15',
  sketch_annotations: [
    { id: 'a1', x: 12, y: 34, text: 'WAIST SEAM' },
    { id: 'a2', x: 78, y: 55, text: 'CUFF PINCH' },
  ],
  note: 'Front pocket changed',
  sketch: 'SK-REG-1001',
  sketch_url: 'http://localhost/media/sketch-reg-1001.png',
};

const setupTypes = [
  { id: 'pt-1', name: 'Jogger', code: 'JGR', category_name: 'Apparel', status: 'active' },
  { id: 'pt-2', name: 'Tee', code: 'TEE', category_name: 'Apparel', status: 'active' },
];

const setupCategories = [
  { id: 'cat-1', name: 'Apparel', code: 'APP', status: 'active' },
  { id: 'cat-2', name: 'Knitwear', code: 'KTN', status: 'active' },
];

const setupBuyers = [
  { id: 'b-1', name: 'Alpha Buyer', code: 'ABB', is_active: true },
  { id: 'b-2', name: 'Beta Buyer', code: 'BB2', is_active: true },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/design']}>
      <Routes>
        <Route path="/design" element={<DesignsPage />} />
        <Route path="/design-sheets/:id" element={<div>DS-DETAIL-SHEET</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DesignsPage (unified Design register grid)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    cardCapture.reset();
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [], count: 0 },
    });
    (merchApi.initDesignSheet as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'ds-new-1' },
    });
    (merchApi.updateStyle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
    });
    (setupApi.getTypes as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: setupTypes, count: 2 },
    });
    (setupApi.getCategories as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: setupCategories, count: 2 },
    });
  });

  it('renders design rows through the Tabulator grid', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [design], count: 1 },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('REG-1001')).toBeInTheDocument();
    expect(screen.getByText('Relaxed Jogger')).toBeInTheDocument();
  });

  it('configures the 17 register columns with systematic per-column filters', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [design], count: 1 },
    });
    renderPage();
    await screen.findByText('REG-1001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    expect(columns?.map((c) => c.title)).toEqual(DESIGN_REGISTER_COLUMNS);
    const byField = Object.fromEntries((columns ?? []).map((c) => [c.field, c] as const));
    expect(byField['buyer']).toBeDefined();
    expect(byField['customer']).toBeUndefined();
    for (const f of ['buyer', 'product_type', 'product_category', 'relationship', 'status', 'department']) {
      expect(byField[f]?.headerFilterType).toBe('list');
    }
    for (const f of ['design', 'style_code', 'based_on', 'designer']) {
      expect(byField[f]?.headerFilterType).toBe('input');
    }
    for (const f of ['risk_date', 'pattern_request_date']) {
      expect(byField[f]?.headerFilterType).toBe('date');
    }
    expect(byField.risk_date.headerFilter).toBe(true);
    for (const c of columns ?? []) {
      if (c.field === 'live-orders' || c.field === 'completed-orders') {
        expect(c.hozAlign).toBe('right');
      }
    }
  });

  it('enables the Excel-like toolbar, export, print and pagination', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [design], count: 1 },
    });
    renderPage();
    await screen.findByText('REG-1001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.printable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Design Register');
    expect(gridCapture.lastProps?.paginationSize).toBe(20);
  });

  it('wires the toolbar Export to the tenant-scoped backend xlsx stream', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [design], count: 1 },
    });
    const blob = new Blob(['xlsx-bytes'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    (merchApi.exportDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({ data: blob });
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-design-register');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    renderPage();
    await screen.findByText('REG-1001');
    const onExport = gridCapture.lastProps?.onExport as (() => Promise<void>) | undefined;
    expect(onExport).toBeDefined();
    await act(async () => {
      await onExport?.();
    });
    expect(merchApi.exportDesignSheets).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(screen.queryByText('Design Register')).toBeInTheDocument();
    revokeObjectURL.mockRestore();
    createObjectURL.mockRestore();
  });

  it('carries style_id in gridData and makes the Design column editable', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [{ ...design, style_id: 'sty-42' }], count: 1 },
    });
    renderPage();
    await screen.findByText('REG-1001');
    const data = gridCapture.lastProps?.data as Record<string, unknown>[] | undefined;
    expect(data?.[0]?.style_id).toBe('sty-42');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    const designCol = columns?.find((c) => c.field === 'design');
    expect(designCol).toBeDefined();
    expect(designCol?.editor).toBe(true);
  });

  it('patches the Style name when the Design cell is edited', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [{ ...design, style_id: 'sty-42' }], count: 1 },
    });
    (merchApi.updateStyle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByText('REG-1001');
    const onCellEdited = gridCapture.lastProps?.onCellEdited as
      | ((field: string, value: string, row: Record<string, unknown>) => void)
      | undefined;
    expect(onCellEdited).toBeDefined();
    await act(async () => {
      onCellEdited?.('design', 'Renamed Jogger', {
        id: 'reg-1',
        style_id: 'sty-42',
      });
    });
    expect(merchApi.updateStyle).toHaveBeenCalledWith('sty-42', { name: 'Renamed Jogger' });
  });

  it('makes Style Type and Category master-data dropdown editors', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [{ ...design, style_id: 'sty-42' }], count: 1 },
    });
    renderPage();
    await screen.findByText('REG-1001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    const byField = Object.fromEntries((columns ?? []).map((c) => [c.field, c] as const));
    expect(byField['product_type']?.editor).toBe('select');
    expect(byField['product_category']?.editor).toBe('select');
    const typeValues = byField['product_type']?.editorParams?.values as
      | Record<string, string>
      | undefined;
    expect(typeValues).toEqual({ Jogger: 'Jogger', Tee: 'Tee' });
    const categoryValues = byField['product_category']?.editorParams?.values as
      | Record<string, string>
      | undefined;
    expect(categoryValues).toEqual({ Apparel: 'Apparel', Knitwear: 'Knitwear' });
  });

  it('patches Style product_type when the Style Type cell is edited', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [{ ...design, style_id: 'sty-42' }], count: 1 },
    });
    (merchApi.updateStyle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByText('REG-1001');
    const onCellEdited = gridCapture.lastProps?.onCellEdited as
      | ((field: string, value: string, row: Record<string, unknown>) => void)
      | undefined;
    expect(onCellEdited).toBeDefined();
    await act(async () => {
      onCellEdited?.('product_type', 'Tee', {
        id: 'reg-1',
        style_id: 'sty-42',
      });
    });
    expect(merchApi.updateStyle).toHaveBeenCalledWith('sty-42', { product_type: 'pt-2' });
  });

  it('patches Style category when the Category cell is edited', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [{ ...design, style_id: 'sty-42' }], count: 1 },
    });
    (merchApi.updateStyle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByText('REG-1001');
    const onCellEdited = gridCapture.lastProps?.onCellEdited as
      | ((field: string, value: string, row: Record<string, unknown>) => void)
      | undefined;
    expect(onCellEdited).toBeDefined();
    await act(async () => {
      onCellEdited?.('product_category', 'Knitwear', {
        id: 'reg-1',
        style_id: 'sty-42',
      });
    });
    expect(merchApi.updateStyle).toHaveBeenCalledWith('sty-42', { category: 'cat-2' });
  });

  it('maps register values to display labels for the grid', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [design], count: 1 },
    });
    renderPage();
    await screen.findByText('REG-1001');
    const data = gridCapture.lastProps?.data as Record<string, unknown>[] | undefined;
    expect(data).toBeDefined();
    const row = data?.[0];
    expect(row?.design).toBe('Relaxed Jogger');
    expect(row?.buyer).toBe('Alpha Buyer');
    expect(row?.customer).toBeUndefined();
    expect(row?.product_type).toBe('Jogger');
    expect(row?.product_category).toBe('Apparel');
    expect(row?.based_on).toBe('59073T');
    expect(row?.relationship).toBe('Based on');
    expect(row?.status).toBe('New');
    expect(row?.department).toBe('Apparel');
    expect(row?.designer).toBe('Emmi.Huynh');
    expect(row?.risk_date).toBe('2026-09-01');
    expect(row?.live_orders).toBe(3);
    expect(row?.completed_orders).toBe(2);
    expect(row?.pattern_request_date).toBe('2026-08-15');
    expect(row?.annotation).toBe('2 marks');
    expect(row?.notes).toBe('Front pocket changed');
    expect(row?.sketch).toBe('SK-REG-1001');
  });

  it('maps a missing buyer to an em dash in the register row', async () => {
    const { buyer_name: _b, ...noBuyerName } = design;
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [{ ...noBuyerName }], count: 1 },
    });
    renderPage();
    await screen.findByText('REG-1001');
    const data = gridCapture.lastProps?.data as Record<string, unknown>[] | undefined;
    expect(data?.[0]?.buyer).toBe('—');
  });

  it('drills into the design sheet detail when a row is clicked', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [design], count: 1 },
    });
    renderPage();
    await screen.findByText('REG-1001');
    const onRowClick = gridCapture.lastProps?.onRowClick as
      | ((row: Record<string, unknown>) => void)
      | undefined;
    expect(onRowClick).toBeDefined();
    act(() => {
      onRowClick?.({ id: 'reg-1' });
    });
    expect(await screen.findByText('DS-DETAIL-SHEET')).toBeInTheDocument();
  });

  it('keeps the grid/list view toggle and defaults to the spreadsheet (list) view', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [design], count: 1 },
    });
    renderPage();
    await screen.findByText('REG-1001');
    expect(screen.getByTestId('spreadsheet-grid')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-grid')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-list')).toBeInTheDocument();
    expect(screen.queryByTestId('entity-card')).not.toBeInTheDocument();
  });

  it('switches to a modern card grid view with one card per register row', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [design], count: 1 },
    });
    renderPage();
    await screen.findByText('REG-1001');
    fireEvent.click(screen.getByTestId('toggle-grid'));
    await waitFor(() =>
      expect(screen.queryByTestId('spreadsheet-grid')).not.toBeInTheDocument(),
    );
    expect(screen.getAllByTestId('entity-card')).toHaveLength(1);
    expect(cardCapture.cards).toHaveLength(1);
    const card = cardCapture.cards[0];
    expect(card?.title).toBe('Relaxed Jogger');
    expect(card?.code).toBe('REG-1001');
    expect(card?.status).toBe('new');
    expect(card?.image).toBe('http://localhost/media/sketch-reg-1001.png');
    expect(card?.subtitle).toBe('Emmi.Huynh · Apparel');
    expect(card?.date).toBe('2026-08-15');
    expect(card?.url).toBe('/design-sheets/reg-1');
    expect(card?.compact).toBe(true);
    const metrics = card?.metrics as Array<{ label: string; value: number }> | undefined;
    expect(metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Live', value: 3 }),
        expect.objectContaining({ label: 'Completed', value: 2 }),
      ]),
    );
  });

  it('navigates to the design sheet detail from a card quick action', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [design], count: 1 },
    });
    renderPage();
    await screen.findByText('REG-1001');
    fireEvent.click(screen.getByTestId('toggle-grid'));
    await waitFor(() => expect(screen.getAllByTestId('entity-card')).toHaveLength(1));
    fireEvent.click(screen.getAllByRole('button', { name: 'card-view' })[0]);
    expect(await screen.findByText('DS-DETAIL-SHEET')).toBeInTheDocument();
  });

  it('returns to the list view when the toggle is switched back', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [design], count: 1 },
    });
    renderPage();
    await screen.findByText('REG-1001');
    fireEvent.click(screen.getByTestId('toggle-grid'));
    await waitFor(() =>
      expect(screen.queryByTestId('spreadsheet-grid')).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('toggle-list'));
    await screen.findByTestId('spreadsheet-grid');
    expect(screen.getByText('REG-1001')).toBeInTheDocument();
  });
});

describe('DesignsPage (New Design flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    cardCapture.reset();
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [design], count: 1 },
    });
    (merchApi.initDesignSheet as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'ds-new-1' },
    });
    (merchApi.updateStyle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
    });
    (setupApi.getTypes as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: setupTypes, count: 2 },
    });
    (setupApi.getCategories as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: setupCategories, count: 2 },
    });
    (setupApi.getBuyers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: setupBuyers, count: 2 },
    });
  });

  it('renders a New Design button on the register header', async () => {
    renderPage();
    await screen.findByText('REG-1001');
    expect(screen.getByRole('button', { name: '+ New Design' })).toBeInTheDocument();
  });

  it('fresh mode offers searchable setup lists and hides style reference / relationship', async () => {
    renderPage();
    await screen.findByText('REG-1001');
    fireEvent.click(screen.getByRole('button', { name: '+ New Design' }));

    const dialog = await screen.findByTestId('new-design-modal');
    expect(dialog).toBeInTheDocument();

    expect(setupApi.getTypes).toHaveBeenCalled();
    expect(setupApi.getBuyers).toHaveBeenCalled();
    expect(screen.getByLabelText(/Garments Type/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Buyer/)).toBeInTheDocument();
    expect(screen.getByLabelText('Style Code')).toBeDisabled();
    expect(screen.queryByLabelText('Style Reference')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Relationship')).not.toBeInTheDocument();

    const garments = screen.getByLabelText(/Garments Type/);
    fireEvent.change(garments, { target: { value: 'Jogger' } });
    fireEvent.click(screen.getByRole('button', { name: /Jogger/ }));

    const buyer = screen.getByLabelText(/Buyer/);
    fireEvent.change(buyer, { target: { value: 'Beta' } });
    fireEvent.click(screen.getByRole('button', { name: /Beta Buyer/ }));

    fireEvent.change(screen.getByLabelText('Block Reference'), {
      target: { value: '59080T' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Brand new jogger' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Design' }));
    await waitFor(() =>
      expect(merchApi.initDesignSheet).toHaveBeenCalledWith({
        mode: 'fresh',
        product_type: 'pt-1',
        buyer: 'b-2',
        block_reference: '59080T',
        description: 'Brand new jogger',
        include_annotation: false,
        include_notes: false,
      }),
    );
    expect(await screen.findByText('DS-DETAIL-SHEET')).toBeInTheDocument();
  });

  it('copy mode makes the source searchable by style code and derives readonly fields', async () => {
    renderPage();
    await screen.findByText('REG-1001');
    fireEvent.click(screen.getByRole('button', { name: '+ New Design' }));
    await screen.findByTestId('new-design-modal');

    fireEvent.click(screen.getByRole('button', { name: 'Copy From Existing' }));

    const source = screen.getByLabelText(/Copy From Existing Design/);
    fireEvent.change(source, { target: { value: 'REG-1001' } });
    fireEvent.click(screen.getByRole('button', { name: /REG-1001/ }));

    expect(screen.getByLabelText('Garments Type')).toHaveValue('Jogger');
    expect(screen.getByLabelText('Garments Type')).toBeDisabled();
    expect(screen.getByLabelText('Style Reference')).toHaveValue('REG-1001');
    expect(screen.getByLabelText('Style Reference')).toBeDisabled();
    expect(screen.getByLabelText('Relationship')).toHaveValue('Based on');
    expect(screen.getByLabelText('Relationship')).toBeDisabled();
    expect(screen.getByLabelText('Style Code')).toBeDisabled();
    expect(screen.getByLabelText('Block Reference')).toHaveValue('59073T');
    expect(screen.getByLabelText('Description')).toHaveValue('Front pocket changed');

    const buyer = screen.getByLabelText(/Buyer/);
    fireEvent.change(buyer, { target: { value: 'Beta' } });
    fireEvent.click(screen.getByRole('button', { name: /Beta Buyer/ }));

    fireEvent.click(screen.getByLabelText('Include Annotation'));
    fireEvent.click(screen.getByLabelText('Include Notes'));

    fireEvent.click(screen.getByRole('button', { name: 'Create Design' }));
    await waitFor(() =>
      expect(merchApi.initDesignSheet).toHaveBeenCalledWith({
        mode: 'copy',
        source_design_sheet: 'reg-1',
        buyer: 'b-2',
        block_reference: '59073T',
        description: 'Front pocket changed',
        include_annotation: true,
        include_notes: true,
        designer: 'Emmi.Huynh',
        risk_date: '2026-09-01',
        pattern_request_date: '2026-08-15',
        design_note: 'Front pocket changed',
      }),
    );
    expect(await screen.findByText('DS-DETAIL-SHEET')).toBeInTheDocument();
  });

  it('fresh mode exposes the full Design Information inputs and sends them', async () => {
    renderPage();
    await screen.findByText('REG-1001');
    fireEvent.click(screen.getByRole('button', { name: '+ New Design' }));
    await screen.findByTestId('new-design-modal');

    expect(screen.getByLabelText(/Issue Date/)).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText(/Risk Date/)).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText(/Pattern Request Date/)).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Design Note').tagName).toBe('TEXTAREA');

    fireEvent.change(screen.getByLabelText('Designer'), { target: { value: 'Ava.Designer' } });
    fireEvent.change(screen.getByLabelText('Pattern Cutter'), { target: { value: 'Pat.Cutter' } });
    fireEvent.change(screen.getByLabelText('Issuer'), { target: { value: 'Issuer Two' } });
    fireEvent.change(screen.getByLabelText('Cloth Code'), { target: { value: 'CC-200' } });
    fireEvent.change(screen.getByLabelText('Size'), { target: { value: 'L/XL' } });
    fireEvent.change(screen.getByLabelText('Length'), { target: { value: '34 inches' } });
    fireEvent.change(screen.getByLabelText(/Issue Date/), { target: { value: '2026-09-14' } });
    fireEvent.change(screen.getByLabelText(/Risk Date/), { target: { value: '2026-09-20' } });
    fireEvent.change(screen.getByLabelText(/Pattern Request Date/), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('Design Note'), { target: { value: 'Direct entry note' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Brand new jogger' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Design' }));
    await waitFor(() =>
      expect(merchApi.initDesignSheet).toHaveBeenCalledWith({
        mode: 'fresh',
        block_reference: '',
        description: 'Brand new jogger',
        include_annotation: false,
        include_notes: false,
        designer: 'Ava.Designer',
        pattern_cutter: 'Pat.Cutter',
        issuer: 'Issuer Two',
        cloth_code: 'CC-200',
        size: 'L/XL',
        length: '34 inches',
        issue_date: '2026-09-14',
        risk_date: '2026-09-20',
        pattern_request_date: '2026-09-10',
        design_note: 'Direct entry note',
      }),
    );
  });

  it('copy mode pre-fills Design Information from the source and lets it be overridden', async () => {
    renderPage();
    await screen.findByText('REG-1001');
    fireEvent.click(screen.getByRole('button', { name: '+ New Design' }));
    await screen.findByTestId('new-design-modal');
    fireEvent.click(screen.getByRole('button', { name: 'Copy From Existing' }));

    const source = screen.getByLabelText(/Copy From Existing Design/);
    fireEvent.change(source, { target: { value: 'REG-1001' } });
    fireEvent.click(screen.getByRole('button', { name: /REG-1001/ }));

    expect(screen.getByLabelText('Designer')).toHaveValue('Emmi.Huynh');
    expect(screen.getByLabelText(/Risk Date/)).toHaveValue('2026-09-01');
    expect(screen.getByLabelText(/Pattern Request Date/)).toHaveValue('2026-08-15');
    expect(screen.getByLabelText('Design Note')).toHaveValue('Front pocket changed');

    fireEvent.change(screen.getByLabelText('Designer'), { target: { value: 'New.Designer' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Design' }));
    await waitFor(() =>
      expect(merchApi.initDesignSheet).toHaveBeenCalledWith({
        mode: 'copy',
        source_design_sheet: 'reg-1',
        block_reference: '59073T',
        description: 'Front pocket changed',
        include_annotation: false,
        include_notes: false,
        designer: 'New.Designer',
        risk_date: '2026-09-01',
        pattern_request_date: '2026-08-15',
        design_note: 'Front pocket changed',
      }),
    );
  });

  it('blocks submission until a copy source is chosen', async () => {
    renderPage();
    await screen.findByText('REG-1001');
    fireEvent.click(screen.getByRole('button', { name: '+ New Design' }));
    await screen.findByTestId('new-design-modal');
    fireEvent.click(screen.getByRole('button', { name: 'Copy From Existing' }));

    const submit = screen.getByRole('button', { name: 'Create Design' });
    expect(submit).toBeDisabled();
  });
});

describe('DesignsPage page layout standard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    cardCapture.reset();
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [design], count: 1 },
    });
    (setupApi.getTypes as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: setupTypes, count: 2 },
    });
    (setupApi.getCategories as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: setupCategories, count: 2 },
    });
  });

  it('wraps the page in the standard padded grid container', async () => {
    const { container } = renderPage();
    await screen.findByText('Design Register');
    const main = container.querySelector('main');
    expect(main).toBeTruthy();
    expect(main?.className).toContain('max-w-7xl');
    expect(main?.className).toContain('mx-auto');
    expect(main?.className).toContain('px-6');
    expect(main?.className).toContain('py-8');
  });

  it('renders the page title block with the standard spacing', async () => {
    renderPage();
    await screen.findByText('Design Register');
    const subtitle = screen.getByText('Design sheets across the buying house');
    expect(subtitle.className).toContain('text-sm');
    expect(subtitle.className).toContain('text-muted');
    expect(subtitle.className).toContain('mt-1');
  });
});