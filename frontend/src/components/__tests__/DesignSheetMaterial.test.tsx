import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const gridCapture = vi.hoisted(() => ({
  current: null as null | {
    data: Record<string, unknown>[];
    columns: {
      title: string;
      field: string;
      editor?: unknown;
      editorParams?: Record<string, unknown>;
      bottomCalc?: unknown;
      headerFilter?: boolean;
      headerFilterType?: string;
    }[];
    groupBy?: string;
    groupHeader?: (value: unknown, count: number) => string;
    clipboardPaste?: boolean;
    history?: boolean;
    gridRef?: { current: null | {
      undo: () => void;
      redo: () => void;
      downloadXlsx: (fileName?: string) => void;
    } };
    onRowClick?: (row: Record<string, unknown>) => void;
    onCellEdited?: (field: string, value: unknown, row: Record<string, unknown>) => void;
    rowContextMenu?: (row: Record<string, unknown>) => { label: string; action?: () => void }[];
    headerMenu?: (column: unknown) => { label: string; action?: () => void }[];
    toolbar?: boolean;
    title?: string;
    exportable?: boolean;
    onExport?: () => void;
    printable?: boolean;
    printTitle?: string;
    columnChooser?: boolean;
    paginationSize?: number;
    actionColumn?: boolean;
    onDelete?: (row: Record<string, unknown>) => void;
    loading?: boolean;
  },
}));

vi.mock('../SpreadsheetGrid', () => {
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      gridCapture.current = props as typeof gridCapture.current;
      return <div data-testid="grid-mock" />;
    },
  };
});

import DesignSheetMaterial from '../DesignSheetMaterial';

const bomItems = [
  { id: '1', type: 'Cloth', description_code: 'SANDWASH LINEN XK-529', supplier: 'ALICE-', qty: 1.67 },
  { id: '2', type: 'Trims', description_code: 'BUTTON 4 HOLES FV9757', supplier: 'FOURSEASONS', qty: 2 },
];

const supplierOptions = [
  { id: 'v1', name: 'FOURSEASONS', code: 'FS1' },
  { id: 'v2', name: 'ALICE-', code: 'AL2' },
];

describe('DesignSheetMaterial', () => {
  beforeEach(() => {
    gridCapture.current = null;
    vi.clearAllMocks();
  });

  it('renders the Material Breakdown header and an Add Item button', () => {
    render(<DesignSheetMaterial bomItems={bomItems} />);
    expect(screen.getByText('Material Breakdown')).toBeInTheDocument();
    expect(screen.getByText('+ Add Item')).toBeInTheDocument();
  });

  it('forwards the material columns with inline editors, a summed Qty and a header filter on every column', () => {
    render(<DesignSheetMaterial bomItems={bomItems} />);
    const titles = gridCapture.current?.columns.map((c) => c.title);
    expect(titles).toEqual([
      'Type',
      'Description/Code',
      'Location',
      'Supplier',
      'Colour',
      'W/Size',
      'Qty',
      'Match',
    ]);
    const qtyCol = gridCapture.current?.columns.find((c) => c.field === 'qty');
    expect(qtyCol?.editor).toBe('number');
    expect(qtyCol?.bottomCalc).toBe('sum');
    for (const c of gridCapture.current?.columns ?? []) {
      if (c.field !== 'qty') expect(c.editor).toBeTruthy();
      expect(c.headerFilter).toBe(true);
      expect(c.headerFilterType).toBeTruthy();
    }
  });

  it('renders the Supplier column as a select editor fed from supplierOptions', () => {
    render(<DesignSheetMaterial bomItems={bomItems} supplierOptions={supplierOptions} />);
    const supplier = gridCapture.current?.columns.find((c) => c.field === 'supplier');
    expect(supplier?.editor).toBe('select');
    expect(supplier?.editorParams).toEqual({
      values: { FOURSEASONS: 'FOURSEASONS', 'ALICE-': 'ALICE-' },
    });
  });

  it('forwards the bomItems as grid data', () => {
    render(<DesignSheetMaterial bomItems={bomItems} />);
    expect(gridCapture.current?.data).toEqual(bomItems);
  });

  it('calls onItemAdd when the Add Item button is clicked', () => {
    const onItemAdd = vi.fn();
    render(<DesignSheetMaterial bomItems={bomItems} onItemAdd={onItemAdd} />);
    fireEvent.click(screen.getByText('+ Add Item'));
    expect(onItemAdd).toHaveBeenCalled();
  });

  it('forwards cell edits to onItemEdit', () => {
    const onItemEdit = vi.fn();
    render(<DesignSheetMaterial bomItems={bomItems} onItemEdit={onItemEdit} />);
    gridCapture.current?.onCellEdited?.('qty', 3, bomItems[0]);
    expect(onItemEdit).toHaveBeenCalledWith('qty', 3, bomItems[0]);
  });

  it('forwards row selection to onItemSelect', () => {
    const onItemSelect = vi.fn();
    render(<DesignSheetMaterial bomItems={bomItems} onItemSelect={onItemSelect} />);
    gridCapture.current?.onRowClick?.(bomItems[1]);
    expect(onItemSelect).toHaveBeenCalledWith(bomItems[1]);
  });

  it('builds a row context menu with Add, Copy and Delete Row', () => {
    const onItemAdd = vi.fn();
    const onItemDelete = vi.fn();
    render(
      <DesignSheetMaterial
        bomItems={bomItems}
        onItemAdd={onItemAdd}
        onItemDelete={onItemDelete}
      />,
    );
    const menu = gridCapture.current?.rowContextMenu?.(bomItems[0]);
    expect(menu?.map((m) => m.label)).toEqual(['Add Row', 'Copy Row', 'Delete Row']);
    menu?.[0].action?.();
    expect(onItemAdd).toHaveBeenCalledWith();
    menu?.[1].action?.();
    expect(onItemAdd).toHaveBeenLastCalledWith(bomItems[0]);
    menu?.[2].action?.();
    expect(onItemDelete).toHaveBeenCalledWith(bomItems[0]);
  });

  it('builds a header menu to hide, show or toggle columns', () => {
    const cols = [
      { getTitle: () => 'Type', toggle: vi.fn(), hide: vi.fn(), show: vi.fn() },
      { getTitle: () => 'Qty', toggle: vi.fn(), hide: vi.fn(), show: vi.fn() },
    ];
    const table = { getColumns: () => cols };
    const fakeColumn = { hide: vi.fn(), getTable: () => table };
    render(<DesignSheetMaterial bomItems={bomItems} />);
    const menu = gridCapture.current?.headerMenu?.(fakeColumn);
    expect(menu?.map((m) => m.label)).toEqual([
      'Hide Column',
      'Toggle Type',
      'Toggle Qty',
      'Show All Columns',
    ]);
    menu?.[0].action?.();
    expect(fakeColumn.hide).toHaveBeenCalled();
    menu?.[1].action?.();
    expect(cols[0].toggle).toHaveBeenCalled();
    menu?.[2].action?.();
    expect(cols[1].toggle).toHaveBeenCalled();
    menu?.[3].action?.();
    expect(cols[0].show).toHaveBeenCalled();
    expect(cols[1].show).toHaveBeenCalled();
  });

  it('forwards grouping, clipboard paste, history and an instance ref to the grid', () => {
    render(<DesignSheetMaterial bomItems={bomItems} />);
    const props = gridCapture.current;
    expect(props?.groupBy).toBe('type');
    expect(props?.clipboardPaste).toBe(true);
    expect(props?.history).toBe(true);
    expect(props?.gridRef).toBeTruthy();
    expect(props?.groupHeader?.('Cloth', 2)).toBe('Cloth · 2 items');
    expect(props?.groupHeader?.('Trims', 1)).toBe('Trims · 1 item');
  });

  it('forwards the standard grid chrome: toolbar, export, print, columns and pagination', () => {
    render(<DesignSheetMaterial bomItems={bomItems} loading />);
    const props = gridCapture.current;
    expect(props?.toolbar).toBe(true);
    expect(props?.title).toBe('Material Breakdown');
    expect(props?.exportable).toBe(true);
    expect(props?.printable).toBe(true);
    expect(props?.printTitle).toBe('Material Breakdown');
    expect(props?.columnChooser).toBe(true);
    expect(props?.paginationSize).toBe(20);
    expect(props?.loading).toBe(true);
  });

  it('wires the action-column delete button to onItemDelete', () => {
    const onItemDelete = vi.fn();
    render(<DesignSheetMaterial bomItems={bomItems} onItemDelete={onItemDelete} />);
    const props = gridCapture.current;
    expect(props?.actionColumn).toBe(true);
    props?.onDelete?.(bomItems[0]);
    expect(onItemDelete).toHaveBeenCalledWith(bomItems[0]);
  });

  it('wires the Undo and Redo buttons and the toolbar export handler to downloadXlsx', () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const downloadXlsx = vi.fn();
    render(<DesignSheetMaterial bomItems={bomItems} />);
    const ref = gridCapture.current?.gridRef;
    expect(ref).toBeTruthy();
    ref!.current = { undo, redo, downloadXlsx };
    fireEvent.click(screen.getByText('Undo'));
    expect(undo).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Redo'));
    expect(redo).toHaveBeenCalled();
    gridCapture.current?.onExport?.();
    expect(downloadXlsx).toHaveBeenCalledWith('material-breakdown.xlsx');
  });
});