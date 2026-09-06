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

vi.mock('../../api/client', () => ({
  logisticsApi: {
    getBookingSchedule: vi.fn(),
    getBookingScheduleItem: vi.fn(),
    createBookingScheduleItem: vi.fn(),
    updateBookingScheduleItem: vi.fn(),
    deleteBookingScheduleItem: vi.fn(),
    transitionBookingScheduleItem: vi.fn(),
    getShipments: vi.fn().mockResolvedValue({ data: { results: [] } }),
  },
  setupApi: {
    getRiskLevels: vi.fn().mockResolvedValue({ data: { results: [] } }),
  },
}));

vi.mock('../../components/SearchableSelect', () => ({
  default: ({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} data-testid="searchable-select">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
}));

vi.mock('../../components/SpreadsheetGrid', () => ({
  default: (props: Record<string, unknown>) => {
    gridCapture.lastProps = props;
    const { data } = props as { data: Record<string, unknown>[] };
    return (
      <div data-testid="spreadsheet-grid">
        {(data as Record<string, unknown>[]).map((row) => (
          <div key={String(row.id)} data-testid={`grid-row-${String(row.id)}`}>
            <span>{String(row.shipment_number)}</span>
            <span>{String(row.status)}</span>
            {row.is_last_hit === true && <span data-testid={`last-hit-${String(row.id)}`} className="cyan-last-hit">Last Hit</span>}
          </div>
        ))}
      </div>
    );
  },
}));

import BookingSchedulePage from '../BookingSchedulePage';
import { logisticsApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/logistics/booking-schedule']}>
      <BookingSchedulePage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; editor?: unknown; headerFilter?: boolean };

describe('BookingSchedulePage (B8 grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (logisticsApi.getBookingSchedule as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [], count: 0 },
    });
  });

  const item = {
    id: 'bs-1',
    shipment: 'ship-1',
    shipment_number: 'SH-1001',
    po_number: 'PO-1001',
    hit: 'hit-1',
    hit_number: 'HIT-2',
    hit_colour: 'Black',
    status: 'in_work',
    status_label: 'In Work',
    cut_qty: '800.00',
    garments_ready_qty: '500.00',
    ex_factory_date: '2026-05-08',
    ex_factory_notes: 'Confirmed',
    risk_level: 'rl-1',
    risk_level_detail: { id: 'rl-1', code: 'HIGH', name: 'High Risk', color: '#FF0000' },
    week_ending: '2026-05-22',
    notes: '',
    is_at_risk: false,
    is_reconciliation_trigger: false,
    is_last_hit: true,
    snapshot_date: null,
    snapshot_data: null,
  };

  it('renders schedule rows through the Tabulator grid', async () => {
    (logisticsApi.getBookingSchedule as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [item], count: 1 },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('SH-1001')).toBeInTheDocument();
  });

  it('configures *-editable inline columns for the weekly fields', async () => {
    (logisticsApi.getBookingSchedule as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [item], count: 1 },
    });
    renderPage();
    await screen.findByText('SH-1001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('cut_qty')?.editor).toBeDefined();
    expect(fieldOf('garments_ready_qty')?.editor).toBeDefined();
    expect(fieldOf('ex_factory_date')?.editor).toBeDefined();
    expect(fieldOf('ex_factory_notes')?.editor).toBeDefined();
    expect(fieldOf('status')?.headerFilter).toBeDefined();
  });

  it('marks the last hit with the cyan marker', async () => {
    (logisticsApi.getBookingSchedule as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [item], count: 1 },
    });
    renderPage();
    expect(await screen.findByTestId(`last-hit-marker-${item.id}`)).toBeInTheDocument();
  });

  it('wires onCellEdited to update the schedule item', async () => {
    (logisticsApi.getBookingSchedule as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [item], count: 1 },
    });
    renderPage();
    await screen.findByText('SH-1001');
    expect(typeof gridCapture.lastProps?.onCellEdited).toBe('function');
    const onCellEdited = gridCapture.lastProps?.onCellEdited as ((f: string, v: unknown, r: Record<string, unknown>) => void) | undefined;
    expect(onCellEdited).toBeDefined();
    if (onCellEdited) onCellEdited('cut_qty', '900', { id: item.id });
    expect(logisticsApi.updateBookingScheduleItem).toHaveBeenCalledWith(item.id, expect.objectContaining({ cut_qty: 900 }));
  });

  it('provides row add/edit/delete action callbacks', async () => {
    (logisticsApi.getBookingSchedule as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [item], count: 1 },
    });
    renderPage();
    await screen.findByText('SH-1001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('shows the point-in-time snapshot marker with a formatted timestamp when present', async () => {
    const snaphotted = {
      ...item,
      snapshot_date: '2026-05-20T14:30:00Z',
      snapshot_data: { status: 'live', cut_qty: '800.00', week_ending: '2026-05-22' },
    };
    (logisticsApi.getBookingSchedule as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [snaphotted], count: 1 },
    });
    renderPage();
    expect(await screen.findByText('SH-1001')).toBeInTheDocument();
    expect(screen.getByTestId(`snapshot-marker-${item.id}`)).toBeInTheDocument();
    expect(screen.getByText(/2026-05-20/)).toBeInTheDocument();
  });

  it('stays silent about the snapshot when none has been captured', async () => {
    (logisticsApi.getBookingSchedule as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [item], count: 1 },
    });
    renderPage();
    expect(await screen.findByText('SH-1001')).toBeInTheDocument();
    expect(screen.queryByTestId(`snapshot-marker-${item.id}`)).not.toBeInTheDocument();
  });
});