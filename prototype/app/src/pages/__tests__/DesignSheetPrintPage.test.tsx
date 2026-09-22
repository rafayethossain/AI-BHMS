import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DesignSheetPrintPage from '../DesignSheetPrintPage';
import { resetDb, createDesign } from '../../mock/api';

function renderPrint(code = 'REG-1001') {
  return render(
    <MemoryRouter initialEntries={[`/designs/${code}/print`]}>
      <Routes>
        <Route path="/designs/:designCode/print" element={<DesignSheetPrintPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DesignSheetPrintPage — sheet content', () => {
  beforeEach(() => resetDb());

  it('renders the standard sheet header with buyer, code, file and status', async () => {
    renderPrint();
    expect(
      await screen.findByRole('heading', { name: 'Design Sheet' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('print-buyer-name')).toHaveTextContent('Nike Inc.');
    expect(screen.getByTestId('print-design-code')).toHaveTextContent('REG-1001');
    expect(screen.getByTestId('print-file')).toHaveTextContent('FO-2025-102');
    expect(screen.getByTestId('print-status')).toHaveTextContent('Active');
  });

  it('renders the design information fields', async () => {
    renderPrint();
    const fields = await screen.findByTestId('print-info-fields');
    expect(fields).toBeInTheDocument();
    for (const [label, value] of [
      ['Issue Date', '2026-08-01'],
      ['Block', 'B2'],
      ['Version', 'v2'],
      ['Size', 'S–XL'],
      ['Designer', 'F. Rahman'],
      ['Issuer', 'Merchandising'],
      ['Length', '38 in'],
      ['Description', 'Crew neck oversized top'],
      ['Note', 'Contrast stitch detail'],
    ]) {
      expect(within(fields).getByText(label)).toBeInTheDocument();
      expect(within(fields).getByText(value)).toBeInTheDocument();
    }
  });

  it('shows a placeholder when no sketch has been uploaded', async () => {
    renderPrint('REG-1001');
    expect(await screen.findByText('No sketch uploaded')).toBeInTheDocument();
  });

  it('renders the sketch image when a sketch exists', async () => {
    await createDesign({
      design_code: 'PRT-SK1',
      category: 'Womenswear',
      buyer: 'Nike Inc.',
      sketch_url: 'http://example.com/sketch.jpg',
    });
    renderPrint('PRT-SK1');
    const img = await screen.findByAltText('Design sheet sketch');
    expect(img).toHaveAttribute('src', 'http://example.com/sketch.jpg');
  });
});

describe('DesignSheetPrintPage — material breakdown', () => {
  beforeEach(() => resetDb());

  it('renders every material row with the combined running total', async () => {
    renderPrint();
    const table = await screen.findByTestId('print-material-grid');
    expect(within(table).getByText('Type')).toBeInTheDocument();
    expect(within(table).getByText('Supplier')).toBeInTheDocument();
    expect(within(table).getByText('W/Size')).toBeInTheDocument();
    for (const description of [
      'SANDWASH LINEN',
      'BUTTON 4 HOLES',
      'NYLON ZIPPER FRONT FLY',
      'ELASTIC BAND',
      'FUSING',
      'POLY COTTON POCKET BAG',
    ]) {
      expect(within(table).getByText(description)).toBeInTheDocument();
    }
    expect(within(table).getByText('5.42')).toBeInTheDocument();
    expect(within(table).getByText('FOURSEASONS')).toBeInTheDocument();
  });

  it('shows a placeholder when the design has no material items', async () => {
    renderPrint('REG-1003');
    expect(await screen.findByText('No material items')).toBeInTheDocument();
  });

  it('keeps only ticked materials and recomputes the total', async () => {
    const user = userEvent.setup();
    renderPrint();
    const tick = await screen.findByRole('checkbox', { name: /SANDWASH LINEN/ });
    await user.click(tick);
    const table = screen.getByTestId('print-material-grid');
    expect(within(table).getByText('SANDWASH LINEN')).toBeInTheDocument();
    expect(within(table).queryByText('BUTTON 4 HOLES')).not.toBeInTheDocument();
    expect(within(table).queryByText('FUSING')).not.toBeInTheDocument();
    expect(screen.getByTestId('material-total')).toHaveTextContent('1.67');
    await user.click(tick);
    expect(within(table).getByText('BUTTON 4 HOLES')).toBeInTheDocument();
    expect(screen.getByTestId('material-total')).toHaveTextContent('5.42');
  });

  it('includes every material by default with an empty include set', async () => {
    renderPrint();
    const table = await screen.findByTestId('print-material-grid');
    const checkboxes = within(table).getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(6);
    for (const checkbox of checkboxes) {
      expect(checkbox).not.toBeChecked();
    }
    expect(within(table).getByText('5.42')).toBeInTheDocument();
  });
});

describe('DesignSheetPrintPage — printing and preview', () => {
  let printSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetDb();
    printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
  });

  it('opens the print dialog when Print is pressed', async () => {
    const user = userEvent.setup();
    renderPrint();
    const printButton = await screen.findByRole('button', { name: 'Print' });
    await user.click(printButton);
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('toggles preview: hides the toolbar actions and reveals Exit Preview', async () => {
    const user = userEvent.setup();
    renderPrint();
    const previewButton = await screen.findByRole('button', { name: 'Preview' });
    await user.click(previewButton);
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exit Preview' })).toBeInTheDocument();
    expect(screen.getByTestId('print-area')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Exit Preview' }));
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
  });

  it('marks only the sheet area for printing, not the toolbar', async () => {
    renderPrint();
    await screen.findByTestId('print-area');
    expect(screen.getByTestId('print-area')).not.toHaveClass('no-print');
    expect(screen.getByTestId('print-toolbar')).toHaveClass('no-print');
  });
});

describe('DesignSheetPrintPage — errors and navigation', () => {
  beforeEach(() => resetDb());

  it('links back to the design detail page', async () => {
    renderPrint();
    const back = await screen.findByRole('link', { name: /Back to design/ });
    expect(back).toHaveAttribute('href', '/designs/REG-1001');
  });

  it('shows Design not found for an unknown code', async () => {
    renderPrint('NOPE-1');
    expect(await screen.findByText('Design not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to register' })).toHaveAttribute(
      'href',
      '/design',
    );
  });
});