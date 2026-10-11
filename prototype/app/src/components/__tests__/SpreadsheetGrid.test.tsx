import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const tabulatorCapture = vi.hoisted(() => ({
  instances: [] as {
    options: Record<string, unknown>;
    callbacks: Record<string, (arg1?: unknown, arg2?: unknown) => void>;
    undoCalls: number;
    redoCalls: number;
    downloadArgs: unknown[];
    externalSetDataCalls: number;
    setDataBeforeBuilt: boolean;
  }[],
  reset() {
    this.instances.length = 0;
  },
}));

vi.mock('tabulator-tables/dist/js/tabulator_esm.js', () => {
  class FakeTabulator {
    callbacks: Record<string, (arg1?: unknown, arg2?: unknown) => void> = {};
    headerEl: HTMLElement;
    element: HTMLElement;
    options: Record<string, unknown>;

    constructor(element: HTMLElement, options: Record<string, unknown>) {
      this.element = element;
      this.options = options;
      this.headerEl = this.renderHeader();
      this.element.appendChild(this.headerEl);
      if (Array.isArray(options.data)) {
        // The constructor's initial data load is internal (mirrors Tabulator's
        // own `_loadInitialData`); only *external* calls count as re-feeds.
        this.renderRows(options.data as Record<string, unknown>[]);
      }
      // Real Tabulator builds the table (and its row renderer) on a deferred
      // timer after the constructor; emulate that so tests can catch `setData`
      // calls that would land in the pre-build window.
      setTimeout(() => {
        this.initialized = true;
        this.callbacks.tableBuilt?.();
      }, 0);
      tabulatorCapture.instances.push(this);
    }

    initialized = false;
    externalSetDataCalls = 0;
    setDataBeforeBuilt = false;

    setData(data: Record<string, unknown>[]) {
      if (!this.initialized) this.setDataBeforeBuilt = true;
      this.externalSetDataCalls += 1;
      this.renderRows(data);
    }

    renderHeader(): HTMLElement {
      const header = document.createElement('div');
      header.className = 'tabulator-header';
      for (const col of (this.options.columns as { title: string }[]) ?? []) {
        const el = document.createElement('div');
        el.className = 'tabulator-col-title';
        el.textContent = col.title;
        header.appendChild(el);
      }
      return header;
    }

    undoCalls = 0;
    redoCalls = 0;
    downloadArgs: unknown[] = [];

    undo() {
      this.undoCalls += 1;
    }

    redo() {
      this.redoCalls += 1;
    }

    download(type: string, fileName: string, params?: unknown) {
      this.downloadArgs = [type, fileName, params];
    }

    renderRows(data: Record<string, unknown>[]) {
      const body = document.createElement('div');
      body.className = 'tabulator-body';
      for (const row of data) {
        const rowEl = document.createElement('div');
        rowEl.className = 'tabulator-row';
        rowEl.addEventListener('click', () => {
          this.callbacks.rowClick?.(undefined, { getData: () => row });
        });
        for (const col of (this.options.columns as { field: string }[]) ?? []) {
          const cell = document.createElement('div');
          cell.className = 'tabulator-cell';
          cell.textContent = String(row[col.field] ?? '');
          cell.addEventListener('click', () => {
            const input = document.createElement('input');
            input.value = String(row[col.field] ?? '');
            cell.textContent = '';
            cell.appendChild(input);
            const commit = () => {
              row[col.field] = input.value;
              cell.textContent = String(row[col.field] ?? '');
              this.callbacks.cellEdited?.({
                getField: () => col.field,
                getValue: () => input.value,
                getRow: () => ({ getData: () => row }),
              });
            };
            input.addEventListener('change', commit);
            input.addEventListener('keydown', (e: KeyboardEvent) => {
              if (e.key === 'Enter') commit();
            });
          });
          rowEl.appendChild(cell);
        }
        body.appendChild(rowEl);
      }
      this.element.innerHTML = '';
      this.element.appendChild(this.headerEl);
      this.element.appendChild(body);
    }

    on(name: string, cb: (arg1?: unknown, arg2?: unknown) => void) {
      this.callbacks[name] = cb;
    }

    destroy() {
      this.callbacks = {};
      this.element.innerHTML = '';
    }
  }

  return { TabulatorFull: FakeTabulator };
});

import SpreadsheetGrid from '../SpreadsheetGrid';
import type { SpreadsheetColumn } from '../SpreadsheetGrid';

const columns: SpreadsheetColumn[] = [
  { title: 'Material', field: 'material', width: 180, editor: true },
  { title: 'Qty', field: 'qty', editor: 'number', bottomCalc: 'sum' },
];

const rows = [
  { material: 'DENIM 12oz', qty: 240 },
  { material: 'TWILL', qty: 120 },
];

function renderGrid(props?: Record<string, unknown>) {
  return render(<SpreadsheetGrid data={rows} columns={columns} {...props} />);
}

describe('SpreadsheetGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tabulatorCapture.reset();
  });

  it('configures the basic Tabulator options', () => {
    const { container } = renderGrid();
    const grid = container.querySelector('[data-testid="spreadsheet-grid"]');
    expect(grid?.querySelector('.tabulator-header')).not.toBeNull();
  });

  it('renders column headers', () => {
    renderGrid();
    expect(screen.getByText('Material')).toBeInTheDocument();
    expect(screen.getByText('Qty')).toBeInTheDocument();
  });

  it('renders row data as cells', () => {
    renderGrid();
    expect(screen.getByText('DENIM 12oz')).toBeInTheDocument();
    expect(screen.getByText('TWILL')).toBeInTheDocument();
    expect(screen.getByText('240')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('fires onRowClick with the row data', () => {
    const onRowClick = vi.fn();
    renderGrid({ onRowClick });
    fireEvent.click(screen.getByText('DENIM 12oz'));
    expect(onRowClick).toHaveBeenCalledWith(
      expect.objectContaining({ material: 'DENIM 12oz' }),
    );
  });

  it('edits a cell and fires onCellEdited', async () => {
    const onCellEdited = vi.fn();
    renderGrid({ onCellEdited });
    fireEvent.click(screen.getByText('DENIM 12oz'));

    const input = await screen.findByDisplayValue('DENIM 12oz');
    fireEvent.change(input, { target: { value: 'DENIM 14oz' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onCellEdited).toHaveBeenCalledWith(
        'material',
        'DENIM 14oz',
        expect.objectContaining({ material: 'DENIM 14oz' }),
      );
    });
  });

  it('forwards bottomCalc on the columns to Tabulator', () => {
    renderGrid();
    const opts = tabulatorCapture.instances[0].options;
    const cols = opts.columns as { field: string; bottomCalc?: string }[];
    expect(cols.find((c) => c.field === 'qty')?.bottomCalc).toBe('sum');
    expect(cols.find((c) => c.field === 'material')?.bottomCalc ?? null).toBeNull();
  });

  it('forwards rowContextMenu and headerMenu to Tabulator', () => {
    const rowContextMenu = (row: Record<string, unknown>) => [
      { label: `Delete ${String(row.id)}` } as { label: string },
    ];
    const headerMenu = () => [{ label: 'Hide Column' } as { label: string }];
    renderGrid({ rowContextMenu, headerMenu });
    const opts = tabulatorCapture.instances[0].options;
    const rowMenu = (
      opts.rowContextMenu as unknown as (e: Event, row: { getData: () => Record<string, unknown> }) => { label: string }[]
    )(new Event('click'), { getData: () => ({ id: 99 }) });
    expect(rowMenu).toEqual([{ label: 'Delete 99' }]);
    const colMenu = (opts.columns as { headerMenu?: () => { label: string }[] }[])[0].headerMenu;
    expect(colMenu?.()).toEqual([{ label: 'Hide Column' }]);
  });

  it('forwards row grouping options', () => {
    renderGrid({
      groupBy: 'type',
      groupHeader: (value: unknown, count: number) => `${value} (${count})`,
    });
    const opts = tabulatorCapture.instances[0].options;
    expect(opts.groupBy).toBe('type');
    const gh = opts.groupHeader as (value: unknown, count: number) => string;
    expect(gh('Cloth', 2)).toBe('Cloth (2)');
  });

  it('does not enable clipboard or history by default', () => {
    renderGrid();
    const opts = tabulatorCapture.instances[0].options;
    expect(opts.clipboard).toBeUndefined();
    expect(opts.history).toBeUndefined();
  });

  it('enables clipboard paste and history on request', () => {
    renderGrid({ clipboardPaste: true, history: true });
    const opts = tabulatorCapture.instances[0].options;
    expect(opts.clipboard).toBe(true);
    expect(opts.history).toBe(true);
    expect(opts.clipboardPasteAction).toBe('range');
  });

  it('suppresses onRowClick when the click lands on a grid action control', () => {
    const onRowClick = vi.fn<(row: Record<string, unknown>) => void>();
    renderGrid({ onRowClick, actionColumn: true });
    const inst = tabulatorCapture.instances[0];
    const actionEl = document.createElement('button');
    actionEl.dataset.gridAction = 'actions-menu';
    inst.callbacks.rowClick?.(
      { target: actionEl },
      { getData: () => ({ material: 'DENIM 12oz' }) },
    );
    expect(onRowClick).not.toHaveBeenCalled();
    inst.callbacks.rowClick?.(undefined, { getData: () => ({ material: 'DENIM 12oz' }) });
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it('renders a single Actions menu column instead of inline row actions', () => {
    renderGrid({ actionColumn: true });
    const cols = tabulatorCapture.instances[0].options.columns as { field: string; title: string }[];
    const fields = cols.map((c) => c.field);
    expect(fields).toContain('__actions');
    expect(fields).not.toContain('__rowmenu');
    expect(cols.find((c) => c.field === '__actions')?.title).toBe('Actions');
  });

  it('renders the Actions menu column when only rowActions is supplied', () => {
    renderGrid({ rowActions: () => [{ label: 'Print Design Sheet' }] });
    const fields = (
      tabulatorCapture.instances[0].options.columns as { field: string }[]
    ).map((c) => c.field);
    expect(fields).toContain('__actions');
  });

  it('does not add an Actions column by default', () => {
    renderGrid();
    const fields = (
      tabulatorCapture.instances[0].options.columns as { field: string }[]
    ).map((c) => c.field);
    expect(fields).not.toContain('__actions');
  });

  it('exposes undo, redo and Excel export through the grid ref', () => {
    const gridRef = { current: null as null | {
      undo: () => void;
      redo: () => void;
      downloadXlsx: (fileName?: string) => void;
    } };
    render(<SpreadsheetGrid data={rows} columns={columns} gridRef={gridRef} />);
    expect(gridRef.current).not.toBeNull();
    gridRef.current?.undo();
    expect(tabulatorCapture.instances[0].undoCalls).toBe(1);
    gridRef.current?.redo();
    expect(tabulatorCapture.instances[0].redoCalls).toBe(1);
    gridRef.current?.downloadXlsx('bom.xlsx');
    expect(tabulatorCapture.instances[0].downloadArgs[0]).toBe('xlsx');
    expect(tabulatorCapture.instances[0].downloadArgs[1]).toBe('bom.xlsx');
  });
});

describe('SpreadsheetGrid data changes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tabulatorCapture.reset();
  });

  it('does not re-feed data to a table that was just rebuilt with the new data', () => {
    // Mount with an empty grid (data not loaded yet), then swap in the rows —
    // exactly the mock/API pattern (grid mounts empty, data arrives async). The
    // rows change rebuilds the Tabulator instance with the new data already in
    // its constructor options. Re-feeding that same data via `setData` in the
    // sync data-sync effect runs before Tabulator's deferred `_create()` (which
    // assigns the row renderer) — the real library throws `Cannot read
    // properties of null (reading 'verticalFillMode')` in `adjustTableSize`.
    const { rerender } = render(<SpreadsheetGrid data={[]} columns={columns} />);
    rerender(<SpreadsheetGrid data={rows} columns={columns} />);

    const instances = tabulatorCapture.instances;
    expect(instances.length).toBe(2); // the first instance was rebuilt
    expect(instances[1].externalSetDataCalls).toBe(0);
  });

  it('defers a data feed until the table is built when a filter changes in the build window', async () => {
    render(<SpreadsheetGrid data={rows} columns={columns} toolbar />);
    const inst = tabulatorCapture.instances[0];
    // Typing in the grid search changes `gridData` without rebuilding the table,
    // so it flows through the data-sync effect — while the (fake) Tabulator has
    // not yet fired `tableBuilt` (its build is deferred, as in the real library).
    fireEvent.change(screen.getByTestId('grid-search'), { target: { value: 'DENIM' } });
    expect(inst.setDataBeforeBuilt).toBe(false);
    // Once the table is built, the filtered rows are pushed.
    await waitFor(() => expect(inst.externalSetDataCalls).toBe(1));
    expect(inst.setDataBeforeBuilt).toBe(false);
  });
});