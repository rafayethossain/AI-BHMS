import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToastProvider } from '../../components/Toast';
import { resetDb } from '../../mock/api';

const tabulatorCapture = vi.hoisted(() => ({
  instances: [] as {
    options: Record<string, unknown>;
    callbacks: Record<string, (...args: unknown[]) => void>;
    setData(data: Record<string, unknown>[]): void;
  }[],
  reset() {
    this.instances.length = 0;
  },
}));

vi.mock('tabulator-tables/dist/js/tabulator_esm.js', () => {
  type RowData = Record<string, unknown>;

  class FakeTabulator {
    element: HTMLElement;
    options: Record<string, unknown>;
    callbacks: Record<string, (...args: unknown[]) => void> = {};

    constructor(element: HTMLElement, options: Record<string, unknown>) {
      this.element = element;
      this.options = options;
      this.renderTable(options as { columns?: unknown; data?: RowData[] });
      tabulatorCapture.instances.push(this);
    }

    renderTable(options: { columns?: unknown; data?: RowData[] }) {
      const cols = (options.columns as {
        title?: string;
        field?: string;
        formatter?: (cell: { getRow(): { getData(): RowData } }) => unknown;
      }[]) ?? [];
      const data = options.data ?? [];
      this.element.innerHTML = '';
      const header = document.createElement('div');
      header.className = 'tabulator-header';
      cols.forEach((c) => {
        const t = document.createElement('div');
        t.textContent = c.title ?? '';
        header.appendChild(t);
      });
      this.element.appendChild(header);
      const body = document.createElement('div');
      body.className = 'tabulator-body';
      data.forEach((row) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'tabulator-row';
        cols.forEach((c) => {
          const cell = document.createElement('div');
          cell.className = 'tabulator-cell';
          if (typeof c.formatter === 'function') {
            const result = c.formatter({ getRow: () => ({ getData: () => ({ ...row }) }) });
            if (result instanceof Node) cell.appendChild(result);
          } else {
            cell.textContent = String(row[c.field ?? ''] ?? '');
          }
          rowEl.appendChild(cell);
        });
        rowEl.addEventListener('click', (e) => {
          this.callbacks.cellClick?.(e, { getRow: () => ({ getData: () => ({ ...row }) }) });
          this.callbacks.rowClick?.(e, { getData: () => ({ ...row }) });
        });
        body.appendChild(rowEl);
      });
      this.element.appendChild(body);
    }

    on(name: string, cb: (...args: unknown[]) => void) {
      this.callbacks[name] = cb;
    }

    setData(data: RowData[]) {
      this.renderTable({ ...(this.options as object), data });
    }

    undo() {}
    redo() {}
    download() {}
    destroy() {
      this.element.innerHTML = '';
    }
  }

  return { TabulatorFull: FakeTabulator };
});

import PurchaseOrdersPage from '../PurchaseOrdersPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/purchase-orders']}>
      <ToastProvider>
        <Routes>
          <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/purchase-orders/:poNumber" element={<DetailStub />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

function DetailStub() {
  const { poNumber } = useParams<{ poNumber: string }>();
  return <div data-testid="po-detail-stub">detail:{poNumber}</div>;
}

describe('PurchaseOrdersPage (register-wide PO list)', () => {
  beforeEach(() => {
    resetDb();
    tabulatorCapture.reset();
  });

  it('shows the register header with the total PO count', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Purchase Orders' })).toBeInTheDocument();
    expect(await screen.findByText(/33 purchase orders/i)).toBeInTheDocument();
  });

  it('renders rows for POs across designs with their FN and design code', async () => {
    renderPage();
    await waitFor(() => {
      expect(document.querySelector('.tabulator-row')?.textContent).toContain('PO-2025-0001');
    });
    const body = document.querySelector('.tabulator-body')?.textContent ?? '';
    expect(body).toContain('PO-2025-0001');
    expect(body).toContain('FO-2025-102');
    expect(body).toContain('REG-1001');
    expect(body).toContain('PO-2025-0031');
  });

  it('renders the risk matrix as labels', async () => {
    renderPage();
    await waitFor(() => {
      const body = document.querySelector('.tabulator-body')?.textContent ?? '';
      expect(body).toMatch(/On Track|At Risk|Delayed or Overdue|No Status/);
    });
  });

  it('opens the PO detail when a row is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(document.querySelector('.tabulator-row')).toBeTruthy();
    });
    const rowEl = Array.from(document.querySelectorAll('.tabulator-row')).find((r) =>
      r.textContent?.includes('PO-2025-0001'),
    );
    await user.click(rowEl as HTMLElement);
    expect(await screen.findByTestId('po-detail-stub')).toHaveTextContent('detail:PO-2025-0001');
  });

  it('explains that POs are created from a costing', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /\+ Create PO/i }));
    expect(await screen.findByText(/create a po from a costing/i)).toBeInTheDocument();
  });
});
