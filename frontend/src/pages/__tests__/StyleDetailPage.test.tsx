import { describe, it, expect, vi, beforeEach } from 'vitest';

const navCapture = vi.hoisted(() => ({
  to: null as string | null,
  reset() {
    this.to = null;
  },
}));

vi.mock('../../api/client', () => ({
  default: { patch: vi.fn() },
  merchApi: {
    getStyle: vi.fn(),
    getStyleItems: vi.fn(),
    getStyleVersions: vi.fn(),
    getStyleFileOpenings: vi.fn(),
    getStylePOs: vi.fn(),
    getStyleBOMs: vi.fn(),
    getStyleDesignImages: vi.fn(),
    getStyleTechPacks: vi.fn(),
    getDesignSheets: vi.fn(),
  },
  setupApi: {
    getVendors: vi.fn(),
    getUOMs: vi.fn(),
  },
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'sty-1' }),
    useNavigate: () => (to: string) => { navCapture.to = to; },
  };
});
vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../components/SearchableSelect', () => ({
  default: (props: { value?: string; options: unknown[]; onChange: (v: string) => void; labelKey?: string; placeholder?: string }) => (
    <select
      aria-label={props.placeholder}
      value={props.value ?? ''}
      onChange={(e) => props.onChange(e.target.value)}
    >
      <option value="">—</option>
      {(props.options as { id: string; name: string }[]).map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  ),
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import StyleDetailPage from '../StyleDetailPage';
import { merchApi, setupApi } from '../../api/client';
import type { Style } from '../../api/client';

const STYLE: Style = {
  id: 'sty-1',
  style_number: '67741T',
  name: 'Test Style',
  description: '',
  buyer: 'bx-1',
  buyer_name: 'Aldi',
  status: 'draft',
  block: '59073T',
  based_on: 'TP-1001',
  relationship: 'new',
  designer: 'Des A',
  pattern_cutter: '',
  issuer: '',
  cloth_code: '',
  size: '',
  length: '',
  issue_date: '',
  risk_date: '',
  pattern_request_date: '',
  design_note: '',
  created_at: '2026-09-01T00:00:00Z',
} as unknown as Style;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/styles/sty-1']}>
      <StyleDetailPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  navCapture.reset();
  (merchApi.getStyle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: STYLE });
  (merchApi.getStyleItems as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
  (merchApi.getStyleVersions as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
  (merchApi.getStyleFileOpenings as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
  (merchApi.getStylePOs as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
  (merchApi.getStyleBOMs as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
  (merchApi.getStyleDesignImages as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
  (merchApi.getStyleTechPacks as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
  (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { results: [{ id: 'ds-1', style_id: 'sty-1' }], count: 1 },
  });
  (setupApi.getVendors as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { results: [] },
  });
  (setupApi.getUOMs as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { results: [] },
  });
});

describe('StyleDetailPage Design Information (merged Design surface)', () => {
  it('shows Design Information read-only without an inline editor', async () => {
    renderPage();
    await screen.findByText('Test Style');

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Customer')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Buyer')).not.toBeInTheDocument();
    expect(screen.getAllByText('Aldi').length).toBeGreaterThan(0);
    expect(screen.getByText('59073T')).toBeInTheDocument();
  });

  it('opens the merged design sheet detail for this style', async () => {
    renderPage();
    await screen.findByText('Test Style');

    await userEvent.click(screen.getByRole('button', { name: 'Open in Design' }));
    expect(navCapture.to).toBe('/design-sheets/ds-1');
  });

  it('falls back to the design register when the style has no design sheet', async () => {
    (merchApi.getDesignSheets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [], count: 0 },
    });
    renderPage();
    await screen.findByText('Test Style');

    await userEvent.click(screen.getByRole('button', { name: 'Open in Design' }));
    expect(navCapture.to).toBe('/design');
  });
});