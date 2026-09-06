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
    getExportRecaps: vi.fn(),
    createExportRecap: vi.fn(),
    updateExportRecap: vi.fn(),
    deleteExportRecap: vi.fn(),
    getShipments: vi.fn(),
    getReconciliations: vi.fn(),
    getFreightForwarders: vi.fn(),
  },
  setupApi: { getFactories: vi.fn(), getVendors: vi.fn() },
}));

vi.mock('../../components/SpreadsheetGrid', () => ({
  default: (props: Record<string, unknown>) => {
    gridCapture.lastProps = props;
    const { data } = props as { data: Record<string, unknown>[] };
    return (
      <div data-testid="spreadsheet-grid">
        {(data as Record<string, unknown>[]).map((row) => (
          <div key={String(row.id)} data-testid={`grid-row-${String(row.id)}`}>
            <span>{String(row.fob_no)}</span>
            <span>{String(row.factory_name)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import ExportRecapsPage from '../ExportRecapsPage';
import { logisticsApi, setupApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/logistics/export-recaps']}>
      <ExportRecapsPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('ExportRecapsPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (setupApi.getFactories as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (setupApi.getVendors as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (logisticsApi.getFreightForwarders as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
  });

  const rec = {
    id: 'exp-1',
    fob_no: 'FOB-2026-101',
    s_c_number: 'SC-2026-777',
    factory: 'fac-1',
    factory_name: 'Apex Knitwears',
    forwarder: 'ff-1',
    forwarder_name: 'OceanSwift Logistics',
    quantity: '1000',
    fob_value: '85000.00',
    cmpt_value: '43000.00',
    cost_value: '38000.00',
    service_pct: '3.000',
    mode: 'sea',
    mode_label: 'Sea',
    container: 'TCLU5566778',
    hbl: 'OONL2026HBL884',
    bl_number: 'OOLU2026098765',
    courier: 'DHL Express',
    ex_factory_date: '2026-07-28',
    on_board_date: '2026-07-30',
    eta_date: '2026-08-25',
    factory_pay_terms: '60 days',
    factory_amount: '50000.00',
    factory_due_date: '2026-09-25',
    factory_paid_date: null,
    factory_payment_status: 'pending',
    factory_payment_status_label: 'Pending',
    customer_pay_terms: '30 days',
    customer_received_amount: '85000.00',
    customer_due_date: '2026-08-20',
    customer_payment_date: '2026-08-18',
    customer_payment_status: 'received',
    customer_payment_status_label: 'Received',
    remarks: 'Full FOB lot to London.',
    created_at: '2026-07-20T00:00:00Z',
  };

  it('renders rows through the Tabulator grid', async () => {
    (logisticsApi.getExportRecaps as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('FOB-2026-101')).toBeInTheDocument();
  });

  it('configures the reference Export Recap columns with header filters', async () => {
    (logisticsApi.getExportRecaps as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('FOB-2026-101');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('fob_no')?.headerFilter).toBe(true);
    expect(fieldOf('factory_name')?.title).toBe('Factory');
    expect(fieldOf('forwarder_name')).toBeDefined();
    expect(fieldOf('fob_value')).toBeDefined();
    expect(fieldOf('cmpt_value')).toBeDefined();
    expect(fieldOf('cost_value')).toBeDefined();
    expect(fieldOf('service_pct')).toBeDefined();
    expect(fieldOf('hbl')).toBeDefined();
    expect(fieldOf('on_board_date')).toBeDefined();
    expect(fieldOf('eta_date')).toBeDefined();
    expect(fieldOf('container')).toBeDefined();
    expect(fieldOf('bl_number')).toBeDefined();
    expect(fieldOf('factory_payment_status_label')).toBeDefined();
    expect(fieldOf('customer_payment_status_label')).toBeDefined();
  });

  it('derives landed-economics row values from the payload', async () => {
    (logisticsApi.getExportRecaps as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('FOB-2026-101');
    const data = gridCapture.lastProps?.data as Record<string, unknown>[] | undefined;
    expect(data).toBeDefined();
    expect(data?.[0]?.factory_name).toBe('Apex Knitwears');
    expect(data?.[0]?.forwarder_name).toBe('OceanSwift Logistics');
    expect(data?.[0]?.factory_payment_status_label).toBe('Pending');
    expect(data?.[0]?.customer_payment_status_label).toBe('Received');
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (logisticsApi.getExportRecaps as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('FOB-2026-101');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Export Recaps');
  });

  it('provides row add/edit/delete action callbacks', async () => {
    (logisticsApi.getExportRecaps as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('FOB-2026-101');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (logisticsApi.getExportRecaps as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 25, results: [rec] },
    });
    renderPage();
    await screen.findByText('FOB-2026-101');
    expect(gridCapture.lastProps?.paginationSize).toBe(10);
  });
});