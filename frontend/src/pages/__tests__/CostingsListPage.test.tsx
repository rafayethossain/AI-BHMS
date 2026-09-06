import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const navigateMock = vi.fn();

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../../api/client', () => ({
  merchApi: { getCostings: vi.fn() },
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const gridCapture = vi.hoisted(() => ({
  lastProps: null as Record<string, unknown> | null,
  reset() {
    this.lastProps = null;
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
            <span>{String(row.po_number)}</span>
            <span>{String(row.total_cost)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import CostingsListPage from '../CostingsListPage';
import { merchApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/costings']}>
      <CostingsListPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('CostingsListPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
  });

  const costing = {
    id: 'c-1',
    po_number: 'PO-2001',
    sheet_type: 'sl',
    sheet_type_label: 'Self',
    fabric_cost: '10.00',
    trim_cost: '2.00',
    cm_cost: '3.00',
    overhead_cost: '1.00',
    total_cost: '16.00',
    status: 'approved',
    is_single_size: false,
    is_patterned: false,
    confirmed: true,
  };

  it('renders rows through the Tabulator grid', async () => {
    (merchApi.getCostings as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [costing] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('PO-2001')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (merchApi.getCostings as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [costing] },
    });
    renderPage();
    await screen.findByText('PO-2001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('po_number')?.title).toBe('PO #');
    expect(fieldOf('po_number')?.headerFilter).toBe(true);
    expect(fieldOf('sheet_type')?.headerFilter).toBe(true);
    expect(fieldOf('status')?.headerFilter).toBe(true);
    expect(fieldOf('total_cost')).toBeDefined();
    expect(fieldOf('fabric_cost')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (merchApi.getCostings as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [costing] },
    });
    renderPage();
    await screen.findByText('PO-2001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Costings');
  });

  it('provides a row view action callback', async () => {
    (merchApi.getCostings as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [costing] },
    });
    renderPage();
    await screen.findByText('PO-2001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onView).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (merchApi.getCostings as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 25, results: [costing] },
    });
    renderPage();
    await screen.findByText('PO-2001');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});
