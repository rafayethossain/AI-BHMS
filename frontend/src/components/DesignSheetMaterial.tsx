import { useRef } from 'react';
import SpreadsheetGrid from './SpreadsheetGrid';
import type { SpreadsheetColumn, SpreadsheetGridHandle, SpreadsheetMenuItem } from './SpreadsheetGrid';

export type MaterialItem = Record<string, unknown>;

export interface MaterialHandlers {
  onItemEdit?: (field: string, value: unknown, row: MaterialItem) => void;
  onItemAdd?: (row?: MaterialItem) => void;
  onItemDelete?: (row: MaterialItem) => void;
  onItemSelect?: (row: MaterialItem) => void;
}

function buildMaterialColumns(): SpreadsheetColumn[] {
  return [
    { title: 'Type', field: 'type', width: 120, editor: 'input' },
    { title: 'Description/Code', field: 'description_code', width: 250, editor: 'input' },
    { title: 'Location', field: 'location', width: 140, editor: 'input' },
    { title: 'Supplier', field: 'supplier', width: 130, editor: 'input' },
    { title: 'Colour', field: 'colour', width: 110, editor: 'input' },
    { title: 'W/Size', field: 'width_size', width: 110, editor: 'input' },
    { title: 'Qty', field: 'qty', width: 100, hozAlign: 'right', editor: 'number', bottomCalc: 'sum' },
    { title: 'Match', field: 'match', width: 110, editor: 'input' },
  ];
}

function buildMaterialRowContextMenu(
  row: MaterialItem,
  handlers: MaterialHandlers,
): SpreadsheetMenuItem[] {
  return [
    { label: 'Add Row', action: () => handlers.onItemAdd?.() },
    { label: 'Copy Row', action: () => handlers.onItemAdd?.(row) },
    { label: 'Delete Row', action: () => handlers.onItemDelete?.(row) },
  ];
}

function buildMaterialHeaderMenu(column: unknown): SpreadsheetMenuItem[] {
  const col = column as
    | {
        hide?: () => void;
        getTable?: () => {
          getColumns?: () => { getTitle?: () => string; toggle?: () => void; show?: () => void }[];
        };
      }
    | undefined;
  const columns = col?.getTable?.().getColumns?.() ?? [];
  return [
    { label: 'Hide Column', action: () => col?.hide?.() },
    ...columns.map(
      (c): SpreadsheetMenuItem => ({
        label: `Toggle ${c.getTitle?.() ?? 'Column'}`,
        action: () => c.toggle?.(),
      }),
    ),
    {
      label: 'Show All Columns',
      action: () => columns.forEach((c) => c.show?.()),
    },
  ];
}

export default function DesignSheetMaterial({
  bomItems,
  onItemEdit,
  onItemAdd,
  onItemDelete,
  onItemSelect,
}: {
  bomItems: MaterialItem[];
} & MaterialHandlers) {
  const gridRef = useRef<SpreadsheetGridHandle>(null);

  return (
    <section data-testid="material-section">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-800">Material Breakdown</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => gridRef.current?.undo()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => gridRef.current?.redo()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Redo
          </button>
          <button
            type="button"
            onClick={() => gridRef.current?.downloadXlsx('material-breakdown.xlsx')}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => onItemAdd?.()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add Item
          </button>
        </div>
      </div>
      <SpreadsheetGrid
        data={bomItems}
        columns={buildMaterialColumns()}
        selectableRows={1}
        groupBy="type"
        groupHeader={(value, count) => `${String(value ?? 'No Type')} · ${count} item${count === 1 ? '' : 's'}`}
        clipboardPaste
        history
        gridRef={gridRef}
        onRowClick={(row) => onItemSelect?.(row)}
        onCellEdited={(field, value, row) => onItemEdit?.(field, value, row)}
        rowContextMenu={(row) => buildMaterialRowContextMenu(row, { onItemAdd, onItemDelete })}
        headerMenu={(column) => buildMaterialHeaderMenu(column)}
      />
    </section>
  );
}