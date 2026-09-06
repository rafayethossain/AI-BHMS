import { render, screen, fireEvent } from '@testing-library/react';
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
  merchApi: { getDesignSheets: vi.fn() },
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
    const { data, onRowClick } = props as {
      data: Record<string, unknown>[];
      onRowClick?: (row: Record<string, unknown>) => void;
    };
    return (
      <div data-testid="spreadsheet-grid">
        {(data as Record<string, unknown>[]).map((row) => (
          <div
            key={String(row.id)}
            data-testid={`grid-row-${String(row.id)}`}
            onClick={() => onRowClick?.(row)}
          >
            <span>{String(row.file_number)}</span>
            <span>{String(row.style_code)}</span>
            <span>{String(row.buyer_name)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import DesignSheetsListPage from '../DesignSheetsListPage';
import { merchApi } from '../../api/client';
import type { DesignSheet } from '../../api/client';

const designSheet: DesignSheet = {
  id: 'ds-1',
  tech_pack: 'tp-1',
  status: 'new',
  style_code: '67741T',
  buyer_name: 'CMT Apparel',
  file_number: 'TP-1002',
  sketch_url: null,
  issue_date: null,
  block: '',
  based_on: '',
  customer: '',
  style_number: 'DS-STYLE-001',
  size: '',
  designer: '',
  pattern_cutter: '',
  issuer: '',
  cloth_code: '',
  length: '',
  sketch: '',
  description: '',
  note: '',
  sketch_annotations: [],
  layout_order: [],
  fit_specs: [],
  job_requests: [],
  created_at: '2026-08-27T10:00:00Z',
  updated_at: '2026-08-27T10:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/design-sheets']}>
      <DesignSheetsListPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('DesignSheetsListPage (Tabulator grid)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
  });

  it('shows a loading indicator while fetching', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [designSheet] },
    });
    renderPage();
    expect(screen.getByTestId('design-sheets-loading')).toBeInTheDocument();
    expect(await screen.findByTestId('spreadsheet-grid')).toBeInTheDocument();
  });

  it('renders the list through the Tabulator spreadsheet grid', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [designSheet] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(screen.getByText('TP-1002')).toBeInTheDocument();
    expect(screen.getByText('67741T')).toBeInTheDocument();
    expect(screen.getByText('CMT Apparel')).toBeInTheDocument();
  });

  it('configures grid columns with header filters for searchable fields', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [designSheet] },
    });
    renderPage();
    await screen.findByTestId('spreadsheet-grid');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('file_number')?.title).toBe('File #');
    expect(fieldOf('style_code')?.headerFilter).toBe(true);
    expect(fieldOf('buyer_name')?.headerFilter).toBe(true);
    expect(fieldOf('status')).toBeDefined();
    expect(fieldOf('updated_at')).toBeDefined();
  });

  it('passes the loaded rows as grid data', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [designSheet] },
    });
    renderPage();
    await screen.findByTestId('spreadsheet-grid');
    const data = gridCapture.lastProps?.data as Record<string, unknown>[];
    expect(data).toHaveLength(1);
    expect(data[0].file_number).toBe('TP-1002');
  });

  it('navigates to the detail page when a grid row is clicked', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [designSheet] },
    });
    renderPage();
    const row = await screen.findByTestId('grid-row-ds-1');
    fireEvent.click(row);
    expect(navigateMock).toHaveBeenCalledWith('/design-sheets/ds-1');
  });

  it('shows an empty state when no design sheets exist', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 0, results: [] },
    });
    renderPage();
    expect(await screen.findByText(/no design sheets/i)).toBeInTheDocument();
  });

  it('shows an error when the request fails', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
  });
});
