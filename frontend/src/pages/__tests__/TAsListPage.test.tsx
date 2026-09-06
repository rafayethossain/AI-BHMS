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
  merchApi: { getTAs: vi.fn() },
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
            <span>{String(row.status)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import TAsListPage from '../TAsListPage';
import { merchApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tas']}>
      <TAsListPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('TAsListPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
  });

  const ta = {
    id: 'ta-1',
    po_number: 'PO-3001',
    delivery_date: '2026-10-15',
    status: 'active',
    milestones: [
      { status: 'completed' },
      { status: 'pending' },
    ],
  };

  it('renders rows through the Tabulator grid', async () => {
    (merchApi.getTAs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [ta] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('PO-3001')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (merchApi.getTAs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [ta] },
    });
    renderPage();
    await screen.findByText('PO-3001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('po_number')?.title).toBe('PO #');
    expect(fieldOf('po_number')?.headerFilter).toBe(true);
    expect(fieldOf('delivery_date')?.headerFilter).toBe(true);
    expect(fieldOf('status')?.headerFilter).toBe(true);
    expect(fieldOf('status')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (merchApi.getTAs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [ta] },
    });
    renderPage();
    await screen.findByText('PO-3001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Time & Action');
  });

  it('provides a row view action callback', async () => {
    (merchApi.getTAs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [ta] },
    });
    renderPage();
    await screen.findByText('PO-3001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onView).toBe('function');
  });

  it('informs the grid of client-side pagination size and row click', async () => {
    (merchApi.getTAs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 25, results: [ta] },
    });
    renderPage();
    await screen.findByText('PO-3001');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
    expect(typeof gridCapture.lastProps?.onRowClick).toBe('function');
  });
});
