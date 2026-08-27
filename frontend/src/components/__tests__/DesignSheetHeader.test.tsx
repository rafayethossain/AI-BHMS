import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('../../api/client', () => ({
  merchApi: { transitionDesignSheet: vi.fn() },
}));

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));

import DesignSheetHeader from '../DesignSheetHeader';
import { merchApi } from '../../api/client';
import type { DesignSheet } from '../../api/client';

const sheet: DesignSheet = {
  id: 'ds-1',
  tech_pack: 'tp-1',
  status: 'new',
  style_code: '67741T',
  buyer_name: 'CMT Apparel',
  file_number: 'TP-1002',
  sketch_url: null,
  issue_date: '2026-08-01',
  block: 'Main Block',
  based_on: 'Base 2026',
  customer: 'Addidas',
  style_number: '67741T',
  size: 'S-2XL',
  designer: 'Alice',
  pattern_cutter: 'Bob',
  issuer: 'Carol',
  cloth_code: 'CL-42',
  length: '40in',
  sketch: 'Flat sketch ref',
  description: 'Wide leg pant',
  note: 'Front pocket change',
  sketch_annotations: [],
  fit_specs: [],
  job_requests: [],
  created_at: '2026-08-27T10:00:00Z',
  updated_at: '2026-08-27T10:00:00Z',
};

function renderHeader(overrides?: Partial<DesignSheet>) {
  const props = { sheet: { ...sheet, ...overrides } };
  return { ...render(<MemoryRouter><DesignSheetHeader {...props} /></MemoryRouter>), props };
}

describe('DesignSheetHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 14 design-info fields', () => {
    renderHeader();
    const labels = ['Issue Date', 'Block', 'Based On', 'Customer', 'Style Number', 'Size', 'Designer', 'Pattern Cutter', 'Issuer', 'Cloth Code', 'Length', 'Sketch', 'Description', 'Note'];
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    expect(screen.getByText('Main Block')).toBeInTheDocument();
    expect(screen.getByText('Base 2026')).toBeInTheDocument();
    expect(screen.getByText('Addidas')).toBeInTheDocument();
    expect(screen.getByText('Wide leg pant')).toBeInTheDocument();
  });

  it('shows the style header (file number, style code, buyer)', () => {
    renderHeader();
    expect(screen.getByText('TP-1002')).toBeInTheDocument();
    expect(screen.getAllByText('67741T').length).toBeGreaterThan(0);
    expect(screen.getByText('CMT Apparel')).toBeInTheDocument();
  });

  it('renders a status badge for the current status', () => {
    renderHeader({ status: 'new' });
    expect(screen.getAllByText('New').length).toBeGreaterThan(0);
  });

  it('calls transitionDesignSheet and onStatusChange when status changes', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    (merchApi.transitionDesignSheet as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { status: 'closed', message: 'Design sheet set to Closed' },
    });
    render(<MemoryRouter><DesignSheetHeader sheet={sheet} onStatusChange={onStatusChange} /></MemoryRouter>);

    await user.selectOptions(screen.getByLabelText('Status'), 'closed');
    await waitFor(() => {
      expect(merchApi.transitionDesignSheet).toHaveBeenCalledWith('ds-1', 'closed');
      expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'closed' }));
    });
  });

  it('shows a toast when the status change fails', async () => {
    const user = userEvent.setup();
    (merchApi.transitionDesignSheet as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    render(<MemoryRouter><DesignSheetHeader sheet={sheet} /></MemoryRouter>);

    await user.selectOptions(screen.getByLabelText('Status'), 'rejected');
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('error', expect.stringMatching(/failed/i));
    });
  });
});