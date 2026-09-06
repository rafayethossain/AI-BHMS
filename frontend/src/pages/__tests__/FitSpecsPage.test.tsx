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
    getFitSpecs: vi.fn(),
    getPOs: vi.fn(),
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
            <span>{String(row.fit_stage_label)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import FitSpecsPage from '../FitSpecsPage';
import { merchApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/fit-specs']}>
      <FitSpecsPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('FitSpecsPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (merchApi.getPOs as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
  });

  const fs = {
    id: 'fs-1',
    po_number: 'PO-1001',
    fit_stage_label: '1st Fit · v1',
    is_current: true,
    notes: 'Chest 52',
    created_at: '2026-08-01T00:00:00Z',
  };

  it('renders rows through the Tabulator grid', async () => {
    (merchApi.getFitSpecs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [fs] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('PO-1001')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (merchApi.getFitSpecs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [fs] },
    });
    renderPage();
    await screen.findByText('PO-1001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('po_number')?.title).toBe('PO #');
    expect(fieldOf('po_number')?.headerFilter).toBe(true);
    expect(fieldOf('fit_stage_label')?.headerFilter).toBe(true);
    expect(fieldOf('is_current')).toBeDefined();
    expect(fieldOf('notes')).toBeDefined();
    expect(fieldOf('created_at')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (merchApi.getFitSpecs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [fs] },
    });
    renderPage();
    await screen.findByText('PO-1001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Fit Specs');
  });

  it('provides a row edit action callback', async () => {
    (merchApi.getFitSpecs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [fs] },
    });
    renderPage();
    await screen.findByText('PO-1001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (merchApi.getFitSpecs as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 10, results: [fs] },
    });
    renderPage();
    await screen.findByText('PO-1001');
    expect(gridCapture.lastProps?.paginationSize).toBe(10);
  });
});
