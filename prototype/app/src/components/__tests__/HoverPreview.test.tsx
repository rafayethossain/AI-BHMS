import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HoverPreview from '../HoverPreview';

const FIELDS = [
  { label: 'Buyer', value: 'Primark' },
  { label: 'Style', value: 'REG-1001' },
  { label: 'Status', value: 'Confirmed' },
];

function renderPreview() {
  return render(
    <HoverPreview title="PO-1010" fields={FIELDS}>
      <button type="button">Row content</button>
    </HoverPreview>,
  );
}

describe('HoverPreview', () => {
  it('renders the trigger children without the preview', () => {
    renderPreview();
    expect(screen.getByRole('button', { name: 'Row content' })).toBeInTheDocument();
    expect(screen.queryByTestId('hover-preview')).not.toBeInTheDocument();
  });

  it('shows the labelled preview on hover and hides it on leave', () => {
    renderPreview();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Row content' }));
    expect(screen.getByTestId('hover-preview')).toBeInTheDocument();
    expect(screen.getByText('Primark')).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByRole('button', { name: 'Row content' }));
    expect(screen.queryByTestId('hover-preview')).not.toBeInTheDocument();
  });

  it('opens on keyboard focus and closes on blur', () => {
    renderPreview();
    fireEvent.focus(screen.getByRole('button', { name: 'Row content' }));
    expect(screen.getByTestId('hover-preview')).toBeInTheDocument();
    fireEvent.blur(screen.getByRole('button', { name: 'Row content' }));
    expect(screen.queryByTestId('hover-preview')).not.toBeInTheDocument();
  });

  it('renders the title and every field label/value pair', () => {
    renderPreview();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Row content' }));
    expect(screen.getByText('PO-1010')).toBeInTheDocument();
    for (const f of FIELDS) {
      expect(screen.getByText(f.label)).toBeInTheDocument();
      expect(screen.getByText(f.value)).toBeInTheDocument();
    }
  });

  it('opens on hover and stays open while the pointer is over the preview', () => {
    renderPreview();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Row content' }));
    expect(screen.getByTestId('hover-preview')).toBeInTheDocument();
    fireEvent.mouseMove(screen.getByTestId('hover-preview'));
    expect(screen.getByTestId('hover-preview')).toBeInTheDocument();
  });
});