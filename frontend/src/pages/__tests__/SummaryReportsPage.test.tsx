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
  grids: [] as Record<string, unknown>[],
  reset() {
    this.grids = [];
  },
}));

vi.mock('../../components/SpreadsheetGrid', () => ({
  default: (props: Record<string, unknown>) => {
    gridCapture.grids.push(props);
    const { data, title } = props as { data: Record<string, unknown>[]; title: string };
    return (
      <div data-testid="spreadsheet-grid" data-title={title}>
        {(data as Record<string, unknown>[]).map((row, i) => (
          <div key={i} data-testid={`grid-row-${String(row[0] ?? i)}`}>
            <span>{String(row[Object.keys(row)[0]])}</span>
            <span>{String(row[Object.keys(row)[1] ?? Object.keys(row)[0]])}</span>
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('../../api/client', () => ({
  logisticsApi: {
    getSalesSummary: vi.fn(),
    getImportRecapSummary: vi.fn(),
    getExportRecapSummary: vi.fn(),
  },
}));

import SummaryReportsPage from '../SummaryReportsPage';
import { logisticsApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/logistics/summary-reports']}>
      <SummaryReportsPage />
    </MemoryRouter>,
  );
}

type Col = { title: string; field: string; hozAlign?: string; bottomCalc?: string };

describe('SummaryReportsPage (B6 aggregation reports)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
  });

  const sales = {
    buyers: [
      { buyer: 'Zara Kids', quantity: '3000.00', fob_value: '14000.00', cmpt_value: '5600.00', cost_value: '13400.00', factory_amount: '5400.00', customer_received_amount: '13400.00' },
    ],
    factories: [
      { factory: 'Apex Knitwears', quantity: '3000.00', fob_value: '14000.00', cmpt_value: '5600.00', cost_value: '13400.00', factory_amount: '5400.00', customer_received_amount: '13400.00' },
    ],
    total: { quantity: '4500.00', fob_value: '20000.00', cmpt_value: '8000.00', cost_value: '19200.00', factory_amount: '7900.00', customer_received_amount: '19400.00' },
  };

  const importSummary = {
    suppliers: [{ supplier: 'Zenith Fabrics', invoice_value: '1400.00', quantity: '620.00' }],
    factories: [{ factory: 'Apex Knitwears', invoice_value: '1400.00', quantity: '620.00' }],
    categories: [{ item_category: 'fabric', invoice_value: '1800.00', quantity: '800.00' }],
    total: { invoice_value: '2200.00', quantity: '920.00' },
  };

  const exportSummary = {
    factories: [{ factory: 'Apex Knitwears', quantity: '3000.00', fob_value: '14000.00', cmpt_value: '5600.00', cost_value: '13400.00' }],
    total: { quantity: '4500.00', fob_value: '20000.00', cmpt_value: '8000.00', cost_value: '19200.00' },
  };

  it('fetches the three report endpoints on load', async () => {
    (logisticsApi.getSalesSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: sales });
    (logisticsApi.getImportRecapSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: importSummary });
    (logisticsApi.getExportRecapSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: exportSummary });
    renderPage();
    expect(await screen.findAllByTestId('spreadsheet-grid')).not.toHaveLength(0);
    expect(logisticsApi.getSalesSummary).toHaveBeenCalledTimes(1);
    expect(logisticsApi.getImportRecapSummary).toHaveBeenCalledTimes(1);
    expect(logisticsApi.getExportRecapSummary).toHaveBeenCalledTimes(1);
  });

  it('renders the Sales Summary by Buyer grid with aggregates', async () => {
    (logisticsApi.getSalesSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: sales });
    (logisticsApi.getImportRecapSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: importSummary });
    (logisticsApi.getExportRecapSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: exportSummary });
    renderPage();
    const buyersGrid = await screen.findByText('Zara Kids');
    expect(buyersGrid).toBeInTheDocument();
    const buyerProps = gridCapture.grids.find((g) => (g.title as string).includes('Sales by Buyer'));
    expect(buyerProps).toBeDefined();
    const columns = buyerProps?.columns as Col[] | undefined;
    expect(columns?.map((c) => c.field)).toEqual(expect.arrayContaining(['buyer', 'quantity', 'fob_value', 'factory_amount', 'customer_received_amount']));
  });

  it('appends the grand-total row for the buyer sales grid', async () => {
    (logisticsApi.getSalesSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: sales });
    (logisticsApi.getImportRecapSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: importSummary });
    (logisticsApi.getExportRecapSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: exportSummary });
    renderPage();
    await screen.findByText('Zara Kids');
    const buyerGrids = gridCapture.grids.filter((g) => (g.title as string).includes('Sales by Buyer'));
    const buyerProps = buyerGrids[buyerGrids.length - 1];
    const data = buyerProps?.data as Record<string, unknown>[] | undefined;
    const totalRow = data?.[data.length - 1];
    expect(totalRow?.buyer).toBe('GRAND TOTAL');
    expect(totalRow?.fob_value).toBe('20,000.00');
  });

  it('renders the Sales by Factory grid', async () => {
    (logisticsApi.getSalesSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: sales });
    (logisticsApi.getImportRecapSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: importSummary });
    (logisticsApi.getExportRecapSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: exportSummary });
    renderPage();
    const matches = await screen.findAllByText('Apex Knitwears');
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const factoryProps = gridCapture.grids.find((g) => (g.title as string).includes('Sales by Factory'));
    expect(factoryProps).toBeDefined();
    const cols = factoryProps?.columns as Col[] | undefined;
    expect(cols?.map((c) => c.field)).toContain('factory');
  });

  it('renders the Import/Export Recap report grids', async () => {
    (logisticsApi.getSalesSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: sales });
    (logisticsApi.getImportRecapSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: importSummary });
    (logisticsApi.getExportRecapSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: exportSummary });
    renderPage();
    const importGrid = await screen.findByText('Zenith Fabrics');
    expect(importGrid).toBeInTheDocument();
    const recapProps = gridCapture.grids.filter((g) => String(g.title).includes('Recap'));
    expect(recapProps.length).toBeGreaterThanOrEqual(2);
  });

  it('is a read-only report (no action column)', async () => {
    (logisticsApi.getSalesSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: sales });
    (logisticsApi.getImportRecapSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: importSummary });
    (logisticsApi.getExportRecapSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ data: exportSummary });
    renderPage();
    await screen.findByText('Zara Kids');
    const all = gridCapture.grids;
    expect(all.every((g) => g.actionColumn !== true)).toBe(true);
    expect(all.every((g) => g.exportable === true)).toBe(true);
  });
});