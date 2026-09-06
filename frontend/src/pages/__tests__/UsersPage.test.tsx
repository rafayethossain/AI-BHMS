import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const gridCapture = vi.hoisted(() => ({
  lastProps: null as Record<string, unknown> | null,
  reset() {
    this.lastProps = null;
  },
}));

vi.mock('../../components/SearchableSelect', () => ({
  default: () => <div data-testid="searchable-select" />,
}));

vi.mock('../../api/client', () => ({
  usersApi: {
    getUsers: vi.fn(),
    getRoles: vi.fn(),
    getUserRoles: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    assignUserRole: vi.fn(),
    removeUserRole: vi.fn(),
  },
}));

vi.mock('../../components/SpreadsheetGrid', () => ({
  default: (props: Record<string, unknown>) => {
    gridCapture.lastProps = props;
    const { data } = props as { data: Record<string, unknown>[] };
    return (
      <div data-testid="spreadsheet-grid">
        {(data as Record<string, unknown>[]).map((row) => (
          <div key={String(row.id)} data-testid={`grid-row-${String(row.id)}`}>
            <span>{String(row.full_name)}</span>
            <span>{String(row.email)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import UsersPage from '../UsersPage';
import { usersApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <UsersPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('UsersPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (usersApi.getRoles as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (usersApi.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [], count: 0 } });
  });

  const user = {
    id: 'u-1',
    username: 'jsmith',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    roles: ['Admin', 'Merchandiser'],
    status: 'active',
    mfa_enabled: false,
    last_login: '2026-08-01T00:00:00Z',
  };

  it('renders rows through the Tabulator grid', async () => {
    (usersApi.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [user], count: 1 },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('Jane Smith')).toBeInTheDocument();
    expect(await screen.findByText('jane@example.com')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (usersApi.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [user], count: 1 },
    });
    renderPage();
    await screen.findByText('Jane Smith');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('full_name')?.title).toBe('Name');
    expect(fieldOf('full_name')?.headerFilter).toBe(true);
    expect(fieldOf('email')?.headerFilter).toBe(true);
    expect(fieldOf('status')).toBeDefined();
    expect(fieldOf('mfa_enabled')).toBeDefined();
    expect(fieldOf('roles')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (usersApi.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [user], count: 1 },
    });
    renderPage();
    await screen.findByText('Jane Smith');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Users');
  });

  it('provides row add/edit/delete action callbacks', async () => {
    (usersApi.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [user], count: 1 },
    });
    renderPage();
    await screen.findByText('Jane Smith');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (usersApi.getUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [user], count: 25 },
    });
    renderPage();
    await screen.findByText('Jane Smith');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});