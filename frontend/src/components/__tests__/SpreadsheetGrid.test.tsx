import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const tabulatorCapture = vi.hoisted(() => ({
  instances: [] as {
    options: Record<string, unknown>;
    undoCalls: number;
    redoCalls: number;
    downloadArgs: unknown[];
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
        this.setData(options.data as Record<string, unknown>[]);
      }
      tabulatorCapture.instances.push(this);
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

    setData(data: Record<string, unknown>[]) {
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