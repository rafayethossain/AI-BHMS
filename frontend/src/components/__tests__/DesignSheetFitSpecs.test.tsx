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
      headerFilter?: boolean;
      headerFilterType?: string;
      frozen?: boolean;
    }[];
    gridRef?: { current: null | { undo: () => void; redo: () => void; downloadXlsx: (fileName?: string) => void } };
    onCellEdited?: (field: string, value: unknown, row: Record<string, unknown>) => void;
    rowContextMenu?: (row: Record<string, unknown>) => { label: string; disabled?: boolean; action?: () => void }[];
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

import DesignSheetFitSpecs from '../DesignSheetFitSpecs';
import type { FitSpecification } from '../../api/client';

function spec(overrides: Partial<FitSpecification>): FitSpecification {
  return {
    id: 'f1',
    design_sheet: 'ds-1',
    fit_number: 'DEV SPEC',
    fit_date: '2026-08-10',
    description: 'Initial dev fit',
    notes: '',
    is_selected: false,
    images: [],
    created_at: '2026-08-10T10:00:00Z',
    ...overrides,
  };
}

const specs: FitSpecification[] = [
  spec({
    id: 'f1',
    fit_number: 'DEV SPEC',
    is_selected: true,
    images: [
      { id: 'img-1', fit_spec: 'f1', image: '/media/fit/img1.png', caption: 'front', order: 0, created_at: '2026-08-10T10:00:00Z' },
      { id: 'img-2', fit_spec: 'f1', image: '/media/fit/img2.png', caption: 'back', order: 1, created_at: '2026-08-10T10:00:00Z' },
    ],
  }),
  spec({ id: 'f2', fit_number: '1ST FIT', fit_date: '2026-08-20', description: 'Proto one' }),
];

describe('DesignSheetFitSpecs grid', () => {
  beforeEach(() => {
    gridCapture.current = null;
    vi.clearAllMocks();
  });

  it('renders the section header with copy buttons, new fit spec, undo and redo', () => {
    render(<DesignSheetFitSpecs fitSpecs={specs} />);
    expect(screen.getByText('Fit Specs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy from Another Style/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy from Base/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Fit Spec/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
  });

  it('maps fit specs to grid rows with a selected marker and image count', () => {
    render(<DesignSheetFitSpecs fitSpecs={specs} />);
    expect(gridCapture.current?.data).toEqual([
      expect.objectContaining({ id: 'f1', fit_number: 'DEV SPEC', selected: '✓', image_count: 2 }),
      expect.objectContaining({ id: 'f2', fit_number: '1ST FIT', selected: '', fit_date: '2026-08-20', image_count: 0 }),
    ]);
  });

  it('forwards grid columns with editable date/description/notes and header filters everywhere', () => {
    render(<DesignSheetFitSpecs fitSpecs={specs} />);
    const titles = gridCapture.current?.columns.map((c) => c.title);
    expect(titles).toEqual(['Fit Spec', 'Selected', 'Fit Date', 'Description', 'Notes', 'Photos']);
    for (const c of gridCapture.current?.columns ?? []) {
      if (c.field === 'fit_number' || c.field === 'selected' || c.field === 'image_count') {
        expect(c.editor).toBeUndefined();
      } else {
        expect(c.editor).toBe('input');
        expect(c.headerFilter).toBe(true);
        expect(c.headerFilterType).toBeTruthy();
      }
    }
  });

  it('forwards cell edits to onUpdateFitSpec with a field patch', () => {
    const onUpdateFitSpec = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={specs} onUpdateFitSpec={onUpdateFitSpec} />);
    const rows = gridCapture.current?.data ?? [];
    gridCapture.current?.onCellEdited?.('description', 'Second proto', rows[0]);
    expect(onUpdateFitSpec).toHaveBeenCalledWith('f1', { description: 'Second proto' });
  });

  it('wires the action-column delete button to onDeleteFitSpec', () => {
    const onDeleteFitSpec = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={specs} onDeleteFitSpec={onDeleteFitSpec} />);
    const props = gridCapture.current;
    expect(props?.actionColumn).toBe(true);
    const rows = props?.data ?? [];
    props?.onDelete?.(rows[1]);
    expect(onDeleteFitSpec).toHaveBeenCalledWith('f2');
  });

  it('builds a row context menu that can select or delete a fit spec', () => {
    const onSelectFitSpec = vi.fn();
    const onDeleteFitSpec = vi.fn();
    render(
      <DesignSheetFitSpecs
        fitSpecs={specs}
        onSelectFitSpec={onSelectFitSpec}
        onDeleteFitSpec={onDeleteFitSpec}
      />,
    );
    const rows = gridCapture.current?.data ?? [];
    const unselected = rows[1];
    const menu = gridCapture.current?.rowContextMenu?.(unselected);
    expect(menu?.map((m) => m.label)).toEqual([
      'Add New Fit Spec',
      'Set as Selected',
      'Delete Fit Spec',
    ]);
    expect(menu?.[1].disabled).toBeFalsy();
    menu?.[1].action?.();
    expect(onSelectFitSpec).toHaveBeenCalledWith('f2');
    menu?.[2].action?.();
    expect(onDeleteFitSpec).toHaveBeenCalledWith('f2');
  });

  it('disables the Set as Selected action for the already-selected spec', () => {
    render(<DesignSheetFitSpecs fitSpecs={specs} />);
    const rows = gridCapture.current?.data ?? [];
    const menu = gridCapture.current?.rowContextMenu?.(rows[0]);
    expect(menu?.[1].label).toBe('Selected (marked in grid)');
    expect(menu?.[1].disabled).toBe(true);
  });

  it('forwards the standard grid chrome: toolbar, export, print, columns and pagination', () => {
    render(<DesignSheetFitSpecs fitSpecs={specs} loading />);
    const props = gridCapture.current;
    expect(props?.toolbar).toBe(true);
    expect(props?.title).toBe('Fit Specs');
    expect(props?.exportable).toBe(true);
    expect(props?.printable).toBe(true);
    expect(props?.printTitle).toBe('Fit Specs');
    expect(props?.columnChooser).toBe(true);
    expect(props?.paginationSize).toBe(20);
    expect(props?.loading).toBe(true);
  });

  it('wires the Undo and Redo buttons and toolbar export handler to downloadXlsx', () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const downloadXlsx = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={specs} />);
    const ref = gridCapture.current?.gridRef;
    expect(ref).toBeTruthy();
    ref!.current = { undo, redo, downloadXlsx };
    fireEvent.click(screen.getByText('Undo'));
    expect(undo).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Redo'));
    expect(redo).toHaveBeenCalled();
    gridCapture.current?.onExport?.();
    expect(downloadXlsx).toHaveBeenCalledWith('fit-specs.xlsx');
  });

  it('builds a header menu to hide, show or toggle columns', () => {
    const cols = [
      { getTitle: () => 'Fit Date', toggle: vi.fn(), hide: vi.fn(), show: vi.fn() },
      { getTitle: () => 'Notes', toggle: vi.fn(), hide: vi.fn(), show: vi.fn() },
    ];
    const table = { getColumns: () => cols };
    const fakeColumn = { hide: vi.fn(), getTable: () => table };
    render(<DesignSheetFitSpecs fitSpecs={specs} />);
    const menu = gridCapture.current?.headerMenu?.(fakeColumn);
    expect(menu?.map((m) => m.label)).toEqual([
      'Hide Column',
      'Toggle Fit Date',
      'Toggle Notes',
      'Show All Columns',
    ]);
    menu?.[0].action?.();
    expect(fakeColumn.hide).toHaveBeenCalled();
    menu?.[1].action?.();
    expect(cols[0].toggle).toHaveBeenCalled();
    menu?.[3].action?.();
    expect(cols[0].show).toHaveBeenCalled();
    expect(cols[1].show).toHaveBeenCalled();
  });
});

describe('DesignSheetFitSpecs image gallery', () => {
  beforeEach(() => {
    gridCapture.current = null;
    vi.clearAllMocks();
  });

  it('renders the gallery for the selected spec with its images', () => {
    render(<DesignSheetFitSpecs fitSpecs={specs} />);
    const front = screen.getByAltText('front') as HTMLImageElement;
    expect(front.src).toContain('img1.png');
    expect(screen.getByAltText('back')).toBeInTheDocument();
  });

  it('does not show a gallery when no spec is selected', () => {
    render(<DesignSheetFitSpecs fitSpecs={[spec({ id: 'f2', fit_number: '1ST FIT' })]} />);
    expect(screen.queryByText('Photos')).not.toBeInTheDocument();
  });

  it('calls onAddFitImage with the selected spec and uploaded file', () => {
    const onAddFitImage = vi.fn();
    const file = new File(['x'], 'fit.png', { type: 'image/png' });
    render(<DesignSheetFitSpecs fitSpecs={specs} onAddFitImage={onAddFitImage} />);
    fireEvent.change(screen.getByTestId('fit-image-upload'), { target: { files: [file] } });
    expect(onAddFitImage).toHaveBeenCalledWith('f1', file);
  });

  it('calls onDeleteFitImage when an image delete button is clicked', () => {
    const onDeleteFitImage = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={specs} onDeleteFitImage={onDeleteFitImage} />);
    fireEvent.click(screen.getByRole('button', { name: /Delete front/i }));
    expect(onDeleteFitImage).toHaveBeenCalledWith('img-1');
  });

  it('calls onReorderFitImage when an image move button is clicked', () => {
    const onReorderFitImage = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={specs} onReorderFitImage={onReorderFitImage} />);
    fireEvent.click(screen.getByRole('button', { name: /Move front down/i }));
    expect(onReorderFitImage).toHaveBeenCalledWith('img-1', 0);
  });
});

describe('DesignSheetFitSpecs copy actions', () => {
  beforeEach(() => {
    gridCapture.current = null;
    vi.clearAllMocks();
  });

  it('lists other sheets and copies on selection', () => {
    const onCopyFromOtherStyle = vi.fn();
    render(
      <DesignSheetFitSpecs
        fitSpecs={specs}
        onCopyFromOtherStyle={onCopyFromOtherStyle}
        otherSheets={[{ id: 's1', file_number: 'TP-1001', style_code: '67740T' }]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Copy from Another Style/i }));
    fireEvent.click(screen.getByRole('button', { name: /TP-1001 - 67740T/i }));
    expect(onCopyFromOtherStyle).toHaveBeenCalledWith('s1');
  });

  it('shows a message when no other sheets exist', () => {
    const onCopyFromOtherStyle = vi.fn();
    render(
      <DesignSheetFitSpecs fitSpecs={specs} onCopyFromOtherStyle={onCopyFromOtherStyle} otherSheets={[]} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Copy from Another Style/i }));
    expect(screen.getByText('No other design sheets available.')).toBeInTheDocument();
  });

  it('confirms the base copy with the annotations toggle', () => {
    const onCopyFromBase = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={specs} onCopyFromBase={onCopyFromBase} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy from Base/i }));
    fireEvent.click(screen.getByTestId('copy-include-annotations'));
    fireEvent.click(screen.getByRole('button', { name: /Confirm Base Copy/i }));
    expect(onCopyFromBase).toHaveBeenCalledWith({ include_annotations: true });
  });

  it('copies the base without annotations when the toggle is not checked', () => {
    const onCopyFromBase = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={specs} onCopyFromBase={onCopyFromBase} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy from Base/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm Base Copy/i }));
    expect(onCopyFromBase).toHaveBeenCalledWith({ include_annotations: false });
  });
});

describe('DesignSheetFitSpecs new fit spec form', () => {
  beforeEach(() => {
    gridCapture.current = null;
    vi.clearAllMocks();
  });

  it('submits a new fit spec with an auto-generated label', () => {
    const onCreateFitSpec = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={specs} onCreateFitSpec={onCreateFitSpec} />);
    fireEvent.click(screen.getByRole('button', { name: /New Fit Spec/i }));
    fireEvent.change(screen.getByLabelText('Fit Date'), { target: { value: '2026-09-15' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Second proto' } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Longer sleeve' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Fit Spec/i }));
    expect(onCreateFitSpec).toHaveBeenCalledWith({
      fit_number: '2ND FIT',
      fit_date: '2026-09-15',
      description: 'Second proto',
      notes: 'Longer sleeve',
    });
  });

  it('uses DEV SPEC as the label for the first fit spec', () => {
    const onCreateFitSpec = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={[]} onCreateFitSpec={onCreateFitSpec} />);
    fireEvent.click(screen.getByRole('button', { name: /New Fit Spec/i }));
    fireEvent.change(screen.getByLabelText('Fit Date'), { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Fit Spec/i }));
    expect(onCreateFitSpec).toHaveBeenCalledWith(
      expect.objectContaining({ fit_number: 'DEV SPEC' }),
    );
  });
});

describe('DesignSheetFitSpecs description editing', () => {
  beforeEach(() => {
    gridCapture.current = null;
    vi.clearAllMocks();
  });

  it('shows the selected spec description and saves edits on click', () => {
    const onUpdateFitSpec = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={specs} onUpdateFitSpec={onUpdateFitSpec} />);
    const input = screen.getByLabelText('Fit Description') as HTMLInputElement;
    expect(input.value).toBe('Initial dev fit');
    fireEvent.change(input, { target: { value: 'Updated dev fit' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Description/i }));
    expect(onUpdateFitSpec).toHaveBeenCalledWith('f1', { description: 'Updated dev fit' });
  });

  it('does not save when the description was not edited', () => {
    const onUpdateFitSpec = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={specs} onUpdateFitSpec={onUpdateFitSpec} />);
    fireEvent.click(screen.getByRole('button', { name: /Save Description/i }));
    expect(onUpdateFitSpec).not.toHaveBeenCalled();
  });
});