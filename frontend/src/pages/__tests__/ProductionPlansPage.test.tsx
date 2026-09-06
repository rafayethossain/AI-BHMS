import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

vi.mock('../../api/client', () => ({
  productionApi: {
    getPlans: vi.fn(),
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
    deletePlan: vi.fn(),
  },
  setupApi: { getFactories: vi.fn() },
  merchApi: { getPOs: vi.fn() },
}));

vi.mock('../../components/SpreadsheetGrid', () => ({
  default: (props: Record<string, unknown>) => {
    gridCapture.lastProps = props;
    const { data } = props as { data: Record<string, unknown>[] };
    return (
      <div data-testid="spreadsheet-grid">
        {(data as Record<string, unknown>[]).map((row) => (
          <div key={String(row.id)} data-testid={`grid-row-${String(row.id)}`}>
            <span>{String(row.po_number)}</span>
            <span>{String(row.factory_name)}</span>
            <span>{String(row.status)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import ProductionPlansPage from '../ProductionPlansPage';
import { productionApi, setupApi, merchApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/production/plans']}>
      <ProductionPlansPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

const plan = {
  id: 'pp-1',
  purchase_order: 'po-1',
  po_number: 'PO-1001',
  factory: 'f-1',
  factory_name: 'Apex Textiles',
  plan_date: '2026-09-01',
  start_date: '2026-09-05',
  end_date: null,
  quantity: 500,
  status: 'in_progress',
  remarks: '',
};

describe('ProductionPlansPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (productionApi.getPlans as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [], count: 0 },
    });
    (setupApi.getFactories as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [] },
    });
    (merchApi.getPOs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [] },
    });
  });

  it('renders rows through the Tabulator grid', async () => {
    (productionApi.getPlans as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [plan], count: 1 },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('PO-1001')).toBeInTheDocument();
    expect(screen.getByText('Apex Textiles')).toBeInTheDocument();
  });

  it('configures searchable grid columns with header filters and display labels', async () => {
    (productionApi.getPlans as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [plan], count: 1 },
    });
    renderPage();
    await screen.findByText('PO-1001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('po_number')?.title).toBe('PO #');
    expect(fieldOf('po_number')?.headerFilter).toBe(true);
    expect(fieldOf('factory_name')).toBeDefined();
    expect(fieldOf('plan_date')).toBeDefined();
    expect(fieldOf('quantity')).toBeDefined();
    expect(fieldOf('status')).toBeDefined();
    expect(screen.getByText('in progress')).toBeInTheDocument();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (productionApi.getPlans as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [plan], count: 1 },
    });
    renderPage();
    await screen.findByText('PO-1001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Production Plans');
  });

  it('provides row add/view/delete action callbacks', async () => {
    (productionApi.getPlans as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [plan], count: 1 },
    });
    renderPage();
    await screen.findByText('PO-1001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (productionApi.getPlans as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [plan], count: 25 },
    });
    renderPage();
    await screen.findByText('PO-1001');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});