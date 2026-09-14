import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const navigateMock = vi.fn();

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const apiMock = vi.hoisted(() => ({
  getDesignCosting: vi.fn(),
  getPurchaseOrders: vi.fn(),
  updateDesignCosting: vi.fn(),
}));

vi.mock('../../api/client', () => ({
  merchApi: apiMock,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock, useParams: () => ({ id: 'dc-1' }) };
});

import DesignCostingDetailPage from '../DesignCostingDetailPage';

const ladderCosting = {
  id: 'dc-1',
  style: 's-1',
  style_number: 'STY-DCL',
  style_name: 'Ladder Style',
  version: 1,
  status: 'approved',
  sheet_type: 'bd',
  sheet_type_label: 'Bangladesh',
  is_live: true,
  target_price: null,
  fabric_cost: '10.00',
  trim_cost: '2.50',
  cm_cost: '5.00',
  overhead_cost: '1.25',
  total_cost: '18.75',
  margin: '0.00',
  margin_percent: 8.0,
  customer_discount_pct: '2.00',
  origin_overhead_pct: '4.00',
  uk_overhead_pct: '16.00',
  exchange_rate: '1.360000',
  selling_price: '25.00',
  discount_amount: '0.50',
  overhead_amount: '3.75',
  base_cost: '23.00',
  margin_amount: '2.00',
  landed_cost: '25.50',
  is_single_size: false,
  size_ratio: [],
  is_patterned: false,
  patterned_fabric_options: [],
  approved_by: null,
  approved_at: null,
  created_at: '2026-09-14T00:00:00Z',
  lines: [],
  notes: '',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/design-costings/dc-1']}>
      <DesignCostingDetailPage />
    </MemoryRouter>,
  );
}

describe('DesignCostingDetailPage price ladder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getDesignCosting.mockResolvedValue({ data: ladderCosting });
    apiMock.getPurchaseOrders.mockResolvedValue({ data: { results: [], count: 0 } });
    apiMock.updateDesignCosting.mockResolvedValue({ data: ladderCosting });
  });

  it('renders the ladder inputs pre-filled from the costing', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('input-selling')).toHaveValue(25);
    });
    expect(screen.getByTestId('input-discount')).toHaveValue(2);
    expect(screen.getByTestId('input-origin')).toHaveValue(4);
    expect(screen.getByTestId('input-uk')).toHaveValue(16);
    expect(screen.getByTestId('input-rate')).toHaveValue(1.36);
  });

  it('shows derived Base Cost / Margin / landed readouts', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('ladder-base')).toHaveTextContent('$23.00');
    });
    expect(screen.getByTestId('ladder-discount')).toHaveTextContent('$0.50');
    expect(screen.getByTestId('ladder-overhead')).toHaveTextContent('$3.75');
    expect(screen.getByTestId('ladder-margin')).toHaveTextContent('$2.00');
    expect(screen.getByTestId('ladder-margin-pct')).toHaveTextContent('8.00%');
    expect(screen.getByTestId('ladder-landed')).toHaveTextContent('GBP 25.50');
  });

  it('recomputes readouts when selling price changes, then saves via PATCH', async () => {
    renderPage();
    await screen.findByTestId('input-selling');
    await waitFor(() => expect(screen.getByTestId('ladder-base')).toHaveTextContent('$23.00'));
    fireEvent.change(screen.getByTestId('input-selling'), { target: { value: '30.00' } });
    await waitFor(() => {
      expect(screen.getByTestId('ladder-base')).toHaveTextContent('$23.10');
      expect(screen.getByTestId('ladder-margin')).toHaveTextContent('$6.90');
    });
    fireEvent.click(screen.getByTestId('save-ladder'));
    await waitFor(() => {
      expect(apiMock.updateDesignCosting).toHaveBeenCalledWith('dc-1', expect.objectContaining({
        selling_price: '30.00',
        customer_discount_pct: '2.00',
        origin_overhead_pct: '4.00',
        uk_overhead_pct: '16.00',
        exchange_rate: '1.360000',
      }));
    });
  });
});