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
    getImportRecaps: vi.fn(),
    createImportRecap: vi.fn(),
    updateImportRecap: vi.fn(),
    deleteImportRecap: vi.fn(),
  },
  setupApi: { getVendors: vi.fn(), getFactories: vi.fn() },
}));

vi.mock('../../components/SpreadsheetGrid', () => ({
  default: (props: Record<string, unknown>) => {
    gridCapture.lastProps = props;
    const { data } = props as { data: Record<string, unknown>[] };
    return (
      <div data-testid="spreadsheet-grid">
        {(data as Record<string, unknown>[]).map((row) => (
          <div key={String(row.id)} data-testid={`grid-row-${String(row.id)}`}>
            <span>{String(row.s_c_number)}</span>
            <span>{String(row.supplier_name)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import ImportRecapsPage from '../ImportRecapsPage';
import { logisticsApi, setupApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/logistics/import-recaps']}>
      <ImportRecapsPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('ImportRecapsPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (setupApi.getVendors as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (setupApi.getFactories as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
  });

  const rec = {
    id: 'imp-1',
    s_c_number: 'SC-2026-888',
    supplier: 'sup-1',
    supplier_name: 'Smart Spinning Mills Ltd',
    factory: 'fac-1',
    factory_name: 'Apex Knitwears',
    invoice_value: '12500.00',
    item_category: 'fabric',
    item_category_label: 'Fabric',
    quantity: '45',
    rolls_bales: 180,
    container: 'TCLU1234567',
    bl_hawb: 'OOLU2312345678',
    mode: 'sea',
    mode_label: 'Sea',
    lc_foc: 'lc',
    lc_foc_label: 'LC',
    vessel: 'CMA CGM FRANKLIN',
    pcd_date: '2026-08-01',
    etd_date: '2026-08-10',
    eta_date: '2026-09-12',
    atb_date: '2026-09-14',
    unstuffed_date: '2026-09-16',
    in_house_date: '2026-09-18',
    agent: 'Progressive Clearing Agent',
    docs_received: true,
    status: 'in_transit',
    status_label: 'In Transit',
    remarks: 'Priority inbound.',
    created_at: '2026-08-01T00:00:00Z',
  };

  it('renders rows through the Tabulator grid', async () => {
    (logisticsApi.getImportRecaps as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('SC-2026-888')).toBeInTheDocument();
  });

  it('configures the reference Import Recap columns with header filters', async () => {
    (logisticsApi.getImportRecaps as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('SC-2026-888');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('supplier_name')?.title).toBe('Supplier');
    expect(fieldOf('supplier_name')?.headerFilter).toBe(true);
    expect(fieldOf('s_c_number')?.headerFilter).toBe(true);
    expect(fieldOf('item_category_label')).toBeDefined();
    expect(fieldOf('mode_label')).toBeDefined();
    expect(fieldOf('vessel')).toBeDefined();
    expect(fieldOf('eta_date')).toBeDefined();
    expect(fieldOf('atb_date')).toBeDefined();
    expect(fieldOf('in_house_date')).toBeDefined();
    expect(fieldOf('status_label')?.headerFilter).toBe(true);
  });

  it('derives import row values from the payload', async () => {
    (logisticsApi.getImportRecaps as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('SC-2026-888');
    const data = gridCapture.lastProps?.data as Record<string, unknown>[] | undefined;
    expect(data).toBeDefined();
    expect(data?.[0]?.supplier_name).toBe('Smart Spinning Mills Ltd');
    expect(data?.[0]?.mode_label).toBe('Sea');
    expect(data?.[0]?.lc_foc_label).toBe('LC');
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (logisticsApi.getImportRecaps as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('SC-2026-888');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Import Recaps');
  });

  it('provides row add/edit/delete action callbacks', async () => {
    (logisticsApi.getImportRecaps as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('SC-2026-888');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (logisticsApi.getImportRecaps as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 25, results: [rec] },
    });
    renderPage();
    await screen.findByText('SC-2026-888');
    expect(gridCapture.lastProps?.paginationSize).toBe(10);
  });
});