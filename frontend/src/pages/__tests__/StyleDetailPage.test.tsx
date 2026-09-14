import { describe, it, expect, vi, beforeEach } from 'vitest';

const navCapture = vi.hoisted(() => ({
  to: null as string | null,
  reset() {
    this.to = null;
  },
}));

vi.mock('../../api/client', () => ({
  default: { patch: vi.fn() },
  merchApi: {
    getStyle: vi.fn(),
    getStyleItems: vi.fn(),
    getStyleVersions: vi.fn(),
    getStyleFileOpenings: vi.fn(),
    getStylePOs: vi.fn(),
    getStyleBOMs: vi.fn(),
    getStyleDesignImages: vi.fn(),
    getStyleTechPacks: vi.fn(),
    getStyleVersionSalesOrder: vi.fn(),
    getDesignSheets: vi.fn(),
  },
  setupApi: {
    getVendors: vi.fn(),
    getUOMs: vi.fn(),
  },
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'sty-1' }),
    useNavigate: () => (to: string) => { navCapture.to = to; },
  };
});
vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../components/SearchableSelect', () => ({
  default: (props: { value?: string; options: unknown[]; onChange: (v: string) => void; labelKey?: string; placeholder?: string }) => (
    <select
      aria-label={props.placeholder}
      value={props.value ?? ''}
      onChange={(e) => props.onChange(e.target.value)}
    >
      <option value="">—</option>
      {(props.options as { id: string; name: string }[]).map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  ),
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import StyleDetailPage from '../StyleDetailPage';
import { merchApi, setupApi } from '../../api/client';
import type { Style, StyleVersion, SalesOrderRow } from '../../api/client';

const STYLE: Style = {
  id: 'sty-1',
  style_number: '67741T',
  name: 'Test Style',
  description: '',
  buyer: 'bx-1',
  buyer_name: 'Aldi',
  status: 'draft',
  block: '59073T',
  based_on: 'TP-1001',
  relationship: 'new',
  designer: 'Des A',
  pattern_cutter: '',
  issuer: '',
  cloth_code: '',
  size: '',
  length: '',
  issue_date: '',
  risk_date: '',
  pattern_request_date: '',
  design_note: '',
  created_at: '2026-09-01T00:00:00Z',
  current_version: 2,
} as unknown as Style;

const VERSIONS = [
  { id: 'sv-2', version_number: 2, revision_notes: '', status: 'active', created_at: '2026-09-02T00:00:00Z' },
  { id: 'sv-1', version_number: 1, revision_notes: '', status: 'active', created_at: '2026-09-01T00:00:00Z' },
] as unknown as StyleVersion[];

const ROWS = [
  {
    id: 'po-1',
    po_number: 'PO-101',
    file_number: 'FO-101',
    buyer_name: 'Aldi',
    factory_name: 'F1',
    destination_country_name: 'UK',
    delivery_date: '2026-06-01',
    quantity: 1000,
    unit_price: '10.00',
    total_value: '10000.00',
    status: 'in_production',
    items: [],
    sales_statuses: {
      fabric: { code: 'green', label: 'Green', color: '#16a34a', numeric: 1 },
      trims: { code: 'amber', label: 'Amber', color: '#d97706', numeric: 2 },
      production: { code: 'amber', label: 'Amber', color: '#d97706', numeric: 2 },
      delivery: { code: 'red', label: 'Red', color: '#dc2626', numeric: 4 },
      overall: { code: 'red', label: 'Red', color: '#dc2626', numeric: 4 },
    },
  },
  {
    id: 'po-2',
    po_number: 'PO-102',
    file_number: 'FO-102',
    buyer_name: 'Aldi',
    factory_name: 'F2',
    destination_country_name: 'US',
    delivery_date: '2026-07-01',
    quantity: 500,
    unit_price: '9.00',
    total_value: '4500.00',
    status: 'draft',
    items: [],
    sales_statuses: {
      fabric: { code: 'none', label: 'None', color: '#6b7280', numeric: 0 },
      trims: { code: 'none', label: 'None', color: '#6b7280', numeric: 0 },
      production: { code: 'none', label: 'None', color: '#6b7280', numeric: 0 },
      delivery: { code: 'none', label: 'None', color: '#6b7280', numeric: 0 },
      overall: { code: 'none', label: 'None', color: '#6b7280', numeric: 0 },
    },
  },
] as unknown as SalesOrderRow[];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/styles/sty-1']}>
      <StyleDetailPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  navCapture.reset();
  (merchApi.getStyle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: STYLE });
  (merchApi.getStyleItems as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
  (merchApi.getStyleVersions as ReturnType<typeof vi.fn>).mockResolvedValue({ data: VERSIONS });
  (merchApi.getStyleFileOpenings as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
  (merchApi.getStylePOs as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
  (merchApi.getStyleBOMs as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
  (merchApi.getStyleDesignImages as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
  (merchApi.getStyleTechPacks as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
  (merchApi.getStyleVersionSalesOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: ROWS });
  (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { results: [{ id: 'ds-1', style_id: 'sty-1' }], count: 1 },
  });
  (setupApi.getVendors as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { results: [] },
  });
  (setupApi.getUOMs as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { results: [] },
  });
});

describe('StyleDetailPage Design Information (merged Design surface)', () => {
  it('shows Design Information read-only without an inline editor', async () => {
    renderPage();
    await screen.findByText('Test Style');

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Customer')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Buyer')).not.toBeInTheDocument();
    expect(screen.getAllByText('Aldi').length).toBeGreaterThan(0);
    expect(screen.getByText('59073T')).toBeInTheDocument();
  });

  it('opens the merged design sheet detail for this style', async () => {
    renderPage();
    await screen.findByText('Test Style');

    await userEvent.click(screen.getByRole('button', { name: 'Open in Design' }));
    expect(navCapture.to).toBe('/design-sheets/ds-1');
  });

  it('falls back to the design register when the style has no design sheet', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [], count: 0 },
    });
    renderPage();
    await screen.findByText('Test Style');

    await userEvent.click(screen.getByRole('button', { name: 'Open in Design' }));
    expect(navCapture.to).toBe('/design');
  });
});

describe('StyleDetailPage Sales Order tab (RQ-051)', () => {
  async function openSalesOrderTab() {
    renderPage();
    await screen.findByText('Test Style');
    await userEvent.click(screen.getByRole('button', { name: 'Sales Order' }));
  }

  it('defaults to the latest version and renders POS with status pills', async () => {
    await openSalesOrderTab();

    await screen.findByText('PO-101');
    expect(screen.getByText('PO-102')).toBeInTheDocument();
    expect(merchApi.getStyleVersionSalesOrder).toHaveBeenCalledWith('sv-2');
    expect(screen.getByText('FO-101')).toBeInTheDocument();
    expect(screen.getAllByText('Red').length).toBeGreaterThan(0);
    expect(screen.getAllByText('None').length).toBeGreaterThan(0);
  });

  it('renders per-status tailwind pill classes', async () => {
    await openSalesOrderTab();
    await screen.findByText('PO-101');

    const amberPills = screen.getAllByText('Amber');
    expect(amberPills.length).toBeGreaterThan(0);
    expect(amberPills[0].className).toContain('bg-amber-500/15');

    const redPills = screen.getAllByText('Red');
    expect(redPills[0].className).toContain('bg-red-500/15');

    const greenPills = screen.getAllByText('Green');
    expect(greenPills[0].className).toContain('bg-emerald-500/15');
  });

  it('refetches when the version dropdown changes', async () => {
    await openSalesOrderTab();
    await screen.findByText('PO-101');
    expect(merchApi.getStyleVersionSalesOrder).toHaveBeenCalledWith('sv-2');

    const dropdown = screen.getByRole('combobox', { name: '' });
    await userEvent.selectOptions(dropdown, 'sv-1');
    await vi.waitFor(() =>
      expect(merchApi.getStyleVersionSalesOrder).toHaveBeenCalledWith('sv-1'),
    );
  });

  it('shows an empty state when the version has no POS', async () => {
    (merchApi.getStyleVersionSalesOrder as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    await openSalesOrderTab();

    expect(await screen.findByText('No sales orders for this version')).toBeInTheDocument();
  });

  it('navigates to the purchase order on row click', async () => {
    await openSalesOrderTab();
    await screen.findByText('PO-101');

    await userEvent.click(screen.getByText('PO-101'));
    expect(navCapture.to).toBe('/purchase-orders/po-1');
  });
});