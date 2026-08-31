import 'tabulator-tables/dist/css/tabulator.min.css';

import { useEffect, useImperativeHandle, useRef } from 'react';
import type { Ref } from 'react';
import { TabulatorFull } from 'tabulator-tables/dist/js/tabulator_esm.js';
import type { ColumnComponent, ColumnDefinition, RowComponent, Tabulator } from 'tabulator-tables';

export type SpreadsheetEditor = 'input' | 'number' | 'select' | 'autocomplete' | 'date' | 'textarea';

export interface SpreadsheetColumn {
  title: string;
  field: string;
  width?: number;
  editor?: boolean | SpreadsheetEditor;
  editorParams?: Record<string, unknown>;
  headerFilter?: boolean;
  hozAlign?: 'left' | 'center' | 'right';
  frozen?: boolean;
  bottomCalc?: 'sum' | 'max' | 'min' | 'avg' | 'count' | 'unique';
}

export interface SpreadsheetMenuItem {
  label: string;
  disabled?: boolean;
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
  headerMenu?: (column: unknown) => SpreadsheetMenuItem[];
}

export default function SpreadsheetGrid({
  data,
  columns,
  height = 400,
  layout = 'fitColumns',
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
  headerMenu,
}: SpreadsheetGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<Tabulator | null>(null);

  const callbacksRef = useRef({ onRowClick, onCellEdited });
  callbacksRef.current = { onRowClick, onCellEdited };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const table = new TabulatorFull(el, {
      data,
      columns: columns.map((c) => ({
        title: c.title,
        field: c.field,
        width: c.width,
        hozAlign: c.hozAlign ?? ('left' as const),
        frozen: c.frozen,
        headerFilter: c.headerFilter ? true : undefined,
        headerFilterClearButton: c.headerFilter ? true : undefined,
        headerFilterParams: undefined,
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
      })),
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
      callbacksRef.current.onRowClick?.(row.getData());
    });
    table.on('cellEdited', (cell) => {
      callbacksRef.current.onCellEdited?.(cell.getField(), cell.getValue(), cell.getRow().getData());
    });

    tableRef.current = table;
    return () => {
      table.destroy();
      tableRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    tableRef.current?.setData(data);
  }, [data]);

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

  return <div data-testid="spreadsheet-grid" ref={containerRef} />;
}