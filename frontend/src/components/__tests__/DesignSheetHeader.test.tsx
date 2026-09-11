import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('../../api/client', () => ({
  default: { patch: vi.fn() },
  merchApi: {
    transitionDesignSheet: vi.fn(),
    getDesignSheet: vi.fn(),
    updateDesignSheetDesignInfo: vi.fn(),
  },
  setupApi: { getBuyers: vi.fn() },
}));

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));

import DesignSheetHeader from '../DesignSheetHeader';
import api from '../../api/client';
import { merchApi, setupApi } from '../../api/client';
import type { DesignSheet } from '../../api/client';

const sheet: DesignSheet = {
  id: 'ds-1',
  tech_pack: 'tp-1',
  status: 'new',
  style_code: '67741T',
  style_id: 'sty-1',
  buyer_name: 'CMT Apparel',
  file_number: 'TP-1002',
  sketch_url: null,
  issue_date: '2026-08-01',
  block: 'Main Block',
  based_on: 'Base 2026',
  buyer_id: 'b1',
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
  relationship: 'recut',
  risk_date: '2026-09-15',
  pattern_request_date: '2026-09-30',
  sketch_annotations: [],
  layout_order: [],
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
    (setupApi.getBuyers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [], count: 0 },
    });
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

  it('renders all design-info fields as editable inputs with an Update button', () => {
    renderHeader();
    const editable = ['Block', 'Designer', 'Pattern Cutter', 'Issuer', 'Buyer', 'Cloth Code', 'Size', 'Length'];
    editable.forEach((label) => {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Based On')).toBeDisabled();
    expect((screen.getByLabelText('Based On') as HTMLInputElement).placeholder).toBe('Set via copy from source');
    expect(screen.getByLabelText('Relationship')).toBeInTheDocument();
    expect(screen.getByLabelText('Issue Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Risk Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Pattern Request Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Design Note')).toBeInTheDocument();
    const block = screen.getByLabelText('Block') as HTMLInputElement;
    expect(block.value).toBe('Main Block');
    expect(screen.getByRole('button', { name: /update design information/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit design information/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('keeps the design-info fields editable even when no Style is linked', () => {
    renderHeader({ style_id: undefined });
    expect(screen.getByLabelText('Block')).toBeInTheDocument();
    expect(screen.getByLabelText('Design Note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update design information/i })).toBeInTheDocument();
  });

  it('renders Buyer as a dropdown populated from Setup buyers', async () => {
    (setupApi.getBuyers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [{ id: 'b1', name: 'Addidas' }, { id: 'b2', name: 'Aldi 1' }, { id: 'b3', name: 'CMT Co' }], count: 3 },
    });
    renderHeader();
    const buyer = await screen.findByLabelText('Buyer');
    expect(buyer.tagName).toBe('SELECT');
    const ids = Array.from((buyer as HTMLSelectElement).options).map((o) => o.value);
    expect(ids).toEqual(expect.arrayContaining(['', 'b1', 'b2', 'b3']));
    expect((buyer as HTMLSelectElement).value).toBe('b1');
  });

  it('keeps an existing Buyer value as an option', async () => {
    (setupApi.getBuyers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [], count: 0 },
    });
    renderHeader({ buyer_id: 'b9' });
    const buyer = await screen.findByLabelText('Buyer');
    const ids = Array.from((buyer as HTMLSelectElement).options).map((o) => o.value);
    expect(ids).toContain('b9');
    expect((buyer as HTMLSelectElement).value).toBe('b9');
  });

  it('sends a selected buyer as its id', async () => {
    const user = userEvent.setup();
    (setupApi.getBuyers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [{ id: 'b1', name: 'Addidas' }, { id: 'b2', name: 'Aldi 1' }], count: 2 },
    });
    (merchApi.updateDesignSheetDesignInfo as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
    (merchApi.getDesignSheet as ReturnType<typeof vi.fn>).mockResolvedValue({ data: sheet });
    render(<MemoryRouter><DesignSheetHeader sheet={{ ...sheet, buyer_id: 'b1' }} /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getAllByRole('option').length).toBeGreaterThanOrEqual(3);
    });
    fireEvent.change(screen.getByLabelText('Buyer'), { target: { value: 'b2' } });
    await user.click(screen.getByRole('button', { name: /update design information/i }));

    await waitFor(() => {
      expect(merchApi.updateDesignSheetDesignInfo).toHaveBeenCalledWith(
        'ds-1',
        expect.objectContaining({ buyer: 'b2' }),
      );
    });
  });

  it('updates design info through the merged endpoint and refreshes the sheet', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    (merchApi.updateDesignSheetDesignInfo as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
    (merchApi.getDesignSheet as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ...sheet, block: 'New Block', note: 'New note' },
    });
    render(<MemoryRouter><DesignSheetHeader sheet={sheet} onStatusChange={onStatusChange} /></MemoryRouter>);

    await user.clear(screen.getByLabelText('Block'));
    await user.type(screen.getByLabelText('Block'), 'New Block');
    await user.click(screen.getByRole('button', { name: /update design information/i }));

    await waitFor(() => {
      expect(merchApi.updateDesignSheetDesignInfo).toHaveBeenCalledWith(
        'ds-1',
        expect.objectContaining({
          block: 'New Block',
          based_on: 'Base 2026',
          relationship: 'recut',
          design_note: 'Front pocket change',
          risk_date: '2026-09-15',
        }),
      );
      expect(merchApi.getDesignSheet).toHaveBeenCalledWith('ds-1');
      expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({
        block: 'New Block',
        note: 'New note',
      }));
      expect(toastMock).toHaveBeenCalledWith('success', expect.stringMatching(/updated/i));
    });
  });

  it('sends a cleared date as null and a cleared text field as empty string', async () => {
    const user = userEvent.setup();
    (merchApi.updateDesignSheetDesignInfo as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
    (merchApi.getDesignSheet as ReturnType<typeof vi.fn>).mockResolvedValue({ data: sheet });
    render(<MemoryRouter><DesignSheetHeader sheet={sheet} /></MemoryRouter>);

    await user.clear(screen.getByLabelText('Risk Date'));
    await user.clear(screen.getByLabelText('Designer'));
    await user.click(screen.getByRole('button', { name: /update design information/i }));

    await waitFor(() => {
      expect(merchApi.updateDesignSheetDesignInfo).toHaveBeenCalledWith(
        'ds-1',
        expect.objectContaining({ risk_date: null, designer: '' }),
      );
    });
  });

  it('updates design info on the tech pack when no Style is linked', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    (merchApi.updateDesignSheetDesignInfo as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
    (merchApi.getDesignSheet as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ...sheet, style_id: undefined, block: 'New Block', note: 'New note' },
    });
    render(<MemoryRouter><DesignSheetHeader sheet={{ ...sheet, style_id: undefined }} onStatusChange={onStatusChange} /></MemoryRouter>);

    await user.clear(screen.getByLabelText('Block'));
    await user.type(screen.getByLabelText('Block'), 'New Block');
    await user.click(screen.getByRole('button', { name: /update design information/i }));

    await waitFor(() => {
      expect(merchApi.updateDesignSheetDesignInfo).toHaveBeenCalledWith(
        'ds-1',
        expect.objectContaining({ block: 'New Block', design_note: 'Front pocket change' }),
      );
      expect(api.patch).not.toHaveBeenCalled();
      expect(merchApi.getDesignSheet).toHaveBeenCalledWith('ds-1');
      expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ block: 'New Block' }));
    });
  });

  it('shows a toast when updating design info fails', async () => {
    const user = userEvent.setup();
    (merchApi.updateDesignSheetDesignInfo as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    render(<MemoryRouter><DesignSheetHeader sheet={sheet} /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /update design information/i }));
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('error', expect.stringMatching(/failed/i));
    });
  });
});