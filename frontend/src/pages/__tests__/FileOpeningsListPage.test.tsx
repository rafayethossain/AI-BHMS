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

vi.mock('../../components/EntityCard', () => ({
  CardListToggle: () => <div data-testid="card-list-toggle" />,
  default: () => <div />,
}));

vi.mock('../../api/client', () => ({
  merchApi: {
    getFileOpenings: vi.fn(),
    getStyles: vi.fn(),
  },
  setupApi: {
    getBuyers: vi.fn(),
    getFactories: vi.fn(),
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
            <span>{String(row.file_number)}</span>
            <span>{String(row.style_number)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import FileOpeningsListPage from '../FileOpeningsListPage';
import { merchApi, setupApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/file-openings']}>
      <FileOpeningsListPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('FileOpeningsListPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (merchApi.getStyles as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (setupApi.getBuyers as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (setupApi.getFactories as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
  });

  const fo = {
    id: 'fo-1',
    file_number: 'F-2026-0001',
    style: 'style-1',
    style_number: '67741T',
    style_version: 'sv-1',
    buyer: 'buyer-1',
    buyer_name: 'Buyer One',
    brand: null,
    factory: 'factory-1',
    factory_name: 'Factory One',
    file_date: '2026-08-01',
    status: 'open',
    remarks: '',
    purchase_orders_count: 3,
    created_at: '2026-08-01T00:00:00Z',
    is_quick_lead: true,
    is_repeat: false,
    is_stock_fabric: false,
  };

  it('renders rows through the Tabulator grid', async () => {
    (merchApi.getFileOpenings as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [fo] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('F-2026-0001')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (merchApi.getFileOpenings as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [fo] },
    });
    renderPage();
    await screen.findByText('F-2026-0001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('file_number')?.title).toBe('File #');
    expect(fieldOf('file_number')?.headerFilter).toBe(true);
    expect(fieldOf('style_number')?.headerFilter).toBe(true);
    expect(fieldOf('buyer_name')).toBeDefined();
    expect(fieldOf('factory_name')).toBeDefined();
    expect(fieldOf('status')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (merchApi.getFileOpenings as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [fo] },
    });
    renderPage();
    await screen.findByText('F-2026-0001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('File Openings');
  });

  it('provides row add/view/delete action callbacks', async () => {
    (merchApi.getFileOpenings as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [fo] },
    });
    renderPage();
    await screen.findByText('F-2026-0001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (merchApi.getFileOpenings as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 25, results: [fo] },
    });
    renderPage();
    await screen.findByText('F-2026-0001');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});