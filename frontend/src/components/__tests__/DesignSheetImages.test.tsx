import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import DesignSheetImages from '../DesignSheetImages';
import type { DesignImage } from '../../api/client';

function image(overrides: Partial<DesignImage>): DesignImage {
  return {
    id: 'img-1',
    style: 'st-1',
    style_number: 'S-001',
    image: '/media/design_images/img1.png',
    role: 'main',
    caption: 'Main flat',
    colourway: '',
    sort_order: 0,
    is_main: true,
    annotations: [],
    created_at: '2026-08-10T10:00:00Z',
    ...overrides,
  };
}

const images: DesignImage[] = [
  image({}),
  image({
    id: 'img-2',
    image: '/media/design_images/range.png',
    role: 'range',
    caption: 'Range shot',
    sort_order: 1,
    is_main: false,
  }),
  image({
    id: 'img-3',
    image: '/media/design_images/colour.png',
    role: 'colourway',
    caption: 'Colourway',
    sort_order: 2,
    is_main: false,
  }),
];

describe('DesignSheetImages', () => {
  it('renders a thumbnail image per design image with a caption and role badge', () => {
    render(<DesignSheetImages images={images} />);
    const grid = screen.getByTestId('design-images-grid');
    expect(grid.querySelectorAll('img')).toHaveLength(3);
    expect(screen.getByAltText('Main flat')).toBeInTheDocument();
    expect(screen.getByText('Range')).toBeInTheDocument();
    expect(screen.getAllByText('Main').length).toBeGreaterThan(0);
  });

  it('shows the main-image badge on the main image', () => {
    render(<DesignSheetImages images={images} />);
    expect(screen.getByText('MAIN')).toBeInTheDocument();
  });

  it('renders the empty state when there are no images', () => {
    render(<DesignSheetImages images={[]} />);
    expect(screen.getByText(/No design images yet/i)).toBeInTheDocument();
  });

  it('toggles between image and list views', () => {
    render(<DesignSheetImages images={images} />);
    expect(screen.getByTestId('design-images-grid')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('design-images-view-list'));
    expect(screen.getByTestId('design-images-list')).toBeInTheDocument();
    expect(screen.queryByTestId('design-images-grid')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('design-images-view-image'));
    expect(screen.getByTestId('design-images-grid')).toBeInTheDocument();
  });

  it('filters to only range images when the range filter is enabled', () => {
    render(<DesignSheetImages images={images} />);
    fireEvent.click(screen.getByTestId('design-images-range-filter'));
    const grid = screen.getByTestId('design-images-grid');
    const shown = Array.from(grid.querySelectorAll('img')).map((i) => (i as HTMLImageElement).alt);
    expect(shown).toEqual(['Range shot']);
  });

  it('uploads a new image with the chosen role and caption', () => {
    const onUpload = vi.fn();
    const file = new File(['x'], 'new.png', { type: 'image/png' });
    render(<DesignSheetImages styleId="st-1" images={images} onUpload={onUpload} />);
    fireEvent.click(screen.getByTestId('design-images-add'));
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'range' } });
    fireEvent.change(screen.getByLabelText('Caption'), { target: { value: 'New range' } });
    fireEvent.change(screen.getByTestId('design-images-file'), { target: { files: [file] } });
    expect(onUpload).toHaveBeenCalledWith({
      styleId: 'st-1',
      role: 'range',
      caption: 'New range',
      file,
    });
  });

  it('does not offer upload form without a style id', () => {
    render(<DesignSheetImages images={images} />);
    fireEvent.click(screen.getByTestId('design-images-add'));
    expect(screen.queryByTestId('design-images-file')).not.toBeInTheDocument();
  });

  it('opens a context menu on right-click and sets the image as main', () => {
    const onSetMain = vi.fn();
    render(<DesignSheetImages images={images} onSetMain={onSetMain} />);
    const tile = screen.getByTestId('design-images-tile-img-2');
    fireEvent.contextMenu(tile);
    expect(screen.getByTestId('design-images-menu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Set as Main Image/i }));
    expect(onSetMain).toHaveBeenCalledWith('img-2');
  });

  it('sets an image role from the context menu', () => {
    const onSetRole = vi.fn();
    render(<DesignSheetImages images={images} onSetRole={onSetRole} />);
    fireEvent.contextMenu(screen.getByTestId('design-images-tile-img-1'));
    fireEvent.click(screen.getByRole('button', { name: /Set as Range/i }));
    expect(onSetRole).toHaveBeenCalledWith('img-1', 'range');
  });

  it('deletes an image from the context menu', () => {
    const onDelete = vi.fn();
    render(<DesignSheetImages images={images} onDelete={onDelete} />);
    fireEvent.contextMenu(screen.getByTestId('design-images-tile-img-3'));
    fireEvent.click(screen.getByRole('button', { name: /Delete image/i }));
    expect(onDelete).toHaveBeenCalledWith('img-3');
  });

  it('opens an annotation dialog for a design image tile', () => {
    render(<DesignSheetImages images={images} />);
    fireEvent.click(screen.getByTestId('design-images-annotate-img-1'));
    expect(screen.getByRole('dialog', { name: 'Annotate image' })).toBeInTheDocument();
    expect(screen.getByTestId('image-annotate-area')).toBeInTheDocument();
  });

  it('closes the annotation dialog without persisting', () => {
    const onSaveAnnotations = vi.fn();
    render(<DesignSheetImages images={images} onSaveAnnotations={onSaveAnnotations} />);
    fireEvent.click(screen.getByTestId('design-images-annotate-img-1'));
    fireEvent.click(screen.getByTestId('design-images-annotate-close'));
    expect(screen.queryByRole('dialog', { name: 'Annotate image' })).not.toBeInTheDocument();
    expect(onSaveAnnotations).not.toHaveBeenCalled();
  });

  it('shows existing annotations inside the annotation dialog', () => {
    render(
      <DesignSheetImages
        images={[
          image({
            id: 'img-ann',
            annotations: [{ id: 'a1', x: 20, y: 30, text: 'WAIST SEAM' }],
          }),
        ]}
      />
    );
    fireEvent.click(screen.getByTestId('design-images-annotate-img-ann'));
    expect(screen.getByDisplayValue('WAIST SEAM')).toBeInTheDocument();
  });

  it('saves annotations placed in the dialog via onSaveAnnotations', () => {
    const onSaveAnnotations = vi.fn();
    render(<DesignSheetImages images={images} onSaveAnnotations={onSaveAnnotations} />);
    fireEvent.click(screen.getByTestId('design-images-annotate-img-1'));
    fireEvent.click(screen.getByTestId('image-annotate-toggle'));
    fireEvent.click(screen.getByTestId('image-annotate-area'));
    fireEvent.click(screen.getByTestId('image-annotate-save'));

    expect(onSaveAnnotations).toHaveBeenCalledTimes(1);
    const [id, annotations] = onSaveAnnotations.mock.calls[0] as [string, unknown[]];
    expect(id).toBe('img-1');
    expect(annotations).toEqual([
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), text: '' }),
    ]);
  });
});

describe('DesignSheetImages button contrast tokens', () => {
  it('uses the site primary button token with white text on the add/cancel toggle', () => {
    render(<DesignSheetImages images={images} styleId="st-1" />);
    const add = screen.getByTestId('design-images-add');
    expect(add.className).toMatch(/bg-btn-primary text-white/);
    expect(add.className).not.toContain('bg-heading');
    expect(add.className).not.toContain('text-background');
    fireEvent.click(add);
    expect(screen.getByTestId('design-images-add').textContent).toContain('Cancel');
    expect(screen.getByTestId('design-images-add').className).toMatch(/bg-btn-primary text-white/);
  });

  it('uses the readable heading text token on the view toggle buttons', () => {
    render(<DesignSheetImages images={images} />);
    for (const id of ['design-images-view-image', 'design-images-view-list']) {
      const btn = screen.getByTestId(id);
      expect(btn.className).toContain('text-heading');
      expect(btn.className).not.toContain('text-muted');
    }
  });
});