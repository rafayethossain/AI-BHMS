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
    getPIs: vi.fn(),
    createPI: vi.fn(),
    updatePI: vi.fn(),
    deletePI: vi.fn(),
    sendPI: vi.fn(),
    acceptPI: vi.fn(),
    rejectPI: vi.fn(),
    exportPI_pdf: vi.fn(),
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
            <span>{String(row.pi_number)}</span>
            <span>{String(row.po_number)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import ProformaInvoicesPage from '../ProformaInvoicesPage';
import { commercialApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/commercial/proforma-invoices']}>
      <ProformaInvoicesPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('ProformaInvoicesPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (commercialApi.getPIs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [], count: 0 },
    });
  });

  const pi = {
    id: 'pi-1',
    pi_number: 'PI-2026-0001',
    po_number: 'PO-1001',
    po: 'po-1',
    buyer: 'buyer-1',
    buyer_name: 'Buyer One',
    amount: '12500.00',
    currency: 'USD',
    status: 'draft',
    issued_date: '2026-08-01',
    validity_date: '2026-09-01',
    remarks: '',
  };

  it('renders rows through the Tabulator grid', async () => {
    (commercialApi.getPIs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [pi], count: 1 },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('PI-2026-0001')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (commercialApi.getPIs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [pi], count: 1 },
    });
    renderPage();
    await screen.findByText('PI-2026-0001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('pi_number')?.title).toBe('PI #');
    expect(fieldOf('pi_number')?.headerFilter).toBe(true);
    expect(fieldOf('po_number')?.headerFilter).toBe(true);
    expect(fieldOf('buyer_name')).toBeDefined();
    expect(fieldOf('amount')).toBeDefined();
    expect(fieldOf('currency')).toBeDefined();
    expect(fieldOf('status')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (commercialApi.getPIs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [pi], count: 1 },
    });
    renderPage();
    await screen.findByText('PI-2026-0001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Proforma Invoices');
  });

  it('provides row add/edit/delete action callbacks', async () => {
    (commercialApi.getPIs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [pi], count: 1 },
    });
    renderPage();
    await screen.findByText('PI-2026-0001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (commercialApi.getPIs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [pi], count: 25 },
    });
    renderPage();
    await screen.findByText('PI-2026-0001');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});