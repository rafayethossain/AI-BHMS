import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../../api/client', () => ({
  merchApi: { getDesignSheet: vi.fn() },
}));

import DesignSheetPage from '../DesignSheetPage';
import { merchApi } from '../../api/client';
import type { DesignSheet } from '../../api/client';

const designSheet: DesignSheet = {
  id: 'ds-1',
  tech_pack: 'tp-1',
  status: 'new',
  style_code: '67741T',
  buyer_name: 'CMT Apparel',
  file_number: 'TP-1001',
  sketch_url: null,
  issue_date: null,
  block: '',
  based_on: '',
  customer: '',
  style_number: 'DS-STYLE-001',
  size: '',
  designer: '',
  pattern_cutter: '',
  issuer: '',
  cloth_code: '',
  length: '',
  sketch: '',
  description: '',
  note: '',
  sketch_annotations: [],
  fit_specs: [],
  job_requests: [],
  created_at: '2026-08-27T10:00:00Z',
  updated_at: '2026-08-27T10:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/design-sheets/ds-1']}>
      <Routes>
        <Route path="/design-sheets/:id" element={<DesignSheetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DesignSheetPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while the design sheet is being fetched', () => {
    (merchApi.getDesignSheet as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByTestId('design-sheet-loading')).toBeInTheDocument();
  });

  it('renders the header with file number, style code and buyer after load', async () => {
    (merchApi.getDesignSheet as ReturnType<typeof vi.fn>).mockResolvedValue({ data: designSheet });
    renderPage();
    expect(await screen.findByText('TP-1001')).toBeInTheDocument();
    expect(screen.getByText('67741T')).toBeInTheDocument();
    expect(screen.getByText('CMT Apparel')).toBeInTheDocument();
  });

  it('renders a status badge for the design sheet', async () => {
    (merchApi.getDesignSheet as ReturnType<typeof vi.fn>).mockResolvedValue({ data: designSheet });
    renderPage();
    expect((await screen.findAllByText('New')).length).toBeGreaterThan(0);
  });

  it('renders the Sketch, Fit Specs and Job Requests sections', async () => {
    (merchApi.getDesignSheet as ReturnType<typeof vi.fn>).mockResolvedValue({ data: designSheet });
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Sketch' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fit Specs' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Job Requests' })).toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    (merchApi.getDesignSheet as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText(/failed to load design sheet/i)).toBeInTheDocument();
  });
});