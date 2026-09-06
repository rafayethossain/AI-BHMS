import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const tabulatorCapture = vi.hoisted(() => ({
  instances: [] as {
    options: Record<string, unknown>;
    setDataCalls: number;
    setDataArgs: Record<string, unknown>[][];
    downloadArgs: unknown[];
    addRowArgs: unknown[];
    deleteRowArgs: unknown[];
    setFilterCalls: number;
    clearFilterCalls: number;
    setGroupByCalls: unknown[];
    getHeaderFilterValue(field: string): unknown;
    setHeaderFilterValue(field: string, value: unknown): void;
    getData(): Record<string, unknown>[];
  }[],
  reset() {
    this.instances.length = 0;
  },
}));

vi.mock('tabulator-tables/dist/js/tabulator_esm.js', () => {
  const dataStore: Record<string, unknown>[] = [];
  class FakeTabulator {
    options: Record<string, unknown>;
    element: HTMLElement;
    callbacks: Record<string, (arg1?: unknown, arg2?: unknown) => void> = {};
    downloadArgs: unknown[] = [];
    addRowArgs: unknown[] = [];
    deleteRowArgs: unknown[] = [];
    setDataCalls = 0;
    setDataArgs: Record<string, unknown>[][] = [];
    setFilterCalls = 0;
    clearFilterCalls = 0;
    setGroupByCalls: unknown[] = [];
    headerFilterValues: Record<string, unknown> = {};

    constructor(element: HTMLElement, options: Record<string, unknown>) {
      this.element = element;
      this.options = options;
      this.element.innerHTML = '';
      if (Array.isArray(options.data)) {
        dataStore.length = 0;
        dataStore.push(...(options.data as Record<string, unknown>[]));
      }
      tabulatorCapture.instances.push(this);
      if (Array.isArray(options.data)) {
        this.renderBody(options.data as Record<string, unknown>[]);
      }
    }

    setData(data: Record<string, unknown>[]) {
      this.setDataCalls += 1;
      this.setDataArgs.push(data);
      dataStore.length = 0;
      dataStore.push(...data);
      this.renderBody(data);
    }

    renderBody(data: Record<string, unknown>[]) {
      if (this.element.querySelector('.tabulator-body')) {
        this.element.querySelector('.tabulator-body')!.remove();
      }
      const body = document.createElement('div');
      body.className = 'tabulator-body';
      body.addEventListener('click', (e: MouseEvent) => {
        const btn = (e.target as HTMLElement).closest('[data-grid-action]') as HTMLElement | null;
        if (btn) {
          const cells = Array.from(body.querySelectorAll('.tabulator-cell'));
          const cellEl = btn.closest('.tabulator-cell') as HTMLElement;
          const idx = cells.indexOf(cellEl);
          const rowData = data[idx];
          this.callbacks.cellClick?.(e, {
            getElement: () => cellEl,
            getRow: () => ({ getData: () => rowData }),
          });
        }
      });
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowEl = document.createElement('div');
        rowEl.className = 'tabulator-row';
        rowEl.dataset.id = String(i);
        for (const col of (this.options.columns as { field: string; formatter?: unknown }[]) ?? []) {
          const cell = document.createElement('div');
          cell.className = 'tabulator-cell';
          if (typeof col.formatter === 'function') {
            const fakeCell = { getRow: () => ({ getData: () => row }) };
            const node = (col.formatter as unknown as (
              cell: unknown,
              params: unknown,
              data: Record<string, unknown>,
            ) => HTMLElement)(fakeCell, undefined, row);
            cell.appendChild(node);
            rowEl.appendChild(cell);
          } else {
            cell.textContent = String(row[col.field] ?? '');
            rowEl.appendChild(cell);
          }
        }
        body.appendChild(rowEl);
      }
      this.element.appendChild(body);
    }
    getData() {
      return dataStore;
    }
    getHeaderFilterValue(field: string) {
      return this.headerFilterValues[field];
    }
    setHeaderFilterValue(field: string, value: unknown) {
      this.headerFilterValues[field] = value;
      this.callbacks.dataFiltered?.([]);
    }
    filter(_field: string, _value: unknown) {
      this.setFilterCalls += 1;
    }
    clearFilter() {
      this.clearFilterCalls += 1;
    }
    setGroupBy(field?: string | null) {
      this.setGroupByCalls.push(field ?? null);
    }
    addRow(row?: Record<string, unknown>) {
      this.addRowArgs.push(row);
    }
    deleteRow() {
      // no-op stub
    }
    download(type: string, fileName: string, params?: unknown) {
      this.downloadArgs = [type, fileName, params as string];
    }
    on(name: string, cb: (arg1?: unknown, arg2?: unknown) => void) {
      this.callbacks[name] = cb;
    }
    destroy() {
      this.element.innerHTML = '';
    }
  }
  return { TabulatorFull: FakeTabulator };
});

import SpreadsheetGrid from '../SpreadsheetGrid';
import type { SpreadsheetColumn } from '../SpreadsheetGrid';

const columns: SpreadsheetColumn[] = [
  { title: 'Style #', field: 'style_number' },
  { title: 'Name', field: 'name' },
  { title: 'Buyer', field: 'buyer_name' },
  { title: 'Status', field: 'status' },
];

const rows = [
  { style_number: 'ST-001', name: 'Denim Jacket', buyer_name: 'Zara', status: 'active' },
  { style_number: 'ST-002', name: 'Chino Trousers', buyer_name: 'H&M', status: 'approved' },
  { style_number: 'ST-003', name: 'Linen Shirt', buyer_name: 'Zara', status: 'draft' },
];

function renderGrid(props?: Record<string, unknown>) {
  return render(
    <SpreadsheetGrid
      data={rows}
      columns={columns}
      toolbar
      title="Styles"
      {...props}
    />,
  );
}

describe('SpreadsheetGrid Chrome (Excel-like toolbar)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tabulatorCapture.reset();
  });

  it('renders a toolbar with the title when toolbar is enabled', () => {
    renderGrid();
    expect(screen.getByText('Styles')).toBeInTheDocument();
  });

  it('shows a search box that filters the grid', () => {
    renderGrid();
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'Denim' } });
    const latest = tabulatorCapture.instances[tabulatorCapture.instances.length - 1];
    const data = latest.setDataArgs[latest.setDataArgs.length - 1];
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Denim Jacket');
  });

  it('clears the filter when search is emptied', () => {
    renderGrid();
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'x' } });
    const latest = tabulatorCapture.instances[tabulatorCapture.instances.length - 1];
    expect(latest.setDataArgs[latest.setDataArgs.length - 1]).toHaveLength(0);
    fireEvent.change(input, { target: { value: '' } });
    const data = latest.setDataArgs[latest.setDataArgs.length - 1];
    expect(data).toHaveLength(3);
  });

  it('exposes an Excel export button that calls download', () => {
    (window as unknown as { XLSX?: unknown }).XLSX = { version: '0.18' };
    try {
      renderGrid({ exportable: true, title: 'Styles' });
      const btn = screen.getByRole('button', { name: /export/i });
      fireEvent.click(btn);
      expect(tabulatorCapture.instances[0].downloadArgs[0]).toBe('xlsx');
      expect(String(tabulatorCapture.instances[0].downloadArgs[1])).toContain('Styles');
    } finally {
      delete (window as unknown as { XLSX?: unknown }).XLSX;
    }
  });

  it('renders an Add button that fires onAdd when provided', () => {
    const onAdd = vi.fn();
    renderGrid({ onAdd });
    const btn = screen.getByRole('button', { name: /add/i });
    fireEvent.click(btn);
    expect(onAdd).toHaveBeenCalled();
  });

  it('does not render toolbar chrome when toolbar is disabled', () => {
    render(<SpreadsheetGrid data={rows} columns={columns} />);
    expect(screen.queryByText('Styles')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
  });

  it('renders a column chooser that re-initializes with the hidden column removed', () => {
    renderGrid({ columnChooser: true });
    const btn = screen.getByRole('button', { name: /columns/i });
    fireEvent.click(btn);
    const nameToggle = screen.getByRole('checkbox', { name: /name/i });
    expect(nameToggle).toBeChecked();
    fireEvent.click(nameToggle);
    const latest = tabulatorCapture.instances[tabulatorCapture.instances.length - 1];
    const cols = latest.options.columns as { field: string }[];
    expect(cols.find((c) => c.field === 'name')).toBeUndefined();
    expect(cols.find((c) => c.field === 'style_number')).toBeDefined();
  });

  it('shows a pagination control when data exceeds the page size', () => {
    renderGrid({ paginationSize: 2 });
    expect(screen.getByText(/1-2 of 3/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all rows/i })).toBeInTheDocument();
  });

  it('exposes add/edit/delete/view row action buttons when actionColumn is set', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onView = vi.fn();
    renderGrid({ actionColumn: true, onEdit, onDelete, onView });
    const viewBtns = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewBtns[0]);
    expect(onView).toHaveBeenCalled();
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]);
    expect(onEdit).toHaveBeenCalled();
    const delBtns = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(delBtns[0]);
    expect(onDelete).toHaveBeenCalled();
  });
});

describe('SpreadsheetGrid advanced layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tabulatorCapture.reset();
  });

  it('places the action column on the far left for wider sheets', () => {
    render(
      <SpreadsheetGrid
        data={rows}
        columns={columns}
        actionColumn
        onView={() => undefined}
        onEdit={() => undefined}
        onDelete={() => undefined}
      />,
    );
    const cols = tabulatorCapture.instances[0].options.columns as { field: string }[];
    expect(cols[0].field).toBe('__actions');
  });

  it('adds a Group by control in the toolbar that groups the grid', () => {
    renderGrid({ toolbar: true });
    const btn = screen.getByRole('button', { name: /group by/i });
    fireEvent.click(btn);
    const option = screen.getByRole('menuitem', { name: /buyer/i });
    fireEvent.click(option);
    const latest = tabulatorCapture.instances[tabulatorCapture.instances.length - 1];
    expect(latest.setGroupByCalls).toContain('buyer_name');
  });

  it('builds a distinct-value list filter for each headerFilter column', () => {
    renderGrid({
      columns: [
        { title: 'Status', field: 'status', headerFilter: true },
        { title: 'Name', field: 'name', headerFilter: true },
      ],
    });
    const cols = tabulatorCapture.instances[0].options.columns as {
      field: string;
      headerFilter: string | undefined;
      headerFilterFunc: (() => boolean) | undefined;
      headerFilterParams: { values?: string[] } | undefined;
    }[];
    const status = cols.find((c) => c.field === 'status')!;
    expect(status.headerFilter).toBe('list');
    expect(status.headerFilterParams?.values).toEqual(
      expect.arrayContaining(['active', 'approved', 'draft']),
    );
    expect(status.headerFilterFunc?.()).toBe(true);
  });

  it('keeps free-text input filters when headerFilterType is input', () => {
    renderGrid({
      columns: [{ title: 'Name', field: 'name', headerFilter: true, headerFilterType: 'input' }],
    });
    const cols = tabulatorCapture.instances[0].options.columns as {
      field: string;
      headerFilter: string | undefined;
      headerFilterFunc: unknown;
    }[];
    expect(cols.find((c) => c.field === 'name')?.headerFilter).toBe('input');
    expect(typeof cols.find((c) => c.field === 'name')?.headerFilterFunc).toBe('function');
  });

  it('assigns every visible column a minimum width for horizontal scrolling', () => {
    renderGrid();
    const cols = tabulatorCapture.instances[0].options.columns as {
      field: string;
      minWidth: number | undefined;
    }[];
    for (const c of cols) {
      expect(typeof c.minWidth).toBe('number');
    }
  });

  it('defaults to fitData layout so wide sheets scroll horizontally', () => {
    renderGrid();
    const opts = tabulatorCapture.instances[0].options;
    expect(opts.layout).toBe('fitData');
    expect(typeof opts.height).toBe('number');
  });

  it('maps headerFilterType date to an input header filter with a multi-date matcher', () => {
    renderGrid({
      columns: [
        { title: 'Risk Date', field: 'risk_date', headerFilter: true, headerFilterType: 'date' },
      ],
    });
    const col = (tabulatorCapture.instances[0].options.columns as {
      field: string;
      headerFilter: string | undefined;
      headerFilterFunc: unknown;
      headerFilterPlaceholder: unknown;
      headerFilterParams: unknown;
    }[]).find((c) => c.field === 'risk_date')!;
    expect(col.headerFilter).toBe('input');
    expect(typeof col.headerFilterFunc).toBe('function');
    expect(col.headerFilterPlaceholder).toBeTruthy();
    expect(col.headerFilterParams).toBeUndefined();
  });

  it('keeps list filters for dropdownable columns and input for text columns', () => {
    renderGrid({
      columns: [
        { title: 'Status', field: 'status', headerFilter: true, headerFilterType: 'list' },
        { title: 'Name', field: 'name', headerFilter: true, headerFilterType: 'input' },
      ],
    });
    const cols = tabulatorCapture.instances[0].options.columns as {
      field: string;
      headerFilter: string | undefined;
      headerFilterFunc: unknown;
      headerFilterParams: { values?: string[] } | undefined;
    }[];
    expect(cols.find((c) => c.field === 'status')?.headerFilter).toBe('list');
    expect(cols.find((c) => c.field === 'name')?.headerFilter).toBe('input');
    expect(typeof cols.find((c) => c.field === 'name')?.headerFilterFunc).toBe('function');
    expect(cols.find((c) => c.field === 'status')?.headerFilterParams?.values).toEqual(
      expect.arrayContaining(['active', 'approved', 'draft']),
    );
  });

  it('global search matches rows on any page, not just the current page', () => {
    renderGrid({ paginationSize: 2 });
    const search = screen.getByPlaceholderText(/search/i);
    fireEvent.change(search, { target: { value: 'Chino' } });
    const latest = tabulatorCapture.instances[tabulatorCapture.instances.length - 1];
    const data = latest.setDataArgs[latest.setDataArgs.length - 1];
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Chino Trousers');
  });

  it('filters a list-value column across pages, not just the current page', () => {
    renderGrid({
      paginationSize: 2,
      columns: [
        { title: 'Style #', field: 'style_number' },
        { title: 'Name', field: 'name' },
        { title: 'Buyer', field: 'buyer_name', headerFilter: true, headerFilterType: 'list' },
        { title: 'Status', field: 'status' },
      ],
    });
    const inst = tabulatorCapture.instances[0];
    act(() => {
      inst.setHeaderFilterValue('buyer_name', 'Zara');
    });
    const data = inst.setDataArgs[inst.setDataArgs.length - 1];
    expect(data).toHaveLength(2);
    expect(data.every((r) => r.buyer_name === 'Zara')).toBe(true);
  });

  it('filters a free-text column by substring', () => {
    renderGrid({
      paginationSize: 2,
      columns: [{ title: 'Name', field: 'name', headerFilter: true, headerFilterType: 'input' }],
    });
    const inst = tabulatorCapture.instances[0];
    act(() => {
      inst.setHeaderFilterValue('name', 'Shirt');
    });
    const data = inst.setDataArgs[inst.setDataArgs.length - 1];
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Linen Shirt');
  });

  it('matches a date column by year/month across the full dataset', () => {
    const dated = [
      { name: 'Dog Coat', risk_date: '2026-01-05T00:00:00Z', status: 'active' },
      { name: 'Rain Parka', risk_date: '2026-02-10T00:00:00Z', status: 'approved' },
      { name: 'Summer Vest', risk_date: '2026-01-20T00:00:00Z', status: 'draft' },
    ];
    render(
      <SpreadsheetGrid
        data={dated}
        columns={[
          { title: 'Name', field: 'name' },
          {
            title: 'Risk Date',
            field: 'risk_date',
            headerFilter: true,
            headerFilterType: 'date',
          },
        ]}
        paginationSize={2}
      />,
    );
    const inst = tabulatorCapture.instances[0];
    act(() => {
      inst.setHeaderFilterValue('risk_date', '2026-01');
    });
    const data = inst.setDataArgs[inst.setDataArgs.length - 1];
    expect(data).toHaveLength(2);
    expect(data.map((r) => r.name).sort()).toEqual(['Dog Coat', 'Summer Vest']);
  });

  it('restores all rows when the header filter is cleared', () => {
    renderGrid({
      paginationSize: 2,
      columns: [
        { title: 'Style #', field: 'style_number' },
        { title: 'Name', field: 'name' },
        { title: 'Buyer', field: 'buyer_name', headerFilter: true, headerFilterType: 'list' },
        { title: 'Status', field: 'status' },
      ],
    });
    const inst = tabulatorCapture.instances[0];
    act(() => {
      inst.setHeaderFilterValue('buyer_name', 'Zara');
    });
    const filtered = inst.setDataArgs[inst.setDataArgs.length - 1];
    expect(filtered.map((r) => r.buyer_name)).toEqual(['Zara', 'Zara']);
    act(() => {
      inst.setHeaderFilterValue('buyer_name', '');
    });
    const cleared = inst.setDataArgs[inst.setDataArgs.length - 1];
    expect(cleared.map((r) => r.buyer_name)).toEqual(['Zara', 'H&M']);
  });

  it('falls back to a CSV download when the SheetJS xlsx runtime is absent', () => {
    renderGrid({ exportable: true, title: 'Styles' });
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    const latest = tabulatorCapture.instances[tabulatorCapture.instances.length - 1];
    expect(latest.downloadArgs[0]).toBe('csv');
    expect(String(latest.downloadArgs[1])).toContain('Styles.csv');
  });

  it('lets a page override the built-in export via onExport', () => {
    const onExport = vi.fn();
    renderGrid({ exportable: true, onExport });
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});

describe('SpreadsheetGrid A6 row-actions menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tabulatorCapture.reset();
  });

  const spy = vi.fn();

  it('adds a per-row menu toggle column when rowActions is provided', () => {
    renderGrid({ rowActions: () => [] });
    const cols = tabulatorCapture.instances[0].options.columns as { field: string }[];
    expect(cols.find((c) => c.field === '__rowmenu')).toBeDefined();
    expect(screen.getAllByRole('button', { name: /row actions/i }).length).toBe(rows.length);
  });

  it('does not add a row-menu column when rowActions is omitted (additive, default off)', () => {
    renderGrid();
    const cols = tabulatorCapture.instances[0].options.columns as { field: string }[];
    expect(cols.find((c) => c.field === '__rowmenu')).toBeUndefined();
  });

  it('opens the menu on toggle and calls rowActions with the clicked row', () => {
    const rowActions = vi.fn((_row: Record<string, unknown>) => [
      { label: 'Open', action: spy },
      { label: 'Set Status', action: spy },
      { label: 'Repeat', disabled: true },
    ]);
    renderGrid({ rowActions });
    const toggles = screen.getAllByRole('button', { name: /row actions/i });
    fireEvent.click(toggles[1]);
    expect(rowActions).toHaveBeenCalledTimes(1);
    expect(rowActions.mock.calls[0][0]).toMatchObject(rows[1]);
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set Status' })).toBeInTheDocument();
  });

  it('dispatches the selected menu item action with the row data', () => {
    const onOpen = vi.fn();
    const onStatus = vi.fn();
    renderGrid({
      rowActions: (row: Record<string, unknown>) => [
        { label: 'Open', action: () => onOpen(row) },
        { label: 'Set Status', action: () => onStatus(row) },
      ],
    });
    const toggles = screen.getAllByRole('button', { name: /row actions/i });
    fireEvent.click(toggles[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Set Status' }));
    expect(onStatus).toHaveBeenCalledWith(expect.objectContaining(rows[0]));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('renders disabled menu items as disabled and does not fire them', () => {
    const action = vi.fn();
    renderGrid({
      rowActions: () => [
        { label: 'Open', action },
        { label: 'Repeat', disabled: true, action },
      ],
    });
    fireEvent.click(screen.getAllByRole('button', { name: /row actions/i })[0]);
    const repeat = screen.getByRole('button', { name: 'Repeat' });
    expect(repeat).toBeDisabled();
    fireEvent.click(repeat);
    expect(action).not.toHaveBeenCalled();
  });

  it('closes the menu after an action is selected', () => {
    renderGrid({
      rowActions: () => [{ label: 'Open', action: spy }],
    });
    fireEvent.click(screen.getAllByRole('button', { name: /row actions/i })[0]);
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument();
  });
});

describe('SpreadsheetGrid A4 export/print', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tabulatorCapture.reset();
  });

  it('applies the numericExport transform to rows written to the csv export fallback', () => {
    renderGrid({
      exportable: true,
      numericExport: (row: Record<string, unknown>) => ({ ...row, risk_overall: 3, risk_fabric: 1 }),
    });
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    const latest = tabulatorCapture.instances[tabulatorCapture.instances.length - 1];
    expect(latest.downloadArgs[0]).toBe('csv');
    expect(latest.setDataArgs.length).toBeGreaterThan(0);
    const exported = latest.setDataArgs[0];
    expect(exported[0].risk_overall).toBe(3);
    expect(exported[0].risk_fabric).toBe(1);
    expect(exported[1].risk_overall).toBe(3);
  });

  it('exports rows unchanged when numericExport is not provided', () => {
    renderGrid({ exportable: true });
    const setBefore = tabulatorCapture.instances[0].setDataCalls;
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    const latest = tabulatorCapture.instances[tabulatorCapture.instances.length - 1];
    expect(latest.downloadArgs[0]).toBe('csv');
    expect(latest.setDataCalls).toBe(setBefore);
  });

  it('shows a Print toolbar button when printable is enabled', () => {
    renderGrid({ printable: true, printTitle: 'Risk matrix' });
    expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
  });

it('opens a print-with-tick dialog listing rows with tick checkboxes and the title', () => {
    renderGrid({ printable: true, printTitle: 'Risk matrix' });
    fireEvent.click(screen.getByRole('button', { name: /print/i }));
    expect(screen.getByText('Risk matrix')).toBeInTheDocument();
    const dialog = within(screen.getByTestId('print-tick-dialog'));
    expect(dialog.getAllByRole('checkbox').length).toBe(rows.length);
    expect(dialog.getByText('Denim Jacket')).toBeInTheDocument();
  });

  it('triggers window.print from the print dialog', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    renderGrid({ printable: true, printTitle: 'Risk matrix' });
    fireEvent.click(screen.getByRole('button', { name: /print/i }));
    fireEvent.click(screen.getByRole('button', { name: /print rows/i }));
    expect(printSpy).toHaveBeenCalledOnce();
    printSpy.mockRestore();
  });
});
