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

vi.mock('../../components/SearchableSelect', () => ({
  default: () => <div data-testid="searchable-select" />,
}));

vi.mock('../../api/client', () => ({
  logisticsApi: {
    getCostReconciliations: vi.fn(),
    createCostReconciliation: vi.fn(),
    updateCostReconciliation: vi.fn(),
    deleteCostReconciliation: vi.fn(),
    compareCostReconciliation: vi.fn(),
    resolveCostReconciliation: vi.fn(),
  },
  merchApi: { getPurchaseOrders: vi.fn() },
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
            <span>{String(row.saving_loss_per_unit)}</span>
            <span>{String(row.mismatch_label)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import CostReconcilePage from '../CostReconcilePage';
import { logisticsApi, merchApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/logistics/cost-reconciliations']}>
      <CostReconcilePage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('CostReconcilePage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (merchApi.getPurchaseOrders as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
  });

  const rec = {
    id: 'cr-1',
    purchase_order: 'po-1',
    po_number: 'PO-CR-100',
    export_recap: null,
    costing: null,
    factory_inv_amount: '2000.00',
    factory_inv_qty: '1000',
    planning_cm_amount: '1800.00',
    planning_cm_qty: '1000',
    factory_inv_per_unit: '2.0000',
    planning_cm_per_unit: '1.8000',
    saving_loss_per_unit: '0.2000',
    saving_loss_total: '200.00',
    is_mismatch: true,
    status: 'pending',
    status_label: 'Pending',
    notes: 'Compare Factory Inv vs Planning CM.',
    reconciled_by_name: null,
    created_at: '2026-07-10T00:00:00Z',
  };

  it('renders rows through the Tabulator grid', async () => {
    (logisticsApi.getCostReconciliations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('PO-CR-100')).toBeInTheDocument();
  });

  it('configures the reference Cost Reconcile columns with header filters', async () => {
    (logisticsApi.getCostReconciliations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('PO-CR-100');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('po_number')?.headerFilter).toBe(true);
    expect(fieldOf('factory_inv_amount')).toBeDefined();
    expect(fieldOf('planning_cm_amount')).toBeDefined();
    expect(fieldOf('factory_inv_per_unit')).toBeDefined();
    expect(fieldOf('planning_cm_per_unit')).toBeDefined();
    expect(fieldOf('saving_loss_per_unit')).toBeDefined();
    expect(fieldOf('saving_loss_total')).toBeDefined();
    expect(fieldOf('mismatch_label')).toBeDefined();
    expect(fieldOf('status_label')).toBeDefined();
  });

  it('derives display values from the payload', async () => {
    (logisticsApi.getCostReconciliations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('PO-CR-100');
    const data = gridCapture.lastProps?.data as Record<string, unknown>[] | undefined;
    expect(data).toBeDefined();
    expect(data?.[0]?.po_number).toBe('PO-CR-100');
    expect(data?.[0]?.saving_loss_per_unit).toBe('0.2000');
    expect(data?.[0]?.mismatch_label).toBe('Mismatch');
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (logisticsApi.getCostReconciliations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('PO-CR-100');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Cost Reconciliations');
  });

  it('provides row add/edit/delete action callbacks', async () => {
    (logisticsApi.getCostReconciliations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('PO-CR-100');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (logisticsApi.getCostReconciliations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 25, results: [rec] },
    });
    renderPage();
    await screen.findByText('PO-CR-100');
    expect(gridCapture.lastProps?.paginationSize).toBe(10);
  });
});