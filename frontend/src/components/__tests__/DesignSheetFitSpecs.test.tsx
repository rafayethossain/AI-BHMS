import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

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
  spec({ id: 'f1', fit_number: 'DEV SPEC', is_selected: true }),
  spec({ id: 'f2', fit_number: '1ST FIT', fit_date: '2026-08-20' }),
];

describe('DesignSheetFitSpecs', () => {
  it('renders a tab button per fit spec and ticks the selected one', () => {
    render(<DesignSheetFitSpecs fitSpecs={specs} />);
    expect(screen.getByRole('button', { name: /DEV SPEC/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1ST FIT/i })).toBeInTheDocument();
    const tabs = screen.getAllByText(/DEV SPEC|1ST FIT/i);
    expect(tabs.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('calls onSelectFitSpec when a tab is clicked', () => {
    const onSelectFitSpec = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={specs} onSelectFitSpec={onSelectFitSpec} />);
    fireEvent.click(screen.getByRole('button', { name: /1ST FIT/i }));
    expect(onSelectFitSpec).toHaveBeenCalledWith('f2');
  });

  it('expands the new fit spec form when Add is clicked', () => {
    render(<DesignSheetFitSpecs fitSpecs={specs} />);
    expect(screen.queryByText('Fit Date')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /New Fit Spec/i }));
    expect(screen.getByText('Fit Date')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
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

describe('DesignSheetFitSpecs image gallery', () => {
  const file = new File(['x'], 'fit.png', { type: 'image/png' });

  const withImages: FitSpecification[] = [
    spec({
      id: 'f1',
      fit_number: 'DEV SPEC',
      is_selected: true,
      images: [
        { id: 'img-1', fit_spec: 'f1', image: '/media/fit/img1.png', caption: 'front', order: 0, created_at: '2026-08-10T10:00:00Z' },
        { id: 'img-2', fit_spec: 'f1', image: '/media/fit/img2.png', caption: 'back', order: 1, created_at: '2026-08-10T10:00:00Z' },
      ],
    }),
    spec({ id: 'f2', fit_number: '1ST FIT', is_selected: false }),
  ];

  it('renders the gallery for the selected spec with its images', () => {
    render(<DesignSheetFitSpecs fitSpecs={withImages} />);
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
    render(<DesignSheetFitSpecs fitSpecs={withImages} onAddFitImage={onAddFitImage} />);
    fireEvent.change(screen.getByTestId('fit-image-upload'), { target: { files: [file] } });
    expect(onAddFitImage).toHaveBeenCalledWith('f1', file);
  });

  it('calls onDeleteFitImage when an image delete button is clicked', () => {
    const onDeleteFitImage = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={withImages} onDeleteFitImage={onDeleteFitImage} />);
    fireEvent.click(screen.getByRole('button', { name: /Delete front/i }));
    expect(onDeleteFitImage).toHaveBeenCalledWith('img-1');
  });

  it('reorders images via move buttons', () => {
    const onReorderFitImage = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={withImages} onReorderFitImage={onReorderFitImage} />);
    fireEvent.click(screen.getByRole('button', { name: /Move back down/i }));
    expect(onReorderFitImage).toHaveBeenCalledWith('img-2', 0);
    fireEvent.click(screen.getByRole('button', { name: /Move front up/i }));
    expect(onReorderFitImage).toHaveBeenCalledWith('img-1', 1);
  });
});

describe('DesignSheetFitSpecs copy actions', () => {
  const otherSheets = [
    { id: 'ds-2', file_number: 'TP-2001', style_code: '67711A' },
    { id: 'ds-3', file_number: 'TP-3003', style_code: '90001Z' },
  ];

  it('calls onCopyFromBase when Copy from Base then Confirm is clicked', () => {
    const onCopyFromBase = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={specs} onCopyFromBase={onCopyFromBase} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy from Base' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Base Copy' }));
    expect(onCopyFromBase).toHaveBeenCalledTimes(1);
  });

  it('opens the other-style picker and calls onCopyFromOtherStyle with the selection', () => {
    const onCopyFromOtherStyle = vi.fn();
    render(
      <DesignSheetFitSpecs
        fitSpecs={specs}
        otherSheets={otherSheets}
        onCopyFromOtherStyle={onCopyFromOtherStyle}
      />,
    );
    expect(screen.queryByText('TP-2001')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Copy from Another Style/i }));
    expect(screen.getByRole('button', { name: /TP-2001/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /TP-3003/i }));
    expect(onCopyFromOtherStyle).toHaveBeenCalledWith('ds-3');
    expect(screen.queryByText('TP-2001')).not.toBeInTheDocument();
  });

  it('shows the picker as empty when there are no other sheets', () => {
    render(<DesignSheetFitSpecs fitSpecs={specs} otherSheets={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy from Another Style/i }));
    expect(screen.getByText(/No other design sheets/i)).toBeInTheDocument();
  });
});

describe('DesignSheetFitSpecs description editing', () => {
  it('shows the selected spec description and edits it inline', () => {
    const onUpdateFitSpec = vi.fn();
    render(
      <DesignSheetFitSpecs
        fitSpecs={[spec({ id: 'f1', fit_number: 'DEV SPEC', description: 'Initial dev fit', is_selected: true })]}
        onUpdateFitSpec={onUpdateFitSpec}
      />,
    );
    expect(screen.getByDisplayValue('Initial dev fit')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('Initial dev fit'), { target: { value: 'Updated dev fit' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Description/i }));
    expect(onUpdateFitSpec).toHaveBeenCalledWith('f1', { description: 'Updated dev fit' });
  });

  it('renders the description editor only for the selected spec', () => {
    render(
      <DesignSheetFitSpecs
        fitSpecs={[
          spec({ id: 'f1', fit_number: 'DEV SPEC', is_selected: false }),
          spec({ id: 'f2', fit_number: '1ST FIT', is_selected: false }),
        ]}
      />,
    );
    expect(screen.queryByLabelText('Fit Description')).not.toBeInTheDocument();
  });
});

describe('DesignSheetFitSpecs copy annotations', () => {
  it('exposes an include-annotations checkbox on the base copy flow', () => {
    render(<DesignSheetFitSpecs fitSpecs={specs} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy from Base' }));
    expect(screen.getByTestId('copy-include-annotations')).toBeInTheDocument();
  });

  it('passes include_annotations=true when checked on copy from base', () => {
    const onCopyFromBase = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={specs} onCopyFromBase={onCopyFromBase} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy from Base' }));
    fireEvent.click(screen.getByTestId('copy-include-annotations'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Base Copy' }));
    expect(onCopyFromBase).toHaveBeenCalledWith({ include_annotations: true });
  });

  it('passes include_annotations=false by default', () => {
    const onCopyFromBase = vi.fn();
    render(<DesignSheetFitSpecs fitSpecs={specs} onCopyFromBase={onCopyFromBase} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy from Base' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Base Copy' }));
    expect(onCopyFromBase).toHaveBeenCalledWith({ include_annotations: false });
  });
});