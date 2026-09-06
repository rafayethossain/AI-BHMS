import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../../api/client', () => ({
  commercialApi: {
    getDebitNotes: vi.fn(),
    getDebitNotesDashboard: vi.fn(),
    getPendingOverTolerance: vi.fn(),
  },
}));

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
            <span>{String(row.debit_number)}</span>
            <span>{String(row.buyer_name)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import DebitNotesPage from '../DebitNotesPage';
import { commercialApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/debit-notes']}>
      <DebitNotesPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('DebitNotesPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (commercialApi.getDebitNotesDashboard as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { total: 1, total_value: '0', by_status: {}, compliance_emails_sent: 0, pending_value: '0' },
    });
    (commercialApi.getPendingOverTolerance as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
  });

  const dn = {
    id: 'dn-1',
    debit_number: 'DN-1001',
    po_number: 'PO-1',
    buyer_name: 'Acme Retail',
    debit_type_display: 'Other',
    amount: '500.00',
    currency_code: 'USD',
    status: 'pro_forma',
    raised_at: '2026-08-01T00:00:00Z',
  };

  it('renders rows through the Tabulator grid', async () => {
    (commercialApi.getDebitNotes as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [dn] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('DN-1001')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (commercialApi.getDebitNotes as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [dn] },
    });
    renderPage();
    await screen.findByText('DN-1001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('debit_number')?.title).toBe('Debit #');
    expect(fieldOf('debit_number')?.headerFilter).toBe(true);
    expect(fieldOf('buyer_name')?.headerFilter).toBe(true);
    expect(fieldOf('status')?.headerFilter).toBe(true);
    expect(fieldOf('amount')).toBeDefined();
    expect(fieldOf('raised_at')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (commercialApi.getDebitNotes as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [dn] },
    });
    renderPage();
    await screen.findByText('DN-1001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Debit Notes');
  });

  it('provides a row edit action callback', async () => {
    (commercialApi.getDebitNotes as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [dn] },
    });
    renderPage();
    await screen.findByText('DN-1001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (commercialApi.getDebitNotes as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 25, results: [dn] },
    });
    renderPage();
    await screen.findByText('DN-1001');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});
