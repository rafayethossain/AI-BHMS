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
    getInvoiceApprovals: vi.fn(),
    getInvoiceApprovalsDashboard: vi.fn(),
    createInvoiceApproval: vi.fn(),
    updateInvoiceApproval: vi.fn(),
    deleteInvoiceApproval: vi.fn(),
    approveInvoice: vi.fn(),
    rejectInvoice: vi.fn(),
    raiseDebitForInvoice: vi.fn(),
    exportInvoiceApprovals: vi.fn(),
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
            <span>{String(row.invoice_number)}</span>
            <span>{String(row.po_number)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import InvoiceApprovalsPage from '../InvoiceApprovalsPage';
import { commercialApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/commercial/invoice-approvals']}>
      <InvoiceApprovalsPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('InvoiceApprovalsPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (commercialApi.getInvoiceApprovals as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [], count: 0 },
    });
    (commercialApi.getInvoiceApprovalsDashboard as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
  });

  const inv = {
    id: 'inv-1',
    invoice_number: 'INV-2026-0001',
    po_number: 'PO-1001',
    buyer: 'buyer-1',
    buyer_name: 'Buyer One',
    invoice_type: 'fabric',
    invoice_type_display: 'Fabric',
    amount: '12500.00',
    currency_code: 'USD',
    match_status: 'match',
    status: 'pending',
    invoice_date: '2026-08-01',
    purchase_order: 'po-1',
    quantity: '500',
    unit_price: '25.00',
    currency: 'cur-1',
    notes: '',
    over_tolerance: false,
    debit_note: null,
    debit_number: null,
  };

  it('renders rows through the Tabulator grid', async () => {
    (commercialApi.getInvoiceApprovals as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [inv], count: 1 },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('INV-2026-0001')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (commercialApi.getInvoiceApprovals as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [inv], count: 1 },
    });
    renderPage();
    await screen.findByText('INV-2026-0001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('invoice_number')?.title).toBe('Invoice #');
    expect(fieldOf('invoice_number')?.headerFilter).toBe(true);
    expect(fieldOf('po_number')?.headerFilter).toBe(true);
    expect(fieldOf('buyer_name')).toBeDefined();
    expect(fieldOf('amount')).toBeDefined();
    expect(fieldOf('match_status')).toBeDefined();
    expect(fieldOf('status')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (commercialApi.getInvoiceApprovals as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [inv], count: 1 },
    });
    renderPage();
    await screen.findByText('INV-2026-0001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Invoice Approvals');
  });

  it('provides row add/edit/delete action callbacks', async () => {
    (commercialApi.getInvoiceApprovals as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [inv], count: 1 },
    });
    renderPage();
    await screen.findByText('INV-2026-0001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (commercialApi.getInvoiceApprovals as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [inv], count: 25 },
    });
    renderPage();
    await screen.findByText('INV-2026-0001');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});