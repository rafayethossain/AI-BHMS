import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const merchApiMock = vi.hoisted(() => ({
  getOrderManager: vi.fn(),
}));

const setupApiMock = vi.hoisted(() => ({
  getBuyers: vi.fn(),
}));

vi.mock('../../api/client', () => ({
  merchApi: merchApiMock,
  setupApi: setupApiMock,
}));

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import OrderManagerDashboardPage from '../OrderManagerDashboardPage';
import type {
  OrderManagerCriticalPath,
  OrderManagerRow,
} from '../../api/client';

function cp(over: Partial<OrderManagerCriticalPath> = {}): OrderManagerCriticalPath {
  return {
    has_ta: true,
    status: 'on-track',
    milestones_total: 5,
    milestones_completed: 2,
    milestones_delayed: 0,
    critical_milestones_total: 2,
    critical_milestones_completed: 1,
    next_milestone: {
      name: 'Fabric approval',
      planned_date: '2026-09-05',
      is_critical: true,
      days_until: 0,
    },
    ...over,
  };
}

function makeRow(
  over: Partial<OrderManagerRow> & Pick<OrderManagerRow, 'po_id' | 'po_number'>,
): OrderManagerRow {
  return {
    file_number: 'FO-1001',
    buyer_name: 'CMT Apparel',
    style_number: 'STY-1001',
    delivery_date: '2026-09-15',
    quantity: 1500,
    status: 'open',
    status_label: 'Open',
    production: { total: 6, open: 0, overdue: 0, completed: 6 },
    technical: { fit_stage: 'pp', fit_stage_label: 'PP' },
    logistics: { shipments_total: 1, delivered: 0, in_transit: 0, delivered_pct: 0 },
    dockets: { total: 1, final_raised: 0, over_limit_pending: 0 },
    reconciliation: { pending_debits: 0, shortage_units: '0' },
    schedule: { items_total: 4, items_delivered: 1, delivered_pct: 25 },
    gold_seal: { status: null, status_label: '' },
    risk: { level: 'ok', flags: [] },
    critical_path: cp(),
    ...over,
  };
}

function renderPage(rows: OrderManagerRow[]) {
  merchApiMock.getOrderManager.mockResolvedValue({
    data: {
      summary: {
        total_orders: rows.length,
        open_orders: rows.length,
        delivered_orders: 0,
        ok: rows.length,
        watch: 0,
        risk: 0,
        pending_debits: 0,
        overdue_production: 0,
      },
      results: rows,
    },
  });
  return render(
    <MemoryRouter initialEntries={['/order-manager']}>
      <Routes>
        <Route path="/order-manager" element={<OrderManagerDashboardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setupApiMock.getBuyers.mockResolvedValue({ data: { results: [] } });
});

describe('OrderManagerDashboardPage critical-path strip + weekly review', () => {
  it('renders a Critical Path column with per-order status chips', async () => {
    const offTrack = makeRow({
      po_id: 'po-off',
      po_number: 'PO-1007',
      critical_path: cp({ status: 'off-track', milestones_delayed: 1 }),
    });
    const onTrack = makeRow({
      po_id: 'po-ok',
      po_number: 'PO-1008',
      critical_path: cp({ status: 'on-track' }),
    });
    renderPage([offTrack, onTrack]);
    expect(await screen.findByText('Critical Path')).toBeInTheDocument();
    expect(screen.getByTestId('cp-status-po-off').textContent).toContain('Off track');
    expect(screen.getByTestId('cp-status-po-ok').textContent).toContain('On track');
  });

  it('shows milestone progress, delayed count and the next milestone', async () => {
    const row = makeRow({
      po_id: 'po-1',
      po_number: 'PO-1001',
      critical_path: cp({
        status: 'off-track',
        milestones_total: 5,
        milestones_completed: 2,
        milestones_delayed: 1,
        next_milestone: {
          name: 'Pre-production',
          planned_date: '2026-08-29',
          is_critical: true,
          days_until: -7,
        },
      }),
    });
    renderPage([row]);
    await screen.findByTestId('cp-progress-po-1');
    expect(screen.getByTestId('cp-progress-po-1').textContent).toMatch(/2\/5/);
    expect(screen.getByTestId('cp-progress-po-1').textContent).toContain('1 delayed');
    expect(screen.getByTestId('cp-next-po-1').textContent).toContain('Pre-production');
    expect(screen.getByTestId('cp-next-po-1').textContent).toContain('7d late');
    expect(screen.getByTestId('cp-next-po-1').textContent).toContain('critical');
  });

  it('renders a No T&A fallback for orders without a TA', async () => {
    const row = makeRow({
      po_id: 'po-nota',
      po_number: 'PO-1009',
      critical_path: {
        has_ta: false,
        status: 'no-ta',
        milestones_total: 0,
        milestones_completed: 0,
        milestones_delayed: 0,
        critical_milestones_total: 0,
        critical_milestones_completed: 0,
        next_milestone: null,
      },
    });
    renderPage([row]);
    await screen.findByTestId('cp-status-po-nota');
    expect(screen.getByTestId('cp-status-po-nota').textContent).toContain('No T&A');
    expect(screen.queryByTestId('cp-progress-po-nota')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cp-next-po-nota')).not.toBeInTheDocument();
  });

  it('opens the Weekly Review dialog with all PO rows ticked and CP status shown', async () => {
    renderPage([
      makeRow({ po_id: 'po-1', po_number: 'PO-1001' }),
      makeRow({
        po_id: 'po-2',
        po_number: 'PO-1002',
        critical_path: cp({ status: 'off-track', milestones_delayed: 2 }),
      }),
    ]);
    await screen.findByText('Order Manager');
    fireEvent.click(screen.getByTestId('weekly-review-btn'));
    expect(await screen.findByTestId('weekly-review-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('weekly-review-tick-po-1')).toBeChecked();
    expect(screen.getByTestId('weekly-review-tick-po-2')).toBeChecked();
    expect(screen.getByTestId('weekly-review-tick-status-po-2').textContent).toContain('Off track');
  });

  it('counts ticked rows and prints the weekly review', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderPage([
      makeRow({ po_id: 'po-1', po_number: 'PO-1001' }),
      makeRow({ po_id: 'po-2', po_number: 'PO-1002' }),
      makeRow({ po_id: 'po-3', po_number: 'PO-1003' }),
    ]);
    await screen.findByText('Order Manager');
    fireEvent.click(screen.getByTestId('weekly-review-btn'));
    await screen.findByTestId('weekly-review-dialog');
    expect(screen.getByTestId('weekly-review-print').textContent).toContain('(3');
    fireEvent.click(screen.getByTestId('weekly-review-tick-po-2'));
    expect(screen.getByTestId('weekly-review-print').textContent).toContain('(2');
    fireEvent.click(screen.getByTestId('weekly-review-print'));
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});