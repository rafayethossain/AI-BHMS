import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const navigateMock = vi.fn();

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../../api/client', () => ({
  merchApi: { getDesignSheets: vi.fn() },
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

import DesignSheetsListPage from '../DesignSheetsListPage';
import { merchApi } from '../../api/client';
import type { DesignSheet } from '../../api/client';

const designSheet: DesignSheet = {
  id: 'ds-1',
  tech_pack: 'tp-1',
  status: 'new',
  style_code: '67741T',
  buyer_name: 'CMT Apparel',
  file_number: 'TP-1002',
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
    <MemoryRouter initialEntries={['/design-sheets']}>
      <DesignSheetsListPage />
    </MemoryRouter>,
  );
}

describe('DesignSheetsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading indicator and lists design sheets', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [designSheet] },
    });
    renderPage();
    expect(screen.getByTestId('design-sheets-loading')).toBeInTheDocument();
    expect(await screen.findByText('TP-1002')).toBeInTheDocument();
    expect(screen.getByText('67741T')).toBeInTheDocument();
    expect(screen.getByText('CMT Apparel')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('shows an empty state when no design sheets exist', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 0, results: [] },
    });
    renderPage();
    expect(await screen.findByText(/no design sheets/i)).toBeInTheDocument();
  });

  it('shows an error when the request fails', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
  });

  it('navigates to the detail page when a row is clicked', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [designSheet] },
    });
    renderPage();
    fireEvent.click(await screen.findByText('TP-1002'));
    expect(navigateMock).toHaveBeenCalledWith('/design-sheets/ds-1');
  });
});