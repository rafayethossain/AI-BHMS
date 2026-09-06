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
  merchApi: {
    getPOs: vi.fn(),
    getFileOpenings: vi.fn(),
    createPO: vi.fn(),
    deletePO: vi.fn(),
    importPOs: vi.fn(),
  },
  setupApi: { getFactories: vi.fn(), getCurrencies: vi.fn(), getCountries: vi.fn() },
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

vi.mock('../../components/SearchableSelect', () => ({
  default: () => <div data-testid="searchable-select" />,
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
            <span>{String(row.buyer_name)}</span>
            <span>{String(row.factory_name)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import PurchaseOrdersListPage from '../PurchaseOrdersListPage';
import { merchApi, setupApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/purchase-orders']}>
      <PurchaseOrdersListPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('PurchaseOrdersListPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (setupApi.getFactories as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (setupApi.getCurrencies as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (setupApi.getCountries as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (merchApi.getFileOpenings as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
  });

  const po = {
    id: 'po-1',
    po_number: 'PO-1001',
    file_number: 'FO-2026',
    style_number: 'STY-7788',
    buyer_name: 'Zara',
    factory_name: 'Apex Textile',
    destination_country_name: 'Germany',
    risk_level_detail: { code: 'A', color: '#22c55e' },
    risk: {
      fabric: { code: 'red', label: 'Red', color: '#dc2626', numeric: 4 },
      trims: { code: 'none', label: 'None', color: '#6b7280', numeric: 0 },
      labels: { code: 'amber', label: 'Amber', color: '#d97706', numeric: 2 },
      technical: { code: 'green', label: 'Green', color: '#16a34a', numeric: 1 },
      overall: { code: 'red', label: 'Red', color: '#dc2626', numeric: 4 },
    },
    delivery_date: '2026-10-15',
    actual_completion_date: '2026-10-20',
    quantity: 500,
    total_value: '6250.00',
    status: 'confirmed',
  };

  it('renders rows through the Tabulator grid', async () => {
    (merchApi.getPOs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [po] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('PO-1001')).toBeInTheDocument();
    expect(screen.getByText('Zara')).toBeInTheDocument();
  });

  it('configures searchable + status columns as grid header filters', async () => {
    (merchApi.getPOs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [po] },
    });
    renderPage();
    await screen.findByText('PO-1001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('po_number')?.title).toBe('PO #');
    expect(fieldOf('po_number')?.headerFilter).toBe(true);
    expect(fieldOf('buyer_name')?.headerFilter).toBe(true);
    expect(fieldOf('factory_name')?.headerFilter).toBe(true);
    expect(fieldOf('status')?.headerFilter).toBe(true);
    expect(fieldOf('risk_fabric')).toBeDefined();
    expect(fieldOf('risk_trims')).toBeDefined();
    expect(fieldOf('risk_labels')).toBeDefined();
    expect(fieldOf('risk_technical')).toBeDefined();
    expect(fieldOf('risk_overall')).toBeDefined();
    expect(fieldOf('quantity')).toBeDefined();
    expect(fieldOf('total_value')).toBeDefined();
  });

  it('renders reference Order List per-area risk columns (Fab/Trims/Labels/Tech/Overall)', async () => {
    (merchApi.getPOs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [po] },
    });
    renderPage();
    await screen.findByText('PO-1001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('risk_fabric')?.title).toBe('Fab');
    expect(fieldOf('risk_trims')?.title).toBe('Trims');
    expect(fieldOf('risk_labels')?.title).toBe('Labels');
    expect(fieldOf('risk_technical')?.title).toBe('Tech');
    expect(fieldOf('risk_overall')?.title).toBe('Overall');
  });

  it('exposes reference Order List columns (FN, Style, Origin, Actual completion)', async () => {
    (merchApi.getPOs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [po] },
    });
    renderPage();
    await screen.findByText('PO-1001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('file_number')?.title).toBe('FN');
    expect(fieldOf('file_number')?.headerFilter).toBe(true);
    expect(fieldOf('style_number')?.title).toBe('Style');
    expect(fieldOf('style_number')?.headerFilter).toBe(true);
    expect(fieldOf('destination_country_name')?.title).toBe('Origin');
    expect(fieldOf('destination_country_name')?.headerFilter).toBe(true);
    expect(fieldOf('actual_completion_date')).toBeDefined();
    expect(fieldOf('delivery_date')).toBeDefined();
  });

  it('derives grid row values for FN, Style, Origin and Actual completion', async () => {
    (merchApi.getPOs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [po] },
    });
    renderPage();
    await screen.findByText('PO-1001');
    const data = gridCapture.lastProps?.data as Record<string, unknown>[] | undefined;
    expect(data).toBeDefined();
    expect(data?.[0]?.file_number).toBe('FO-2026');
    expect(data?.[0]?.style_number).toBe('STY-7788');
    expect(data?.[0]?.destination_country_name).toBe('Germany');
    expect(data?.[0]?.actual_completion_date).toBe('2026-10-20');
  });

  it('derives per-area risk row values from the engine payload', async () => {
    (merchApi.getPOs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [po] },
    });
    renderPage();
    await screen.findByText('PO-1001');
    const data = gridCapture.lastProps?.data as Record<string, unknown>[] | undefined;
    expect(data).toBeDefined();
    expect(data?.[0]?.risk_fabric).toBe('Red');
    expect(data?.[0]?.risk_trims).toBe('—');
    expect(data?.[0]?.risk_labels).toBe('Amber');
    expect(data?.[0]?.risk_technical).toBe('Green');
    expect(data?.[0]?.risk_overall).toBe('Red');
  });

  it('falls back to em-dash when the risk payload is absent', async () => {
    const bare = { ...po, risk: undefined };
    (merchApi.getPOs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [bare] },
    });
    renderPage();
    await screen.findByText('PO-1001');
    const data = gridCapture.lastProps?.data as Record<string, unknown>[] | undefined;
    expect(data?.[0]?.risk_fabric).toBe('—');
    expect(data?.[0]?.risk_overall).toBe('—');
  });

  it('enables the Excel-like toolbar with add, export and column chooser', async () => {
    (merchApi.getPOs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [po] },
    });
    renderPage();
    await screen.findByText('PO-1001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Purchase Orders');
  });

  it('provides row action callbacks for view and delete', async () => {
    (merchApi.getPOs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [po] },
    });
    renderPage();
    await screen.findByText('PO-1001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onView).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination', async () => {
    (merchApi.getPOs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 25, results: [po] },
    });
    renderPage();
    await screen.findByText('PO-1001');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});
