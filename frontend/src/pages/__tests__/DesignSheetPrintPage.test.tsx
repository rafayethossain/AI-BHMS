import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const merchApiMock = vi.hoisted(() => ({
  getDesignSheet: vi.fn(),
}));

vi.mock('../../api/client', () => ({ merchApi: merchApiMock }));

import DesignSheetPrintPage from '../DesignSheetPrintPage';
import type { DesignSheet } from '../../api/client';

const baseSheet: DesignSheet = {
  id: 'ds-1',
  tech_pack: 'tp-1',
  status: 'new',
  style_code: '67741T',
  buyer_name: 'CMT Apparel',
  file_number: 'TP-1002',
  sketch_url: null,
  issue_date: '2026-08-01',
  block: 'BLK-9',
  based_on: 'TP-0901',
  customer: 'GC London',
  style_number: 'DS-67741',
  size: 'XS-XXL',
  designer: 'E. Rahman',
  pattern_cutter: 'M. Karim',
  issuer: 'S. Islam',
  cloth_code: 'SK-529',
  length: '13m',
  sketch: 'SANDWASH LINEN',
  description: 'Relaxed shirt',
  note: 'Reversible collar',
  sketch_annotations: [],
  fit_specs: [],
  job_requests: [],
  created_at: '2026-08-27T10:00:00Z',
  updated_at: '2026-08-27T10:00:00Z',
};

const sheetWithData: DesignSheet = {
  ...baseSheet,
  sketch_url: 'http://example.com/sketch.jpg',
  material_items: [
    {
      id: 'bi-1',
      bom_id: 'bom-1',
      type: 'Cloth',
      description_code: 'SANDWASH LINEN XK-529',
      location: 'CUT ANGLE',
      supplier: 'FOURSEASONS',
      colour: 'WHITE',
      width_size: '60in',
      qty: 2.25,
      match: 'Left',
    },
    {
      id: 'bi-2',
      bom_id: 'bom-1',
      type: 'Trims',
      description_code: 'BUTTON 4 HOLES FV9757',
      location: '',
      supplier: '',
      colour: 'BLACK',
      width_size: '25mm',
      qty: 3,
      match: '',
    },
  ],
};

function renderPrint() {
  return render(
    <MemoryRouter initialEntries={['/design-sheets/ds-1/print']}>
      <Routes>
        <Route path="/design-sheets/:id/print" element={<DesignSheetPrintPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DesignSheetPrintPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    merchApiMock.getDesignSheet.mockResolvedValue({ data: baseSheet });
  });

  it('fetches the design sheet by route id', async () => {
    renderPrint();
    await screen.findByTestId('print-header');
    expect(merchApiMock.getDesignSheet).toHaveBeenCalledWith('ds-1');
  });

  it('renders the header section with file, style and buyer', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: sheetWithData });
    renderPrint();
    const header = await screen.findByTestId('print-header');
    expect(header).toHaveTextContent('Design Sheet');
    expect(header).toHaveTextContent('TP-1002');
    expect(header).toHaveTextContent('67741T');
    expect(header).toHaveTextContent('CMT Apparel');
  });

  it('renders the full design information table', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: sheetWithData });
    renderPrint();
    await screen.findByTestId('print-design-info');
    expect(screen.getByText('Issue Date')).toBeInTheDocument();
    expect(screen.getByText('2026-08-01')).toBeInTheDocument();
    expect(screen.getByText('Based On')).toBeInTheDocument();
    expect(screen.getByText('TP-0901')).toBeInTheDocument();
    expect(screen.getByText('Pattern Cutter')).toBeInTheDocument();
    expect(screen.getByText('M. Karim')).toBeInTheDocument();
    expect(screen.getByText('Note')).toBeInTheDocument();
    expect(screen.getByText('Reversible collar')).toBeInTheDocument();
  });

  it('renders the sketch image when a sketch exists', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: sheetWithData });
    renderPrint();
    await screen.findByTestId('print-sketch');
    const img = screen.getByAltText('Design sheet sketch');
    expect(img).toHaveAttribute('src', 'http://example.com/sketch.jpg');
  });

  it('renders a placeholder when there is no sketch', async () => {
    renderPrint();
    await screen.findByTestId('print-sketch');
    expect(screen.getByText('No sketch uploaded')).toBeInTheDocument();
    expect(screen.queryByAltText('Design sheet sketch')).not.toBeInTheDocument();
  });

  it('renders the material breakdown as a table with a quantity total', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: sheetWithData });
    renderPrint();
    const grid = await screen.findByTestId('print-material-grid');
    expect(grid).toHaveTextContent('SANDWASH LINEN XK-529');
    expect(grid).toHaveTextContent('BUTTON 4 HOLES FV9757');
    expect(grid).toHaveTextContent('FOURSEASONS');
    expect(screen.getByTestId('material-total')).toHaveTextContent('5.25');
  });

  it('renders the footer with the Carmel copyright and a timestamp', async () => {
    renderPrint();
    const footer = await screen.findByTestId('print-footer');
    expect(footer).toHaveTextContent('Carmel');
    expect(screen.getByTestId('print-timestamp')).not.toHaveTextContent('');
    expect(screen.getByTestId('print-timestamp')).toHaveTextContent(String(new Date().getFullYear()));
  });

  it('shows an error message when the sheet fails to load', async () => {
    merchApiMock.getDesignSheet.mockRejectedValue(new Error('boom'));
    renderPrint();
    expect(await screen.findByText('Failed to load design sheet')).toBeInTheDocument();
  });

  it('exposes Print and Back navigation in a non-printing toolbar', async () => {
    renderPrint();
    await screen.findByTestId('print-header');
    expect(screen.getByTestId('print-toolbar')).toHaveTextContent('Print');
    expect(screen.getByRole('link', { name: /Back to Design Sheet/ })).toHaveAttribute(
      'href',
      '/design-sheets/ds-1',
    );
  });

  it('renders a print tick box for every material item (none ticked = print all)', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: sheetWithData });
    renderPrint();
    await screen.findByTestId('print-header');
    expect(screen.getByTestId('print-item-tick-bi-1')).toBeInTheDocument();
    expect(screen.getByTestId('print-item-tick-bi-2')).toBeInTheDocument();
    const grid = screen.getByTestId('print-material-grid');
    expect(grid).toHaveTextContent('SANDWASH LINEN XK-529');
    expect(grid).toHaveTextContent('BUTTON 4 HOLES FV9757');
  });

  it('prints only ticked material items when any box is ticked', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: sheetWithData });
    renderPrint();
    await screen.findByTestId('print-header');
    fireEvent.click(screen.getByTestId('print-item-tick-bi-1'));
    const grid = screen.getByTestId('print-material-grid');
    expect(grid).toHaveTextContent('SANDWASH LINEN XK-529');
    expect(grid).not.toHaveTextContent('BUTTON 4 HOLES FV9757');
    expect(screen.getByTestId('material-total')).toHaveTextContent('2.25');
  });

  it('unticking all boxes restores the print-all behaviour', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({ data: sheetWithData });
    renderPrint();
    await screen.findByTestId('print-header');
    fireEvent.click(screen.getByTestId('print-item-tick-bi-1'));
    fireEvent.click(screen.getByTestId('print-item-tick-bi-1'));
    const grid = screen.getByTestId('print-material-grid');
    expect(grid).toHaveTextContent('SANDWASH LINEN XK-529');
    expect(grid).toHaveTextContent('BUTTON 4 HOLES FV9757');
    expect(screen.getByTestId('material-total')).toHaveTextContent('5.25');
  });

  it('renders fit specs with print tick boxes and filters by tick', async () => {
    merchApiMock.getDesignSheet.mockResolvedValue({
      data: {
        ...sheetWithData,
        fit_specs: [
          {
            id: 'fs-1',
            design_sheet: 'ds-1',
            fit_number: 'DEV SPEC',
            fit_date: '2026-08-10',
            description: 'First proto',
            notes: '',
            is_selected: true,
            images: [],
            created_at: '2026-08-10T10:00:00Z',
          },
          {
            id: 'fs-2',
            design_sheet: 'ds-1',
            fit_number: '1ST FIT',
            fit_date: '2026-08-20',
            description: 'Grade set',
            notes: '',
            is_selected: false,
            images: [],
            created_at: '2026-08-20T10:00:00Z',
          },
        ],
      },
    });
    renderPrint();
    await screen.findByTestId('print-fit-specs');
    expect(screen.getByText('DEV SPEC')).toBeInTheDocument();
    expect(screen.getByText('1ST FIT')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('print-fitspec-tick-fs-1'));
    expect(screen.getByText('DEV SPEC')).toBeInTheDocument();
    expect(screen.queryByText('1ST FIT')).not.toBeInTheDocument();
  });

  it('toggles the print preview back and forth with the toolbar actions', async () => {
    renderPrint();
    await screen.findByTestId('print-header');
    fireEvent.click(screen.getByTestId('preview-toggle'));
    expect(screen.getByTestId('print-toolbar')).toHaveTextContent('Exit Preview');
    expect(screen.queryByTestId('print-trigger')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('preview-toggle'));
    expect(screen.getByTestId('print-trigger')).toBeInTheDocument();
  });

  it('triggers the browser print dialog from the toolbar', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderPrint();
    await screen.findByTestId('print-header');
    fireEvent.click(screen.getByTestId('print-trigger'));
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});