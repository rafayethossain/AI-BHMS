import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../../components/DataTable', () => ({
  default: ({ data, columns }: { data: Record<string, unknown>[]; columns: { key: string; label: string; render?: (v: unknown, row: Record<string, unknown>) => React.ReactNode }[] }) => (
    <div data-testid="data-table">
      {data.map((row, i) => (
        <div key={i} data-testid="data-row">
          {columns.map((col) => (
            <span key={col.key} data-testid={`col-${col.key}`}>
              {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
            </span>
          ))}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const clientMock = vi.hoisted(() => ({
  fabricApi: {
    getUtilizations: vi.fn(),
    getOrders: vi.fn(),
    getMonthlySummary: vi.fn(),
    getQuarterlyMillReport: vi.fn(),
    createUtilization: vi.fn(),
    deleteUtilization: vi.fn(),
  },
}));

vi.mock('../../api/client', () => clientMock);

import FabricUtilizationPage from '../FabricUtilizationPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/fabric/utilizations']}>
      <FabricUtilizationPage />
    </MemoryRouter>,
  );
}

describe('FabricUtilizationPage (B10 tolerance fields)', () => {
  const util = {
    id: 'fu-1',
    order: 'fo-1',
    order_number: 'FO-2026-3001',
    supplier_name: 'FU Supplier',
    fabric_category_name: null,
    period: '2026-09',
    received_meters: '3200.00',
    used_meters: '3100.00',
    wasted_meters: '0.00',
    damaged_meters: '0.00',
    ordered_meters: '3000.00',
    over_under_meters: '200.00',
    over_under_pct: '6.67',
    accounted_meters: '3100.00',
    excess_meters: '100.00',
    efficiency_pct: '96.88',
    tolerance_pct: '5.00',
    tolerance_upper_meters: '3150.00',
    tolerance_lower_meters: '2850.00',
    tolerance_status: 'over',
    over_tolerance: true,
    notes: '',
    recorded_by: null,
    recorded_by_name: null,
    recorded_at: '2026-09-01T00:00:00Z',
  };

  const summary = {
    period: '2026-09',
    summary: {
      orders_count: 1,
      ordered_meters: '3000.00',
      received_meters: '3200.00',
      used_meters: '3100.00',
      wasted_meters: '0.00',
      damaged_meters: '0.00',
      excess_meters: '100.00',
      over_under_pct: '6.67',
      efficiency_pct: '96.88',
    },
    rows: [],
  };

  const quarterReport = {
    year: 2026,
    quarter: 3,
    mills: [],
    summary: {
      orders_count: 0,
      ordered_meters: '0.00',
      received_meters: '0.00',
      used_meters: '0.00',
      wasted_meters: '0.00',
      damaged_meters: '0.00',
      excess_meters: '0.00',
      over_under_pct: '0.00',
      efficiency_pct: '0.00',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clientMock.fabricApi.getUtilizations.mockResolvedValue({ data: { results: [util] } });
    clientMock.fabricApi.getOrders.mockResolvedValue({ data: { results: [] } });
    clientMock.fabricApi.getMonthlySummary.mockResolvedValue({ data: summary });
    clientMock.fabricApi.getQuarterlyMillReport.mockResolvedValue({ data: quarterReport });
  });

  it('renders tolerance_status column in utilization grid', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId('data-row').length).toBeGreaterThan(0);
    });
    const overBadge = screen.getByText('Over');
    expect(overBadge).toBeTruthy();
  });

  it('renders DEBIT flag when over_tolerance is true', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId('data-row').length).toBeGreaterThan(0);
    });
    const debitFlag = screen.getByText('DEBIT');
    expect(debitFlag).toBeTruthy();
  });

  it('renders Within badge for within-tolerance record', async () => {
    clientMock.fabricApi.getUtilizations.mockResolvedValue({
      data: {
        results: [{
          ...util,
          tolerance_status: 'within',
          over_tolerance: false,
        }],
      },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId('data-row').length).toBeGreaterThan(0);
    });
    const withinBadge = screen.getByText('Within');
    expect(withinBadge).toBeTruthy();
  });
});
