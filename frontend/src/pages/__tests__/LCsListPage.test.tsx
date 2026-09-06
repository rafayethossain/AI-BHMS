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
  commercialApi: { getLCs: vi.fn(), getLCDashboard: vi.fn(), getBanks: vi.fn() },
  setupApi: { getBuyers: vi.fn(), getCurrencies: vi.fn() },
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
            <span>{String(row.lc_number)}</span>
            <span>{String(row.buyer_name)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import LCsListPage from '../LCsListPage';
import { commercialApi, setupApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/lcs']}>
      <LCsListPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('LCsListPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (commercialApi.getLCDashboard as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null });
    (commercialApi.getBanks as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (setupApi.getBuyers as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (setupApi.getCurrencies as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
  });

  const lc = {
    id: 'lc-1',
    lc_number: 'LC-1001',
    lc_type: 'master',
    buyer_name: 'Acme Retail',
    amount: '50000.00',
    currency_code: 'USD',
    expiry_date: '2026-12-31',
    status: 'accepted',
  };

  it('renders rows through the Tabulator grid', async () => {
    (commercialApi.getLCs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [lc] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('LC-1001')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (commercialApi.getLCs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [lc] },
    });
    renderPage();
    await screen.findByText('LC-1001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('lc_number')?.title).toBe('LC #');
    expect(fieldOf('lc_number')?.headerFilter).toBe(true);
    expect(fieldOf('buyer_name')?.headerFilter).toBe(true);
    expect(fieldOf('status')?.headerFilter).toBe(true);
    expect(fieldOf('amount')).toBeDefined();
    expect(fieldOf('expiry_date')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (commercialApi.getLCs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [lc] },
    });
    renderPage();
    await screen.findByText('LC-1001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Letters of Credit');
  });

  it('provides a row view action callback', async () => {
    (commercialApi.getLCs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [lc] },
    });
    renderPage();
    await screen.findByText('LC-1001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onView).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (commercialApi.getLCs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 25, results: [lc] },
    });
    renderPage();
    await screen.findByText('LC-1001');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});
