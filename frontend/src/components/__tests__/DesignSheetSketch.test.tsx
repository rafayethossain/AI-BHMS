import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('../../api/client', () => ({
  merchApi: { uploadTechPackSketch: vi.fn(), saveDesignSheetAnnotations: vi.fn() },
}));

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));

import DesignSheetSketch from '../DesignSheetSketch';
import { merchApi } from '../../api/client';

const sketchUrl = 'http://media.local/sketches/main.jpg';
const uploadUrl = 'http://media.local/sketches/new.jpg';

describe('DesignSheetSketch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state when no sketch exists', () => {
    render(<DesignSheetSketch techpackId="tp-1" sketchUrl={null} />);
    expect(screen.getByText('No sketch uploaded yet')).toBeInTheDocument();
  });

  it('renders the sketch image when one exists', () => {
    render(<DesignSheetSketch techpackId="tp-1" sketchUrl={sketchUrl} />);
    const img = screen.getByAltText('Design sheet sketch');
    expect(img).toHaveAttribute('src', sketchUrl);
  });

  it('opens a preview modal when the sketch image is clicked', async () => {
    render(<DesignSheetSketch techpackId="tp-1" sketchUrl={sketchUrl} />);
    fireEvent.click(screen.getByTestId('sketch-preview-button'));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Sketch preview' })).toBeInTheDocument();
    });
  });

  it('closes the preview modal', async () => {
    render(<DesignSheetSketch techpackId="tp-1" sketchUrl={sketchUrl} />);
    fireEvent.click(screen.getByTestId('sketch-preview-button'));
    fireEvent.click(await screen.findByRole('button', { name: /close preview/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Sketch preview' })).not.toBeInTheDocument();
    });
  });

  it('uploads a sketch via the file input and reports the new URL', async () => {
    const file = new File(['png'], 'sketch.png', { type: 'image/png' });
    const onSketchChange = vi.fn();
    (merchApi.uploadTechPackSketch as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { sketch_image_url: uploadUrl, sketch_thumbnail_url: null, message: 'Sketch uploaded successfully' },
    });
    render(<DesignSheetSketch techpackId="tp-1" sketchUrl={null} onSketchChange={onSketchChange} />);

    fireEvent.change(screen.getByTestId('sketch-input'), { target: { files: [file] } });

    await waitFor(() => {
      expect(merchApi.uploadTechPackSketch).toHaveBeenCalledWith('tp-1', file);
      expect(onSketchChange).toHaveBeenCalledWith(uploadUrl);
      expect(toastMock).toHaveBeenCalledWith('success', expect.stringMatching(/uploaded/i));
    });
  });

  it('uploads a sketch dropped onto the drop zone', async () => {
    const file = new File(['png'], 'drop.png', { type: 'image/png' });
    (merchApi.uploadTechPackSketch as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { sketch_image_url: uploadUrl, sketch_thumbnail_url: null, message: 'Sketch uploaded successfully' },
    });
    render(<DesignSheetSketch techpackId="tp-1" sketchUrl={null} />);

    const zone = screen.getByTestId('sketch-drop-zone');
    fireEvent.dragOver(zone);
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(merchApi.uploadTechPackSketch).toHaveBeenCalledWith('tp-1', file);
    });
  });

  it('rejects an invalid file type', async () => {
    const file = new File(['x'], 'note.txt', { type: 'text/plain' });
    render(<DesignSheetSketch techpackId="tp-1" sketchUrl={null} />);

    fireEvent.change(screen.getByTestId('sketch-input'), { target: { files: [file] } });

    await waitFor(() => {
      expect(merchApi.uploadTechPackSketch).not.toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith('error', expect.stringMatching(/jpg|png|webp/i));
    });
  });

  it('shows a toast when the upload fails', async () => {
    const file = new File(['png'], 'sketch.png', { type: 'image/png' });
    (merchApi.uploadTechPackSketch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    render(<DesignSheetSketch techpackId="tp-1" sketchUrl={null} />);

    fireEvent.change(screen.getByTestId('sketch-input'), { target: { files: [file] } });

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('error', expect.stringMatching(/failed/i));
    });
  });

  it('renders saved annotations on the sketch', () => {
    render(
      <DesignSheetSketch
        techpackId="tp-1"
        designSheetId="ds-1"
        sketchUrl={sketchUrl}
        annotations={[{ id: 'a1', x: 20, y: 30, text: 'WAIST SEAM' }]}
        onAnnotationsChange={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('WAIST SEAM')).toBeInTheDocument();
  });

  it('adds an annotation when the sketch is clicked in annotate mode', () => {
    const onAnnotationsChange = vi.fn();
    render(
      <DesignSheetSketch
        techpackId="tp-1"
        designSheetId="ds-1"
        sketchUrl={sketchUrl}
        annotations={[]}
        onAnnotationsChange={onAnnotationsChange}
      />
    );
    fireEvent.click(screen.getByTestId('annotate-toggle'));
    fireEvent.click(screen.getByTestId('sketch-annotate-area'));

    expect(onAnnotationsChange).toHaveBeenCalledWith([
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), text: '' }),
    ]);
  });

  it('does not add an annotation outside annotate mode', () => {
    const onAnnotationsChange = vi.fn();
    render(
      <DesignSheetSketch
        techpackId="tp-1"
        designSheetId="ds-1"
        sketchUrl={sketchUrl}
        annotations={[]}
        onAnnotationsChange={onAnnotationsChange}
      />
    );
    fireEvent.click(screen.getByTestId('sketch-annotate-area'));
    expect(onAnnotationsChange).not.toHaveBeenCalled();
  });

  it('deletes an annotation', () => {
    const onAnnotationsChange = vi.fn();
    render(
      <DesignSheetSketch
        techpackId="tp-1"
        designSheetId="ds-1"
        sketchUrl={sketchUrl}
        annotations={[{ id: 'a1', x: 20, y: 30, text: 'WAIST SEAM' }]}
        onAnnotationsChange={onAnnotationsChange}
      />
    );
    fireEvent.click(screen.getByLabelText('Delete annotation a1'));
    expect(onAnnotationsChange).toHaveBeenCalledWith([]);
  });

  it('saves annotations to the API', async () => {
    const annotations = [{ id: 'a1', x: 20, y: 30, text: 'WAIST SEAM' }];
    (merchApi.saveDesignSheetAnnotations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { annotations },
    });
    render(
      <DesignSheetSketch
        techpackId="tp-1"
        designSheetId="ds-1"
        sketchUrl={sketchUrl}
        annotations={annotations}
        onAnnotationsChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /save annotations/i }));

    await waitFor(() => {
      expect(merchApi.saveDesignSheetAnnotations).toHaveBeenCalledWith('ds-1', annotations);
      expect(toastMock).toHaveBeenCalledWith('success', expect.stringMatching(/saved/i));
    });
  });

  it('shows a toast when saving annotations fails', async () => {
    (merchApi.saveDesignSheetAnnotations as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    render(
      <DesignSheetSketch
        techpackId="tp-1"
        designSheetId="ds-1"
        sketchUrl={sketchUrl}
        annotations={[{ id: 'a1', x: 20, y: 30, text: 'WAIST SEAM' }]}
        onAnnotationsChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /save annotations/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('error', expect.stringMatching(/failed/i));
    });
  });
});