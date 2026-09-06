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
    getStyles: vi.fn(),
    createStyle: vi.fn(),
    deleteStyle: vi.fn(),
  },
  setupApi: { getBuyers: vi.fn() },
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
            <span>{String(row.style_number)}</span>
            <span>{String(row.name)}</span>
            <span>{String(row.buyer_name)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import StylesListPage from '../StylesListPage';
import { merchApi, setupApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/styles']}>
      <StylesListPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = {
  title: string;
  field: string;
  headerFilter?: boolean;
  frozen?: boolean;
};

describe('StylesListPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (setupApi.getBuyers as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
  });

  const style = {
    id: 's-1',
    style_number: 'ST-001',
    name: 'Denim Jacket',
    buyer_name: 'Zara',
    status: 'active',
    file_openings_count: 2,
    purchase_orders_count: 3,
    main_image: null,
    sketch_front: null,
  };

  it('renders rows through the Tabulator grid', async () => {
    (merchApi.getStyles as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [style] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('ST-001')).toBeInTheDocument();
    expect(screen.getByText('Denim Jacket')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (merchApi.getStyles as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [style] },
    });
    renderPage();
    await screen.findByText('ST-001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('style_number')?.title).toBe('Style #');
    expect(fieldOf('style_number')?.headerFilter).toBe(true);
    expect(fieldOf('name')?.headerFilter).toBe(true);
    expect(fieldOf('buyer_name')?.headerFilter).toBe(true);
    expect(fieldOf('status')).toBeDefined();
    expect(fieldOf('purchase_orders_count')).toBeDefined();
  });

  it('enables the Excel-like toolbar with add, export and column chooser', async () => {
    (merchApi.getStyles as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [style] },
    });
    renderPage();
    await screen.findByText('ST-001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Styles');
  });

  it('provides row action callbacks for view, edit and delete', async () => {
    (merchApi.getStyles as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [style] },
    });
    renderPage();
    await screen.findByText('ST-001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onView).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of the active filters and pagination state', async () => {
    (merchApi.getStyles as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 25, results: [style] },
    });
    renderPage();
    await screen.findByText('ST-001');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});
