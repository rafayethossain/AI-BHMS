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
    getSupplierPayments: vi.fn(),
    createSupplierPayment: vi.fn(),
    updateSupplierPayment: vi.fn(),
    deleteSupplierPayment: vi.fn(),
    releaseSupplierPayment: vi.fn(),
    getSupplierPaymentsDuePivot: vi.fn(),
  },
  setupApi: { getVendors: vi.fn() },
}));

vi.mock('../../components/SpreadsheetGrid', () => ({
  default: (props: Record<string, unknown>) => {
    gridCapture.lastProps = props;
    const { data } = props as { data: Record<string, unknown>[] };
    return (
      <div data-testid="spreadsheet-grid">
        {(data as Record<string, unknown>[]).map((row) => (
          <div key={String(row.id)} data-testid={`grid-row-${String(row.id)}`}>
            <span>{String(row.payment_ref)}</span>
            <span>{String(row.supplier_name)}</span>
            <span>{String(row.payment_status_label)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import SupplierPaymentsPage from '../SupplierPaymentsPage';
import { logisticsApi, setupApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/logistics/supplier-payments']}>
      <SupplierPaymentsPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('SupplierPaymentsPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (setupApi.getVendors as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (logisticsApi.getSupplierPaymentsDuePivot as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
  });

  const rec = {
    id: 'sp-1',
    supplier: 'v-1',
    supplier_name: 'Zenith Fabrics',
    purchase_order: 'po-1',
    po_number: 'PO-SP-100',
    lc: null,
    lc_number: null,
    payment_ref: 'SP-2026-001',
    invoice_no: 'SP-INV-100',
    fn_ref: 'FO-2026-0100',
    allocated_amount: '5000.00',
    amount: '5000.00',
    currency: 'USD',
    payment_method: 'TT',
    payment_date: '2026-07-15',
    due_date: '2099-08-15',
    released: false,
    released_at: null,
    payment_status: 'to_be_released',
    remarks: 'Fabric settlement.',
    created_at: '2026-07-10T00:00:00Z',
  };

  it('renders rows through the Tabulator grid', async () => {
    (logisticsApi.getSupplierPayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('SP-2026-001')).toBeInTheDocument();
  });

  it('configures the reference Supplier Payment columns with header filters', async () => {
    (logisticsApi.getSupplierPayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('SP-2026-001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('payment_ref')?.headerFilter).toBe(true);
    expect(fieldOf('supplier_name')?.title).toBe('Supplier');
    expect(fieldOf('po_number')).toBeDefined();
    expect(fieldOf('invoice_no')).toBeDefined();
    expect(fieldOf('fn_ref')).toBeDefined();
    expect(fieldOf('allocated_amount')).toBeDefined();
    expect(fieldOf('amount')).toBeDefined();
    expect(fieldOf('payment_method')).toBeDefined();
    expect(fieldOf('due_date')).toBeDefined();
    expect(fieldOf('payment_date')).toBeDefined();
    expect(fieldOf('payment_status_label')).toBeDefined();
  });

  it('derives supplier/PO/status values from the payload', async () => {
    (logisticsApi.getSupplierPayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('SP-2026-001');
    const data = gridCapture.lastProps?.data as Record<string, unknown>[] | undefined;
    expect(data).toBeDefined();
    expect(data?.[0]?.supplier_name).toBe('Zenith Fabrics');
    expect(data?.[0]?.po_number).toBe('PO-SP-100');
    expect(data?.[0]?.payment_status_label).toBe('To Be Released');
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (logisticsApi.getSupplierPayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('SP-2026-001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Supplier Payments');
  });

  it('provides row add/edit/delete action callbacks', async () => {
    (logisticsApi.getSupplierPayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('SP-2026-001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (logisticsApi.getSupplierPayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 25, results: [rec] },
    });
    renderPage();
    await screen.findByText('SP-2026-001');
    expect(gridCapture.lastProps?.paginationSize).toBe(10);
  });
});