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
    getJobQueue: vi.fn(),
    getJobRequests: vi.fn(),
    getJobDashboard: vi.fn(),
    getStyles: vi.fn(),
    getPOs: vi.fn(),
    getUnsoldAnalysis: vi.fn(),
  },
  usersApi: { getUsers: vi.fn() },
}));

vi.mock('../../components/SpreadsheetGrid', () => ({
  default: (props: Record<string, unknown>) => {
    gridCapture.lastProps = props;
    const { data } = props as { data: Record<string, unknown>[] };
    return (
      <div data-testid="spreadsheet-grid">
        {(data as Record<string, unknown>[]).map((row) => (
          <div key={String(row.id)} data-testid={`grid-row-${String(row.id)}`}>
            <span>{String(row.job_number)}</span>
            <span>{String(row.style_number)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import JobRequestsPage from '../JobRequestsPage';
import { merchApi, usersApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/jobs']}>
      <JobRequestsPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('JobRequestsPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (merchApi.getJobDashboard as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null });
    (merchApi.getStyles as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (merchApi.getPOs as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (usersApi.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
  });

  const job = {
    id: 'job-1',
    job_number: 'JR-1001',
    job_type_display: 'Pattern',
    style_number: 'ST-1',
    description: 'Make pattern',
    assigned_to_name: 'Jane',
    required_by_date: '2026-09-10',
    priority_display: 'High',
    status_display: 'In Progress',
  };

  it('renders rows through the Tabulator grid in the queue view', async () => {
    (merchApi.getJobQueue as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [job] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('JR-1001')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (merchApi.getJobQueue as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [job] },
    });
    renderPage();
    await screen.findByText('JR-1001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('job_number')?.title).toBe('Job #');
    expect(fieldOf('job_number')?.headerFilter).toBe(true);
    expect(fieldOf('style_number')?.headerFilter).toBe(true);
    expect(fieldOf('status_display')?.headerFilter).toBe(true);
    expect(fieldOf('assigned_to_name')).toBeDefined();
    expect(fieldOf('priority_display')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (merchApi.getJobQueue as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [job] },
    });
    renderPage();
    await screen.findByText('JR-1001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Job Requests');
  });

  it('provides a row edit action callback', async () => {
    (merchApi.getJobQueue as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [job] },
    });
    renderPage();
    await screen.findByText('JR-1001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (merchApi.getJobQueue as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 10, results: [job] },
    });
    renderPage();
    await screen.findByText('JR-1001');
    expect(gridCapture.lastProps?.paginationSize).toBe(10);
  });
});
