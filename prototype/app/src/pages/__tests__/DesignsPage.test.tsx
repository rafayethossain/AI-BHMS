import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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
    undoCalls = 0;
    redoCalls = 0;
    downloadArgs: unknown[] = [];

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

    undo() {
      this.undoCalls += 1;
    }

    redo() {
      this.redoCalls += 1;
    }

    download(type: string, fileName: string) {
      this.downloadArgs = [type, fileName];
    }

    destroy() {
      this.element.innerHTML = '';
    }
  }

  return { TabulatorFull: FakeTabulator };
});

import DesignsPage from '../DesignsPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <DesignsPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

async function openActionsMenu(user: ReturnType<typeof userEvent.setup>, designCode: string) {
  const rowEl = Array.from(document.querySelectorAll('.tabulator-row')).find((r) =>
    r.textContent?.includes(designCode),
  );
  const trigger = rowEl?.querySelector<HTMLButtonElement>('button[data-grid-action="actions-menu"]');
  expect(trigger).toBeTruthy();
  await user.click(trigger as HTMLButtonElement);
}

describe('DesignsPage (Design register)', () => {
  beforeEach(() => {
    resetDb();
    tabulatorCapture.reset();
  });

  it('renders the register title, toolbar and seeded design rows', async () => {
    renderPage();
    expect(await screen.findByText('REG-1001')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Design Register' })).toBeInTheDocument();
    expect(screen.getByText('REG-1002')).toBeInTheDocument();
    expect(screen.getAllByText('Nike Inc.').length).toBeGreaterThan(0);
    expect(screen.getByTestId('grid-search')).toBeInTheDocument();
  });

  it('narrows the grid when the toolbar search is typed', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('REG-1001');
    await user.type(screen.getByTestId('grid-search'), 'REG-1001');
    await waitFor(() => {
      expect(screen.queryByText('REG-1002')).not.toBeInTheDocument();
    });
    expect(screen.getByText('REG-1001')).toBeInTheDocument();
  });

  it('creates a new design from the add modal and shows the toast', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '+ New Design' }));

    const dialog = screen.getByRole('dialog', { name: 'New Design' });
    await user.type(within(dialog).getByLabelText('Design Code'), 'REG-2001');
    await user.selectOptions(within(dialog).getByLabelText('Style Type'), 'TOP');
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Menswear');
    await user.selectOptions(within(dialog).getByLabelText('Buyer'), 'Primark');
    await user.selectOptions(within(dialog).getByLabelText('Status'), 'active');
    await user.click(within(dialog).getByRole('button', { name: 'Create Design' }));

    expect(await screen.findByText('Design created', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByText('REG-2001')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'New Design' })).not.toBeInTheDocument();
  });

  it('opens the view modal on row click with the row details', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText('REG-1001'));

    const dialog = screen.getByRole('dialog', { name: 'Design REG-1001' });
    await waitFor(() => {
      expect(within(dialog).getByText('Nike Inc.')).toBeInTheDocument();
    });
    expect(within(dialog).getByText('Active')).toBeInTheDocument();
  });

  it('navigates to the full design page from the view modal', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/design']}>
        <ToastProvider>
          <Routes>
            <Route path="/design" element={<DesignsPage />} />
            <Route
              path="/designs/:designCode"
              element={<div data-testid="detail-stub">full design page</div>}
            />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );
    await user.click(await screen.findByText('REG-1001'));
    const dialog = screen.getByRole('dialog', { name: 'Design REG-1001' });
    await user.click(within(dialog).getByRole('button', { name: 'Open full design' }));
    expect(await screen.findByTestId('detail-stub')).toBeInTheDocument();
  });

  it('offers every design action from a single Actions menu per row', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('REG-1001');

    const triggers = document.querySelectorAll('button[data-grid-action="actions-menu"]');
    expect(triggers.length).toBeGreaterThan(0);
    expect(document.querySelector('button[data-grid-action="edit"]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Row actions' })).toBeNull();

    await openActionsMenu(user, 'REG-1001');
    const expectedOrder = [
      'View',
      'Edit',
      'Delete',
      'Materials',
      'Fit Specs',
      'Job Requests',
      'Costings',
      'Print Design Sheet',
      'Sales Report',
    ];
    for (const label of expectedOrder) {
      expect(await screen.findByRole('menuitem', { name: label })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('menuitem').map((el) => el.textContent)).toEqual(expectedOrder);
  });

  it('does not open the row view dialog when the Actions trigger is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('REG-1001');

    await openActionsMenu(user, 'REG-1001');
    expect(await screen.findByRole('menuitem', { name: 'Materials' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Design REG-1001' })).not.toBeInTheDocument();
  });

  it('renders the Actions menu in a body-level layer so the grid cannot clip it', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('REG-1001');

    await openActionsMenu(user, 'REG-1001');
    const menu = document.querySelector('.grid-row-menu');
    expect(menu).not.toBeNull();
    expect(menu?.parentElement).toBe(document.body);
    expect(menu?.closest('.tabulator-cell')).toBeNull();
    expect((menu as HTMLElement).style.top).not.toBe('');
    expect((menu as HTMLElement).style.left).not.toBe('');
  });

  it('navigates to a standalone action page from the Actions menu', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/design']}>
        <ToastProvider>
          <Routes>
            <Route path="/design" element={<DesignsPage />} />
            <Route
              path="/designs/:designCode/materials"
              element={<div data-testid="materials-stub">materials</div>}
            />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );
    await screen.findByText('REG-1001');
    await openActionsMenu(user, 'REG-1001');
    await user.click(await screen.findByRole('menuitem', { name: 'Materials' }));
    expect(await screen.findByTestId('materials-stub')).toBeInTheDocument();
  });

  it('closes the Actions menu on Escape', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('REG-1001');
    await openActionsMenu(user, 'REG-1001');
    expect(await screen.findByRole('menuitem', { name: 'Materials' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: 'Materials' })).not.toBeInTheDocument();
    });
  });

  it('prints the design sheet from the Actions menu', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/design']}>
        <ToastProvider>
          <Routes>
            <Route path="/design" element={<DesignsPage />} />
            <Route
              path="/designs/:designCode/print"
              element={<div data-testid="print-stub">design sheet print</div>}
            />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );
    await screen.findByText('REG-1001');
    await openActionsMenu(user, 'REG-1001');
    await user.click(await screen.findByRole('menuitem', { name: 'Print Design Sheet' }));
    expect(await screen.findByTestId('print-stub')).toBeInTheDocument();
  });

  it('prints the design sheet from the view modal footer', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/design']}>
        <ToastProvider>
          <Routes>
            <Route path="/design" element={<DesignsPage />} />
            <Route
              path="/designs/:designCode/print"
              element={<div data-testid="print-stub">design sheet print</div>}
            />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );
    await user.click(await screen.findByText('REG-1001'));
    const dialog = screen.getByRole('dialog', { name: 'Design REG-1001' });
    const link = within(dialog).getByRole('link', { name: 'Print Design Sheet' });
    expect(link).toHaveAttribute('href', '/designs/REG-1001/print');
    await user.click(link);
    expect(await screen.findByTestId('print-stub')).toBeInTheDocument();
  });

  it('edits a row status from the edit modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('REG-1001');
    await openActionsMenu(user, 'REG-1001');
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit Design' });
    await user.selectOptions(within(dialog).getByLabelText('Status'), 'archived');
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Design updated', undefined, { timeout: 5000 })).toBeInTheDocument();
  });

  it('deletes a row from the delete confirm and removes it from the grid', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('REG-1003');

    await openActionsMenu(user, 'REG-1003');
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    const dialog = screen.getByRole('dialog', { name: 'Delete design' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Design deleted', undefined, { timeout: 5000 })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('REG-1003')).not.toBeInTheDocument();
    });
  });
});

describe('DesignsPage — grid/list view toggle', () => {
  beforeEach(() => {
    resetDb();
    tabulatorCapture.reset();
  });

  it('renders a Grid/List toggle and defaults to the list (spreadsheet) view', async () => {
    renderPage();
    const grid = screen.getByRole('button', { name: 'Grid view' });
    const list = screen.getByRole('button', { name: 'List view' });
    expect(grid).toHaveAttribute('aria-pressed', 'false');
    expect(list).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('REG-1001')).toBeInTheDocument();
    expect(screen.getByTestId('grid-search')).toBeInTheDocument();
  });

  it('switches to grid view and renders design cards with sketch + key info', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Grid view' }));

    expect(screen.queryByTestId('grid-search')).not.toBeInTheDocument();
    const cards = await screen.findAllByTestId('design-card');
    expect(cards.length).toBeGreaterThan(0);

    const card = cards.find((c) => c.textContent?.includes('REG-1001'));
    expect(card).toBeDefined();
    expect(within(card as HTMLElement).getByTestId('sketch-placeholder')).toBeInTheDocument();
    expect(within(card as HTMLElement).getAllByText('REG-1001').length).toBeGreaterThan(0);
    expect(within(card as HTMLElement).getByText('Nike Inc.')).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText('Active')).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText('Live')).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText('Completed')).toBeInTheDocument();
    expect(within(card as HTMLElement).getByRole('button', { name: 'View' })).toBeInTheDocument();
  });

  it('narrows the cards when grid-view search is typed', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Grid view' }));
    expect((await screen.findAllByTestId('design-card')).length).toBeGreaterThan(1);

    await user.type(screen.getByTestId('card-search'), 'REG-1001');
    await waitFor(() => {
      expect(screen.getByTestId('design-card')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('design-card')).toHaveLength(1);
    expect(screen.getAllByText('REG-1001').length).toBeGreaterThan(0);
    expect(screen.queryByText('REG-1002')).not.toBeInTheDocument();
  });

  it('returns to the spreadsheet when List view is selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Grid view' }));
    expect(screen.queryByTestId('grid-search')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'List view' }));
    expect(screen.getByTestId('grid-search')).toBeInTheDocument();
    expect(await screen.findByText('REG-1002')).toBeInTheDocument();
  });

  it('opens the view modal from a card action', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Grid view' }));

    const cards = await screen.findAllByTestId('design-card');
    const card = cards.find((c) => c.textContent?.includes('REG-1001'));
    await user.click(within(card as HTMLElement).getByRole('button', { name: 'View' }));

    const dialog = screen.getByRole('dialog', { name: 'Design REG-1001' });
    expect(within(dialog).getByText('Nike Inc.')).toBeInTheDocument();
  });
});

describe('DesignsPage — techpack fields and sketch', () => {
  beforeEach(() => {
    resetDb();
    tabulatorCapture.reset();
  });

  it('lists the techpack fields in the spreadsheet grid columns', async () => {
    renderPage();
    await screen.findByText('REG-1001');
    for (const title of ['Issue Date', 'Block', 'Designer', 'Size', 'Issuer', 'Length', 'Description', 'Design Notes']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('shows seeded techpack values in the grid rows', async () => {
    renderPage();
    await screen.findByText('REG-1001');
    const row = Array.from(document.querySelectorAll('.tabulator-row')).find((r) =>
      r.textContent?.includes('REG-1001'),
    );
    expect(row).toBeDefined();
    expect(within(row as HTMLElement).getByText('B2')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('F. Rahman')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('S–XL')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('Merchandising')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('38 in')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('Crew neck oversized top')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('Contrast stitch detail')).toBeInTheDocument();
  });

  it('captures techpack fields and a sketch when creating a design', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '+ New Design' }));
    const dialog = screen.getByRole('dialog', { name: 'New Design' });

    await user.type(within(dialog).getByLabelText('Design Code'), 'REG-2001');
    await user.selectOptions(within(dialog).getByLabelText('Style Type'), 'TOP');
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Menswear');
    await user.selectOptions(within(dialog).getByLabelText('Buyer'), 'Primark');
    await user.selectOptions(within(dialog).getByLabelText('Status'), 'active');

    fireEvent.change(within(dialog).getByLabelText('Issue Date'), { target: { value: '2026-08-15' } });
    await user.type(within(dialog).getByLabelText('Block'), 'B9');
    await user.type(within(dialog).getByLabelText('Designer'), 'A. Test');
    await user.type(within(dialog).getByLabelText('Size'), '36');
    await user.selectOptions(within(dialog).getByLabelText('Issuer'), 'Sampling');
    await user.type(within(dialog).getByLabelText('Length'), '34 in');
    await user.type(within(dialog).getByLabelText('Description'), 'Test description clip');
    await user.type(within(dialog).getByLabelText('Design Notes'), 'Test note about collar');

    const file = new File([new Blob(['<svg/>'], { type: 'image/png' })], 'sketch.png', { type: 'image/png' });
    await user.upload(within(dialog).getByLabelText('Sketch'), file);
    expect(await within(dialog).findByAltText('Design sketch preview', undefined, { timeout: 5000 })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Create Design' }));

    expect(await screen.findByText('Design created', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByText('REG-2001')).toBeInTheDocument();

    const row = Array.from(document.querySelectorAll('.tabulator-row')).find((r) =>
      r.textContent?.includes('REG-2001'),
    );
    expect(row).toBeDefined();
    expect(within(row as HTMLElement).getByText('B9')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('A. Test')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('34 in')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('Test description clip')).toBeInTheDocument();
  });

  it('shows the new sketch on the created card in grid view', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '+ New Design' }));
    const dialog = screen.getByRole('dialog', { name: 'New Design' });
    await user.type(within(dialog).getByLabelText('Design Code'), 'REG-2001');
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Menswear');
    await user.selectOptions(within(dialog).getByLabelText('Buyer'), 'Primark');

    const file = new File([new Blob(['<svg/>'], { type: 'image/png' })], 'sketch.png', { type: 'image/png' });
    await user.upload(within(dialog).getByLabelText('Sketch'), file);
    expect(await within(dialog).findByAltText('Design sketch preview', undefined, { timeout: 5000 })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Create Design' }));
    await screen.findByText('Design created', undefined, { timeout: 5000 });

    await user.click(await screen.findByRole('button', { name: 'Grid view' }));
    const cards = await screen.findAllByTestId('design-card');
    const card = cards.find((c) => c.textContent?.includes('REG-2001'));
    expect(card).toBeDefined();
    await waitFor(
      () => {
        expect(within(card as HTMLElement).getByRole('img', { name: 'REG-2001 sketch' })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
    expect(within(card as HTMLElement).queryByTestId('sketch-placeholder')).not.toBeInTheDocument();
  });

  it('edits and persists techpack fields from the edit modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('REG-1001');

    await openActionsMenu(user, 'REG-1001');
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit Design' });
    const designer = within(dialog).getByLabelText('Designer');
    expect(designer).toHaveValue('F. Rahman');
    await user.clear(designer);
    await user.type(designer, 'G. Bianchi');
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Design updated', undefined, { timeout: 5000 })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('G. Bianchi')).toBeInTheDocument();
    });
  });

  it('shows techpack fields and sketch state in the view modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText('REG-1001'));
    const dialog = screen.getByRole('dialog', { name: 'Design REG-1001' });
    await waitFor(() => {
      expect(within(dialog).getByText('F. Rahman')).toBeInTheDocument();
    });
    expect(within(dialog).getByText('Block')).toBeInTheDocument();
    expect(within(dialog).getByText('Designer')).toBeInTheDocument();
    expect(within(dialog).getByText('B2')).toBeInTheDocument();
    expect(within(dialog).getByText('S–XL')).toBeInTheDocument();
    expect(within(dialog).getByText('38 in')).toBeInTheDocument();
    expect(within(dialog).getByText('Crew neck oversized top')).toBeInTheDocument();
    expect(within(dialog).getByText('Contrast stitch detail')).toBeInTheDocument();
  });
});

describe('DesignsPage — materials breakdown (BOM)', () => {
  beforeEach(() => {
    resetDb();
    tabulatorCapture.reset();
  });

  it('shows seeded materials in the view modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText('REG-1001'));
    const dialog = screen.getByRole('dialog', { name: 'Design REG-1001' });
    await waitFor(() => {
      expect(within(dialog).getByText('Materials')).toBeInTheDocument();
    });
    expect(within(dialog).getByText('SANDWASH LINEN')).toBeInTheDocument();
    expect(within(dialog).getByText('BUTTON 4 HOLES')).toBeInTheDocument();
    expect(within(dialog).getByText('NYLON ZIPPER FRONT FLY')).toBeInTheDocument();
    expect(within(dialog).getByText('ALICE')).toBeInTheDocument();
    expect(within(dialog).getAllByText('BLACK').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('132CM')).toBeInTheDocument();
    expect(within(dialog).getByText('1.67')).toBeInTheDocument();
    expect(within(dialog).getByText('ELASTIC BAND')).toBeInTheDocument();
    expect(within(dialog).getByText('FUSING')).toBeInTheDocument();
    expect(within(dialog).getByText('POLY COTTON POCKET BAG')).toBeInTheDocument();
  });

  it('shows material count in the Materials grid column', async () => {
    renderPage();
    await screen.findByText('REG-1001');
    const row = Array.from(document.querySelectorAll('.tabulator-row')).find((r) =>
      r.textContent?.includes('REG-1001'),
    );
    expect(row).toBeDefined();
    const cells = Array.from((row as HTMLElement).querySelectorAll('.tabulator-cell'));
    expect(cells[cells.length - 1].textContent).toBe('6');
  });

  it('shows empty state in view modal when design has no materials', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText('REG-1003'));
    const dialog = screen.getByRole('dialog', { name: 'Design REG-1003' });
    await waitFor(() => {
      expect(within(dialog).getByText('Materials')).toBeInTheDocument();
    });
    expect(within(dialog).getByText('No materials added yet')).toBeInTheDocument();
  });

  it('allows adding materials in the create form and persists them', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '+ New Design' }));
    const dialog = screen.getByRole('dialog', { name: 'New Design' });

    await user.type(within(dialog).getByLabelText('Design Code'), 'REG-2001');
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Menswear');
    await user.selectOptions(within(dialog).getByLabelText('Buyer'), 'Primark');

    await user.click(within(dialog).getByRole('button', { name: 'Add material' }));
    const materialRow = within(dialog).getByTestId('material-row');
    await user.type(within(materialRow).getByLabelText('Material type'), 'Cloth');
    await user.type(within(materialRow).getByLabelText('Description'), 'TEST FABRIC');
    await user.type(within(materialRow).getByLabelText('Code'), 'T-001');
    await user.type(within(materialRow).getByLabelText('Location'), 'FRONT');
    await user.type(within(materialRow).getByLabelText('Supplier'), 'TEST SUPPLIER');
    await user.type(within(materialRow).getByLabelText('Colour'), 'RED');
    await user.type(within(materialRow).getByLabelText('Width/Size'), '150CM');
    await user.type(within(materialRow).getByLabelText('Qty/Match'), '1.5');
    await user.type(within(materialRow).getByLabelText('Unit'), 'm');
    await user.type(within(materialRow).getByLabelText('Notes'), 'Test note for material');

    await user.click(within(dialog).getByRole('button', { name: 'Create Design' }));

    expect(await screen.findByText('Design created', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByText('REG-2001')).toBeInTheDocument();

    await user.click(await screen.findByText('REG-2001'));
    const viewDialog = screen.getByRole('dialog', { name: 'Design REG-2001' });
    await waitFor(() => {
      expect(within(viewDialog).getByText('TEST FABRIC')).toBeInTheDocument();
    });
    expect(within(viewDialog).getByText('T-001')).toBeInTheDocument();
    expect(within(viewDialog).getByText('TEST SUPPLIER')).toBeInTheDocument();
    expect(within(viewDialog).getByText('RED')).toBeInTheDocument();
    expect(within(viewDialog).getByText('Test note for material')).toBeInTheDocument();
  }, 15000);

  it('allows removing a material from the edit form', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('REG-1001');

    await openActionsMenu(user, 'REG-1001');
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit Design' });
    await waitFor(() => {
      expect(within(dialog).getByDisplayValue('SANDWASH LINEN')).toBeInTheDocument();
    });

    const materialRows = within(dialog).getAllByTestId('material-row');
    expect(materialRows.length).toBe(6);
    const firstRow = materialRows[0];
    await user.click(within(firstRow).getByRole('button', { name: 'Remove material' }));

    expect(within(dialog).queryByDisplayValue('SANDWASH LINEN')).not.toBeInTheDocument();
    expect(within(dialog).getAllByTestId('material-row').length).toBe(5);

    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByText('Design updated', undefined, { timeout: 5000 })).toBeInTheDocument();

    await user.click(await screen.findByText('REG-1001'));
    const viewDialog = screen.getByRole('dialog', { name: 'Design REG-1001' });
    await waitFor(() => {
      expect(within(viewDialog).queryByText('SANDWASH LINEN')).not.toBeInTheDocument();
    });
    expect(within(viewDialog).getByText('BUTTON 4 HOLES')).toBeInTheDocument();
  });
});

describe('DesignsPage — materials editor grid (UI/UX)', () => {
  beforeEach(() => {
    resetDb();
    tabulatorCapture.reset();
  });

  it('renders the materials editor as a grid table in the edit form', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('REG-1001');

    await openActionsMenu(user, 'REG-1001');
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit Design' });
    const grid = within(dialog).getByTestId('materials-grid');
    for (const header of ['Type', 'Description', 'Code', 'Location', 'Supplier', 'Colour', 'Width/Size', 'Qty/Match', 'Unit', 'Notes']) {
      expect(within(grid).getByText(header)).toBeInTheDocument();
    }
    const rows = within(grid).getAllByTestId('material-row');
    expect(rows.length).toBe(6);
    expect(rows[0].tagName).toBe('TR');
  });

  it('wraps the materials grid in a horizontally + vertically scrollable container', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('REG-1001');

    await openActionsMenu(user, 'REG-1001');
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit Design' });
    const scroll = within(dialog).getByTestId('materials-grid-scroll');
    expect(scroll.className).toContain('overflow-auto');
    expect(scroll.querySelector('table')).toBeInTheDocument();
  });

  it('opens design entry in a wider modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '+ New Design' }));
    const dialog = screen.getByRole('dialog', { name: 'New Design' });
    const card = dialog.firstElementChild;
    expect(card?.className).toContain('max-w-4xl');
  });

  it('adds a material as a new row inside the grid table in the create form', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '+ New Design' }));
    const dialog = screen.getByRole('dialog', { name: 'New Design' });

    await user.type(within(dialog).getByLabelText('Design Code'), 'REG-2100');
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Womenswear');
    await user.selectOptions(within(dialog).getByLabelText('Buyer'), 'Nike Inc.');

    await user.click(within(dialog).getByRole('button', { name: 'Add material' }));

    const grid = within(dialog).getByTestId('materials-grid');
    const rows = within(grid).getAllByTestId('material-row');
    expect(rows.length).toBe(1);
    expect(rows[0].tagName).toBe('TR');

    const codeInput = within(rows[0]).getByLabelText('Code');
    await user.type(codeInput, 'T-9');
    expect(codeInput).toHaveValue('T-9');
    expect(rows[0].closest('[data-testid="materials-grid"]')).not.toBeNull();
  });
});

describe('DesignsPage — view modal scroll + form dropdowns', () => {
  beforeEach(() => {
    resetDb();
    tabulatorCapture.reset();
  });

  it('view modal content is scrollable and wider than the default', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText('REG-1001'));
    const dialog = screen.getByRole('dialog', { name: 'Design REG-1001' });
    const card = dialog.firstElementChild;
    expect(card?.className).toContain('max-w-3xl');
    const content = card?.children[1];
    expect(content?.className).toContain('overflow-y-auto');
  });

  it('renders Style Type, Category, Buyer and Issuer as select dropdowns', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '+ New Design' }));
    const dialog = screen.getByRole('dialog', { name: 'New Design' });

    const styleType = within(dialog).getByLabelText('Style Type');
    expect(styleType.tagName).toBe('SELECT');
    expect(within(styleType as HTMLSelectElement).getByRole('option', { name: 'TOP' })).toBeInTheDocument();

    const category = within(dialog).getByLabelText('Category');
    expect(category.tagName).toBe('SELECT');
    expect(within(category as HTMLSelectElement).getByRole('option', { name: 'Womenswear' })).toBeInTheDocument();

    const buyer = within(dialog).getByLabelText('Buyer');
    expect(buyer.tagName).toBe('SELECT');
    expect(within(buyer as HTMLSelectElement).getByRole('option', { name: 'Nike Inc.' })).toBeInTheDocument();

    const issuer = within(dialog).getByLabelText('Issuer');
    expect(issuer.tagName).toBe('SELECT');
    expect(within(issuer as HTMLSelectElement).getByRole('option', { name: 'Merchandising' })).toBeInTheDocument();
  });

  it('materials areas have both-axis scroll and a minimum height', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText('REG-1001'));
    let dialog = screen.getByRole('dialog', { name: 'Design REG-1001' });
    const viewScroll = within(dialog).getByTestId('materials-section-scroll');
    expect(viewScroll.className).toContain('overflow-auto');
    expect(viewScroll.className).toContain('min-h-');
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));

    await user.click(await screen.findByRole('button', { name: '+ New Design' }));
    dialog = screen.getByRole('dialog', { name: 'New Design' });
    await user.type(within(dialog).getByLabelText('Design Code'), 'REG-2200');
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Menswear');
    await user.selectOptions(within(dialog).getByLabelText('Buyer'), 'Primark');
    await user.click(within(dialog).getByRole('button', { name: 'Add material' }));

    const formScroll = within(dialog).getByTestId('materials-grid-scroll');
    expect(formScroll.className).toContain('overflow-auto');
    expect(formScroll.className).toContain('min-h-');
  });
});

describe('DesignsPage — responsive page shell', () => {
  beforeEach(() => {
    resetDb();
    tabulatorCapture.reset();
  });

  it('renders a fluid, full-width page container (no fixed max-width cap)', async () => {
    renderPage();
    await screen.findByText('REG-1001');

    const root = screen.getByTestId('page-container');
    expect(root.className).not.toContain('max-w-');
    expect(root.className).toContain('w-full');
  });

  it('scales the page gutters responsively instead of one fixed padding', async () => {
    renderPage();
    await screen.findByText('REG-1001');

    const root = screen.getByTestId('page-container');
    expect(root.className).toContain('p-4');
    expect(root.className).toContain('sm:p-6');
  });

  it('sizes the register grid to the viewport rather than a fixed pixel height', async () => {
    renderPage();
    await screen.findByText('REG-1001');

    const instances = tabulatorCapture.instances;
    const instance = instances[instances.length - 1];
    expect(instance?.options.height).toBe('max(320px, calc(100vh - 320px))');
  });
});
