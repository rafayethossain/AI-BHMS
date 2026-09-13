import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import ImageAnnotationOverlay from '../ImageAnnotationOverlay';
import type { SketchAnnotation } from '../../api/client';

const src = 'http://media.local/design_images/main.jpg';

describe('ImageAnnotationOverlay', () => {
  it('renders the image and existing annotations', () => {
    render(
      <ImageAnnotationOverlay
        src={src}
        alt="Main flat"
        annotations={[{ id: 'a1', x: 20, y: 30, text: 'WAIST SEAM' }]}
        onAnnotationsChange={vi.fn()}
        onSaveAnnotations={vi.fn()}
      />
    );
    expect(screen.getByAltText('Main flat')).toHaveAttribute('src', src);
    expect(screen.getByDisplayValue('WAIST SEAM')).toBeInTheDocument();
  });

  it('places a marker when the image is clicked in annotate mode', () => {
    const onAnnotationsChange = vi.fn();
    render(
      <ImageAnnotationOverlay
        src={src}
        annotations={[]}
        onAnnotationsChange={onAnnotationsChange}
        onSaveAnnotations={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('image-annotate-toggle'));
    fireEvent.click(screen.getByTestId('image-annotate-area'));
    expect(onAnnotationsChange).toHaveBeenCalledWith([
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), text: '' }),
    ]);
  });

  it('does not place a marker outside annotate mode', () => {
    const onAnnotationsChange = vi.fn();
    render(
      <ImageAnnotationOverlay
        src={src}
        annotations={[]}
        onAnnotationsChange={onAnnotationsChange}
        onSaveAnnotations={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('image-annotate-area'));
    expect(onAnnotationsChange).not.toHaveBeenCalled();
  });

  it('updates an annotation note as the user types', () => {
    const onAnnotationsChange = vi.fn();
    render(
      <ImageAnnotationOverlay
        src={src}
        annotations={[{ id: 'a1', x: 20, y: 30, text: 'WAIST SEAM' }]}
        onAnnotationsChange={onAnnotationsChange}
        onSaveAnnotations={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText('Annotation a1'), { target: { value: 'Tighten hem' } });
    expect(onAnnotationsChange).toHaveBeenCalledWith([
      { id: 'a1', x: 20, y: 30, text: 'Tighten hem' },
    ]);
  });

  it('deletes an annotation', () => {
    const onAnnotationsChange = vi.fn();
    render(
      <ImageAnnotationOverlay
        src={src}
        annotations={[{ id: 'a1', x: 20, y: 30, text: 'WAIST SEAM' }]}
        onAnnotationsChange={onAnnotationsChange}
        onSaveAnnotations={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText('Delete annotation a1'));
    expect(onAnnotationsChange).toHaveBeenCalledWith([]);
  });

  it('saves the current annotation list via onSaveAnnotations', () => {
    const onSaveAnnotations = vi.fn();
    const annotations: SketchAnnotation[] = [{ id: 'a1', x: 20, y: 30, text: 'WAIST SEAM' }];
    render(
      <ImageAnnotationOverlay
        src={src}
        annotations={annotations}
        onAnnotationsChange={vi.fn()}
        onSaveAnnotations={onSaveAnnotations}
      />
    );
    fireEvent.click(screen.getByTestId('image-annotate-save'));
    expect(onSaveAnnotations).toHaveBeenCalledWith(annotations);
  });

  it('disables the save button while saving', () => {
    render(
      <ImageAnnotationOverlay
        src={src}
        annotations={[]}
        onAnnotationsChange={vi.fn()}
        onSaveAnnotations={vi.fn()}
        saving
      />
    );
    expect(screen.getByTestId('image-annotate-save')).toBeDisabled();
  });
});