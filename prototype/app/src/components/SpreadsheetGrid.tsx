import 'tabulator-tables/dist/css/tabulator.min.css';
import './SpreadsheetGrid.theme.css';

import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { Ref } from 'react';
import { TabulatorFull } from 'tabulator-tables/dist/js/tabulator_esm.js';
import type { ColumnComponent, ColumnDefinition, RowComponent, Tabulator } from 'tabulator-tables';
import { matchDateFilter } from './gridFilters';

export type SpreadsheetEditor = 'input' | 'number' | 'select' | 'autocomplete' | 'date' | 'textarea';

export type SpreadsheetHeaderFilterType = 'input' | 'list' | 'date';

function matchesHeaderFilter(
  type: SpreadsheetHeaderFilterType,
  headerValue: string,
  rowValue: unknown,
): boolean {
  const h = headerValue.trim();
  if (!h) return true;
  if (type === 'date') return matchDateFilter(h, rowValue);
  const tokens = h
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return true;
  const row = String(rowValue ?? '');
  if (type === 'list') {
    const want = tokens.map((t) => t.toLowerCase());
    return want.includes(row.trim().toLowerCase());
  }
  const lower = row.toLowerCase();
  return tokens.some((t) => lower.includes(t.toLowerCase()));
}

const acceptAllFilter = () => true;

export interface SpreadsheetColumn {
  title: string;
  field: string;
  width?: number;
  minWidth?: number;
  editor?: boolean | SpreadsheetEditor;
  editorParams?: Record<string, unknown>;
  headerFilter?: boolean;
  headerFilterType?: SpreadsheetHeaderFilterType;
  hozAlign?: 'left' | 'center' | 'right';
  frozen?: boolean;
  bottomCalc?: 'sum' | 'max' | 'min' | 'avg' | 'count' | 'unique';
}

export interface SpreadsheetActionCallbacks {
  onAdd?: () => void;
  onEdit?: (row: Record<string, unknown>) => void;
  onDelete?: (row: Record<string, unknown>) => void;
  onView?: (row: Record<string, unknown>) => void;
}

export interface SpreadsheetMenuItem {
  label: string;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  action?: (...args: unknown[]) => void;
}

export interface SpreadsheetGridHandle {
  undo(): void;
  redo(): void;
  downloadXlsx(fileName?: string): void;
}

type SpreadsheetLayout = 'fitColumns' | 'fitData' | 'fitDataFill' | 'fitDataStretch';

interface SpreadsheetGridProps {
  data: Record<string, unknown>[];
  columns: SpreadsheetColumn[];
  height?: string | number;
  layout?: SpreadsheetLayout;
  movableColumns?: boolean;
  selectableRows?: number | boolean;
  groupBy?: string;
  groupHeader?: (value: unknown, count: number) => string;
  clipboardPaste?: boolean;
  history?: boolean;
  gridRef?: Ref<SpreadsheetGridHandle>;
  onRowClick?: (row: Record<string, unknown>) => void;
  onCellEdited?: (field: string, value: unknown, rowData: Record<string, unknown>) => void;
  rowContextMenu?: (row: Record<string, unknown>) => SpreadsheetMenuItem[];
  rowActions?: (row: Record<string, unknown>) => SpreadsheetMenuItem[];
  headerMenu?: (column: unknown) => SpreadsheetMenuItem[];
  toolbar?: boolean;
  title?: string;
  exportable?: boolean;
  onExport?: () => void;
  numericExport?: (row: Record<string, unknown>) => Record<string, unknown>;
  printable?: boolean;
  printTitle?: string;
  columnChooser?: boolean;
  paginationSize?: number;
  actionColumn?: boolean;
  onAdd?: () => void;
  onEdit?: (row: Record<string, unknown>) => void;
  onDelete?: (row: Record<string, unknown>) => void;
  onView?: (row: Record<string, unknown>) => void;
  loading?: boolean;
}

export default function SpreadsheetGrid({
  data,
  columns,
  height = 400,
  layout = 'fitData',
  movableColumns = true,
  selectableRows = 1,
  groupBy,
  groupHeader,
  clipboardPaste,
  history,
  gridRef,
  onRowClick,
  onCellEdited,
  rowContextMenu,
  rowActions,
  headerMenu,
  toolbar = false,
  title = 'Grid',
  exportable = false,
  onExport,
  numericExport,
  printable = false,
  printTitle = 'Print',
  columnChooser = false,
  paginationSize,
  actionColumn = false,
  onAdd,
  onEdit,
  onDelete,
  onView,
  loading = false,
}: SpreadsheetGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<Tabulator | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageRef = useRef(1);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [allRows, setAllRows] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [headerFilters, setHeaderFilters] = useState<Record<string, string>>({});
  const headerFiltersRef = useRef<Record<string, string>>({});

  const callbacksRef = useRef({ onRowClick, onCellEdited });
  callbacksRef.current = { onRowClick, onCellEdited };

  const numericExportRef = useRef(numericExport);
  numericExportRef.current = numericExport;

  const rowActionsRef = useRef<
    ((row: Record<string, unknown>) => SpreadsheetMenuItem[] | undefined) | undefined
  >(rowActions);
  rowActionsRef.current = rowActions;

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenColumns.includes(c.field)),
    [columns, hiddenColumns],
  );

  const pageSize = paginationSize ?? data.length;
  const searchActive = searchValue.trim().length > 0;
  const filterActive = Object.keys(headerFilters).length > 0;
  const viewShowsAll = allRows || searchActive || filterActive;

  const totalPages = viewShowsAll ? 1 : Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageSlice = useMemo(
    () =>
      viewShowsAll
        ? data
        : data.slice(Math.max(0, safePage - 1) * pageSize, safePage * pageSize),
    [data, viewShowsAll, safePage, pageSize],
  );

  useEffect(() => {
    if (pageRef.current !== 1) {
      pageRef.current = 1;
      setPage(1);
    }
  }, [data, paginationSize, allRows]);

  const allGridData: Record<string, unknown>[] = useMemo(
    () =>
      data.map((r) => ({
        ...r,
        __search: Object.values(r).map((v) => String(v ?? '')).join(' '),
      })),
    [data],
  );

  const filteredAll = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    return allGridData.filter((r) => {
      if (q && !String(r.__search ?? '').toLowerCase().includes(q)) return false;
      for (const col of visibleColumns) {
        if (!col.headerFilter) continue;
        const h = headerFilters[col.field];
        if (!h) continue;
        const type: SpreadsheetHeaderFilterType = col.headerFilterType ?? 'list';
        if (!matchesHeaderFilter(type, h, r[col.field])) return false;
      }
      return true;
    });
  }, [allGridData, searchValue, headerFilters, visibleColumns]);

  const pageSliceUsed = useMemo(
    () => (viewShowsAll ? filteredAll : pageSlice),
    [viewShowsAll, filteredAll, pageSlice],
  );

  const gridData = useMemo(
    () =>
      pageSliceUsed.map((r) => {
        const searchSrc =
          allGridData.find((g) => g.__id === r.__id) ?? allGridData.find((g) => g.id === r.id);
        return {
          ...r,
          __search:
            (searchSrc as { __search?: string })?.__search ??
            Object.values(r).map((v) => String(v ?? '')).join(' '),
        };
      }),
    [pageSliceUsed, allGridData],
  );

  const listValuesByField = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of visibleColumns) {
      if (col.headerFilter && (col.headerFilterType ?? 'list') === 'list') {
        map[col.field] = Array.from(
          new Set(
            allGridData
              .map((r) => String(r[col.field] ?? '').trim())
              .filter((v) => v.length > 0),
          ),
        ).sort((a, b) => a.localeCompare(b));
      }
    }
    return map;
  }, [visibleColumns, allGridData]);

  const lastFedRef = useRef<Record<string, unknown>[]>(gridData);

  const reconcileHeaderFilters = (table: Tabulator) => {
    const read = (table as unknown as {
      getHeaderFilterValue?(field: string): unknown;
    }).getHeaderFilterValue;
    if (typeof read !== 'function') return;
    const next: Record<string, string> = {};
    for (const col of visibleColumns) {
      if (!col.headerFilter) continue;
      const value = read.call(table, col.field);
      if (Array.isArray(value)) {
        const joined = value.join(',').trim();
        if (joined) next[col.field] = joined;
      } else if (typeof value === 'string' && value.trim()) {
        next[col.field] = value;
      }
    }
    const prev = headerFiltersRef.current;
    const keysEqual =
      Object.keys(prev).length === Object.keys(next).length &&
      Object.keys(prev).every((k) => next[k] === prev[k]);
    if (!keysEqual) {
      headerFiltersRef.current = next;
      setHeaderFilters(next);
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const rowMap = new WeakMap<HTMLElement, Record<string, unknown>>();
    let activeMenu: { el: HTMLElement; trigger: HTMLElement } | null = null;

    const menuItemsFor = (rowData: Record<string, unknown>): SpreadsheetMenuItem[] => {
      const items: SpreadsheetMenuItem[] = [];
      if (onView) items.push({ label: 'View', action: () => onView(rowData) });
      if (onEdit) items.push({ label: 'Edit', action: () => onEdit(rowData) });
      if (onDelete) items.push({ label: 'Delete', variant: 'danger', action: () => onDelete(rowData) });
      items.push(...(rowActionsRef.current?.(rowData) ?? []));
      return items;
    };

    const closeRowMenu = () => {
      if (!activeMenu) return;
      activeMenu.el.remove();
      activeMenu.trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('mousedown', onMenuOutsideClick, true);
      window.removeEventListener('scroll', closeRowMenu, true);
      window.removeEventListener('resize', closeRowMenu);
      activeMenu = null;
    };

    const onMenuOutsideClick = (e: MouseEvent) => {
      if (!activeMenu) return;
      const target = e.target as Node;
      if (activeMenu.el.contains(target) || activeMenu.trigger.contains(target)) return;
      closeRowMenu();
    };

    const openRowMenu = (trigger: HTMLElement, items: SpreadsheetMenuItem[]) => {
      closeRowMenu();
      if (items.length === 0) return;
      const rowData = rowMap.get(trigger) ?? {};
      const menu = document.createElement('div');
      menu.className = 'grid-row-menu';
      menu.setAttribute('role', 'menu');
      items.forEach((item) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.disabled = item.disabled ?? false;
        b.className =
          'grid-row-menu-item' + (item.variant === 'danger' ? ' grid-row-menu-item--danger' : '');
        b.setAttribute('role', 'menuitem');
        b.textContent = item.label;
        if (!item.disabled && item.action) {
          b.addEventListener('click', () => {
            closeRowMenu();
            item.action?.(rowData);
          });
        }
        menu.appendChild(b);
      });
      menu.addEventListener('keydown', (e) => {
        const buttons = Array.from(
          menu.querySelectorAll<HTMLButtonElement>('.grid-row-menu-item:not(:disabled)'),
        );
        if (e.key === 'Escape') {
          e.preventDefault();
          const triggerEl = activeMenu?.trigger;
          closeRowMenu();
          triggerEl?.focus();
          return;
        }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const step = e.key === 'ArrowDown' ? 1 : -1;
        buttons[(current + step + buttons.length) % buttons.length]?.focus();
      });
      document.body.appendChild(menu);
      const rect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const gap = 4;
      let top = rect.bottom + gap;
      if (top + menuRect.height > window.innerHeight - 8) {
        top = Math.max(8, rect.top - gap - menuRect.height);
      }
      const left = Math.max(8, Math.min(rect.right - menuRect.width, window.innerWidth - menuRect.width - 8));
      menu.style.top = `${Math.round(top)}px`;
      menu.style.left = `${Math.round(left)}px`;
      trigger.setAttribute('aria-expanded', 'true');
      activeMenu = { el: menu, trigger };
      document.addEventListener('mousedown', onMenuOutsideClick, true);
      window.addEventListener('scroll', closeRowMenu, true);
      window.addEventListener('resize', closeRowMenu);
      menu.querySelector<HTMLButtonElement>('.grid-row-menu-item:not(:disabled)')?.focus({ preventScroll: true });
    };

    const actionFormatter: ColumnDefinition['formatter'] = (cell) => {
      const rowData = cell.getRow().getData() as Record<string, unknown>;
      const wrap = document.createElement('div');
      wrap.className = 'grid-row-actions';
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'grid-row-actions-trigger';
      trigger.dataset.gridAction = 'actions-menu';
      trigger.dataset.rowId = String(rowData['__id'] ?? '');
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.title = 'Actions';
      trigger.textContent = 'Actions';
      const caret = document.createElement('span');
      caret.className = 'grid-row-actions-caret';
      caret.setAttribute('aria-hidden', 'true');
      caret.textContent = '\u25BE';
      trigger.appendChild(document.createTextNode(' '));
      trigger.appendChild(caret);
      wrap.appendChild(trigger);
      rowMap.set(trigger, rowData);
      return wrap;
    };

    const actionCol = actionColumn || rowActions
      ? {
          formatter: actionFormatter,
          field: '__actions',
          title: 'Actions',
          hozAlign: 'right' as const,
          width: 120,
          headerSort: false,
          cssClass: 'grid-row-actions-cell',
        }
      : null;

    const tableColumns: ColumnDefinition[] = [
      ...(actionCol ? [actionCol] : []),
      ...visibleColumns.map((c) => {
        const filterType: SpreadsheetHeaderFilterType = c.headerFilterType ?? 'list';
        const isDateFilter = c.headerFilter && filterType === 'date';
        const isListFilter = c.headerFilter && filterType === 'list';
        return {
          title: c.title,
          field: c.field,
          width: c.width,
          minWidth: c.minWidth ?? 120,
          hozAlign: c.hozAlign ?? ('left' as const),
          frozen: c.frozen,
          headerFilter: c.headerFilter
            ? (filterType === 'list' ? ('list' as const) : ('input' as const))
            : undefined,
          headerFilterFunc: c.headerFilter ? acceptAllFilter : undefined,
          headerFilterPlaceholder: isDateFilter ? 'YYYY-MM-DD, ...' : undefined,
          headerFilterClearButton: c.headerFilter ? true : undefined,
          headerFilterParams: isListFilter
            ? { values: listValuesByField[c.field] ?? [] }
            : undefined,
          bottomCalc: c.bottomCalc,
          headerMenu: headerMenu
            ? (_e: MouseEvent, column: ColumnComponent) => headerMenu(column)
            : undefined,
          editor:
            (c.editor === true
              ? ('input' as const)
              : typeof c.editor === 'string'
                ? c.editor
                : undefined) as ColumnDefinition['editor'],
          editorParams: c.editorParams,
        } as ColumnDefinition;
      }),
    ];

    const table = new TabulatorFull(el, {
      data: gridData,
      columns: tableColumns,
      height,
      layout,
      movableColumns,
      selectableRows,
      index: '__id',
      renderVertical: 'basic',
      groupBy: groupBy ?? undefined,
      groupHeader: groupHeader
        ? (value: unknown, count: number) => groupHeader(value, count)
        : undefined,
      clipboard: clipboardPaste ? true : undefined,
      clipboardPasteAction: clipboardPaste ? ('range' as const) : undefined,
      history: history ? true : undefined,
      rowContextMenu: rowContextMenu
        ? (_e: MouseEvent, row: RowComponent) => rowContextMenu(row.getData())
        : undefined,
    });

    table.on('rowClick', (_e, row) => {
      const target = (_e as MouseEvent | undefined)?.target as HTMLElement | null | undefined;
      if (target?.closest('[data-grid-action]')) return;
      callbacksRef.current.onRowClick?.(row.getData());
    });
    table.on('cellEdited', (cell) => {
      callbacksRef.current.onCellEdited?.(cell.getField(), cell.getValue(), cell.getRow().getData());
    });
    table.on('cellClick', (_e, cell) => {
      const target = (_e as MouseEvent).target as HTMLElement | null;
      const actionEl = target?.closest('[data-grid-action]') as HTMLElement | null;
      if (actionEl?.dataset.gridAction !== 'actions-menu') return;
      if (activeMenu?.trigger === actionEl) {
        closeRowMenu();
        return;
      }
      const menuRow = rowMap.get(actionEl) ?? cell.getRow().getData();
      openRowMenu(actionEl, menuItemsFor(menuRow));
    });

    table.on('dataFiltered', () => {
      reconcileHeaderFilters(table);
    });

    Object.entries(headerFiltersRef.current).forEach(([field, value]) => {
      if (typeof (table as unknown as { setHeaderFilterValue?: unknown }).setHeaderFilterValue === 'function') {
        (table as unknown as { setHeaderFilterValue(field: string, value: string): void }).setHeaderFilterValue(
          field,
          value,
        );
      }
    });

    tableRef.current = table;
    return () => {
      closeRowMenu();
      table.destroy();
      tableRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleColumns, actionColumn, rowActions, paginationSize, allRows, allGridData, listValuesByField]);

  useEffect(() => {
    const table = tableRef.current as (Tabulator & { setData?: unknown }) | null;
    if (!table) return;
    if (typeof table.setData !== 'function') return;
    if (lastFedRef.current === gridData) return;
    lastFedRef.current = gridData;
    (table as { setData(data: Record<string, unknown>[]): void }).setData(gridData);
  }, [gridData]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }
    const table = tableRef.current as (Tabulator & {
      setData(data: Record<string, unknown>[]): void;
    }) | null;
    if (!table) return;
    const hasXlsx = Boolean((window as unknown as { XLSX?: unknown }).XLSX);
    const exportType = hasXlsx ? 'xlsx' : 'csv';
    const fileName = `${title}.${exportType}`;
    const options = hasXlsx ? { sheetName: title } : undefined;
    if (numericExportRef.current) {
      const transformed = gridData.map((r) => numericExportRef.current?.(r) ?? r);
      table.setData(transformed);
      try {
        table.download(exportType, fileName, options);
      } finally {
        table.setData(gridData);
      }
      return;
    }
    table.download(exportType, fileName, options);
  };

  const handleGroupBy = (field: string) => {
    setShowGroupMenu(false);
    const table = tableRef.current as (Tabulator & { setGroupBy?(field: string | undefined): void }) | null;
    if (field) {
      table?.setGroupBy?.(field);
    } else {
      table?.setGroupBy?.(undefined);
    }
  };

  const toggleColumn = (field: string) => {
    setHiddenColumns((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  };

  useImperativeHandle(
    gridRef,
    () => ({
      undo: () => {
        tableRef.current?.undo();
      },
      redo: () => {
        tableRef.current?.redo();
      },
      downloadXlsx: (fileName = 'material.xlsx') => {
        tableRef.current?.download('xlsx', fileName, { sheetName: 'Material Breakdown' });
      },
    }),
  );

  const startIdx = viewShowsAll ? (gridData.length === 0 ? 0 : 1) : data.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = viewShowsAll ? gridData.length : Math.min(safePage * pageSize, data.length);

  return (
    <div>
      {toolbar && (
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            {title && <span className="text-sm font-medium text-heading">{title}</span>}
            <input
              type="text"
              data-testid="grid-search"
              placeholder="Search..."
              onChange={(e) => handleSearch(e.target.value)}
              className="px-3 py-1.5 bg-input border border-input-border rounded-lg text-sm text-heading placeholder-faint focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            {columnChooser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColumnsMenu((v) => !v)}
                  className="px-3 py-1.5 text-sm text-body border border-input-border rounded-lg hover:text-heading transition-colors"
                >
                  Columns
                </button>
                {showColumnsMenu && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-surface border border-input-border rounded-lg shadow-xl p-2 min-w-[180px] space-y-1">
                    {columns.map((c) => (
                      <label key={c.field} className="flex items-center gap-2 px-2 py-1 text-sm text-body cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!hiddenColumns.includes(c.field)}
                          onChange={() => toggleColumn(c.field)}
                        />
                        {c.title}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowGroupMenu((v) => !v)}
                className="px-3 py-1.5 text-sm text-body border border-input-border rounded-lg hover:text-heading transition-colors"
              >
                Group by
              </button>
              {showGroupMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-surface border border-input-border rounded-lg shadow-xl p-2 min-w-[180px] space-y-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleGroupBy('')}
                    className="block w-full text-left px-2 py-1 text-sm text-body hover:bg-surface-alt rounded"
                  >
                    No grouping
                  </button>
                  {visibleColumns.map((c) => (
                    <button
                      key={c.field}
                      type="button"
                      role="menuitem"
                      onClick={() => handleGroupBy(c.field)}
                      className="block w-full text-left px-2 py-1 text-sm text-body hover:bg-surface-alt rounded"
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {exportable && (
              <button
                type="button"
                onClick={handleExport}
                className="px-3 py-1.5 text-sm text-body border border-input-border rounded-lg hover:text-heading transition-colors"
              >
                Export
              </button>
            )}
            {printable && (
              <button
                type="button"
                onClick={() => setShowPrintDialog(true)}
                className="px-3 py-1.5 text-sm text-body border border-input-border rounded-lg hover:text-heading transition-colors"
              >
                Print
              </button>
            )}
            {onAdd && (
              <button
                type="button"
                onClick={onAdd}
                className="px-3 py-1.5 text-sm text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
              >
                + Add
              </button>
            )}
          </div>
        </div>
      )}

      <div data-testid="spreadsheet-grid" ref={containerRef} />
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
        </div>
      )}

      {toolbar && paginationSize && data.length > 0 && (
        <div className="flex items-center justify-between mt-2 text-sm text-muted">
          <span>
            Showing {startIdx}-{endIdx} of {viewShowsAll ? gridData.length : data.length}
          </span>
          <div className="flex items-center gap-2">
            {!allRows &&
              Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`px-2 py-1 rounded ${p === safePage ? 'bg-emerald-600 text-white' : 'hover:bg-surface-alt'}`}
                >
                  {p}
                </button>
              ))}
            {totalPages > 1 && (
              <button
                type="button"
                onClick={() => setAllRows((v) => !v)}
                className="px-2 py-1 rounded hover:bg-surface-alt capitalize"
              >
                {allRows ? 'Paged view' : 'All rows'}
              </button>
            )}
          </div>
        </div>
      )}

      {showPrintDialog && printable && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div
            data-testid="print-tick-dialog"
            className="w-full max-w-3xl max-h-[80vh] overflow-auto bg-surface border border-input-border rounded-xl shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-input-border">
              <h3 className="text-sm font-medium text-heading">{printTitle}</h3>
              <button
                type="button"
                onClick={() => setShowPrintDialog(false)}
                aria-label="Close print dialog"
                className="text-sm text-body hover:text-heading"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <div className="overflow-auto">
                <table className="w-full text-sm text-body">
                  <thead>
                    <tr className="border-b border-input-border">
                      <th className="text-left py-2 pr-2 w-8">☑</th>
                      {visibleColumns.map((c) => (
                        <th key={c.field} className="text-left py-2 pr-3 font-medium text-muted">
                          {c.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((r, i) => (
                      <tr key={i} className="border-b border-border-subtle">
                        <td className="py-2 pr-2">
                          <input type="checkbox" defaultChecked aria-label={`tick row ${i + 1}`} />
                        </td>
                        {visibleColumns.map((c) => (
                          <td key={c.field} className="py-2 pr-3">
                            {String(r[c.field] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowPrintDialog(false)}
                  className="px-3 py-1.5 text-sm text-body border border-input-border rounded-lg hover:text-heading transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    setShowPrintDialog(false);
                  }}
                  className="px-3 py-1.5 text-sm text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                >
                  Print rows
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}