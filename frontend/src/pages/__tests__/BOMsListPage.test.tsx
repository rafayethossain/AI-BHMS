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
  merchApi: {
    getBOMs: vi.fn(),
    getAllStyleVersions: vi.fn(),
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
            <span>{String(row.style_number)}</span>
            <span>{String(row.name)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import BOMsListPage from '../BOMsListPage';
import { merchApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/boms']}>
      <BOMsListPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('BOMsListPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (merchApi.getAllStyleVersions as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [] },
    });
  });

  const bom = {
    id: 'bom-1',
    style_version: 'sv-1',
    style_number: '67741T',
    style_id: 'style-1',
    name: 'Lizzie Wide Leg Pant',
    version: 2,
    status: 'active',
    items: [],
    total_cost: 1250.5,
    created_at: '2026-08-01T00:00:00Z',
  };

  it('renders rows through the Tabulator grid', async () => {
    (merchApi.getBOMs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [bom] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('67741T')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (merchApi.getBOMs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [bom] },
    });
    renderPage();
    await screen.findByText('67741T');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('style_number')?.title).toBe('Style');
    expect(fieldOf('style_number')?.headerFilter).toBe(true);
    expect(fieldOf('name')?.headerFilter).toBe(true);
    expect(fieldOf('version')).toBeDefined();
    expect(fieldOf('status')).toBeDefined();
    expect(fieldOf('total_cost')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (merchApi.getBOMs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [bom] },
    });
    renderPage();
    await screen.findByText('67741T');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Bill of Materials');
  });

  it('provides row add/view/delete action callbacks', async () => {
    (merchApi.getBOMs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [bom] },
    });
    renderPage();
    await screen.findByText('67741T');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (merchApi.getBOMs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 25, results: [bom] },
    });
    renderPage();
    await screen.findByText('67741T');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});