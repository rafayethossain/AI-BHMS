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
  commercialApi: {
    getSCs: vi.fn(),
    createSC: vi.fn(),
    updateSC: vi.fn(),
    deleteSC: vi.fn(),
    exportSC_pdf: vi.fn(),
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
            <span>{String(row.contract_number)}</span>
            <span>{String(row.po_number)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import SalesContractsPage from '../SalesContractsPage';
import { commercialApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/scs']}>
      <SalesContractsPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('SalesContractsPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (commercialApi.getSCs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [], count: 0 },
    });
  });

  const sc = {
    id: 'sc-1',
    contract_number: 'SC-2026-1000',
    po_number: 'PO-1001',
    purchase_order: 'po-1',
    buyer: 'buyer-1',
    buyer_name: 'Buyer One',
    total_amount: '12500.00',
    currency: 'USD',
    status: 'draft',
    contract_date: '2026-08-01',
    delivery_terms: '',
    remarks: '',
  };

  it('renders rows through the Tabulator grid', async () => {
    (commercialApi.getSCs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [sc], count: 1 },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('SC-2026-1000')).toBeInTheDocument();
    expect(await screen.findByText('PO-1001')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (commercialApi.getSCs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [sc], count: 1 },
    });
    renderPage();
    await screen.findByText('SC-2026-1000');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('contract_number')?.title).toBe('Contract #');
    expect(fieldOf('contract_number')?.headerFilter).toBe(true);
    expect(fieldOf('po_number')?.headerFilter).toBe(true);
    expect(fieldOf('buyer_name')).toBeDefined();
    expect(fieldOf('total_amount')).toBeDefined();
    expect(fieldOf('currency')).toBeDefined();
    expect(fieldOf('status')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (commercialApi.getSCs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [sc], count: 1 },
    });
    renderPage();
    await screen.findByText('SC-2026-1000');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Sales Contracts');
  });

  it('provides row add/edit/delete action callbacks', async () => {
    (commercialApi.getSCs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [sc], count: 1 },
    });
    renderPage();
    await screen.findByText('SC-2026-1000');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (commercialApi.getSCs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [sc], count: 25 },
    });
    renderPage();
    await screen.findByText('SC-2026-1000');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});