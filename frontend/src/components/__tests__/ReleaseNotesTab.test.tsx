import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/client', () => ({
  helpApi: {
    getReleaseNotes: vi.fn(),
  },
}));

import ReleaseNotesTab from '../ReleaseNotesTab';
import { helpApi } from '../../api/client';

function note(id: string, version: string, title: string, body: string, releasedAt: string) {
  return {
    id, version, title, body, released_at: releasedAt, is_published: true,
    created_at: releasedAt,
  };
}

describe('ReleaseNotesTab', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders release notes as collapsible cards', async () => {
    (helpApi.getReleaseNotes as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        count: 2,
        results: [
          note('1', '1.1.0', 'New Features', 'Added help center.', '2026-09-01T10:00:00Z'),
          note('2', '1.0.0', 'Initial', 'Launch version.', '2026-08-01T10:00:00Z'),
        ],
      },
    });
    render(<ReleaseNotesTab />);
    expect(await screen.findByText('New Features')).toBeInTheDocument();
    expect(screen.getByText('Initial')).toBeInTheDocument();
    expect(screen.getByText('v1.1.0')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
  });

  it('expands the first note by default and shows its body', async () => {
    (helpApi.getReleaseNotes as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        count: 1,
        results: [note('1', '1.1.0', 'New Features', 'Added help center.', '2026-09-01T10:00:00Z')],
      },
    });
    render(<ReleaseNotesTab />);
    expect(await screen.findByText('Added help center.')).toBeInTheDocument();
  });

  it('toggles expansion when a note header is clicked', async () => {
    (helpApi.getReleaseNotes as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        count: 2,
        results: [
          note('1', '1.1.0', 'First Note', 'Body one', '2026-09-01T10:00:00Z'),
          note('2', '1.0.0', 'Second Note', 'Body two', '2026-08-01T10:00:00Z'),
        ],
      },
    });
    render(<ReleaseNotesTab />);
    expect(await screen.findByText('Body one')).toBeInTheDocument();
    // Clicking the first note closes it (body disappears)
    fireEvent.click(screen.getByText('First Note'));
    expect(screen.queryByText('Body one')).not.toBeInTheDocument();
  });

  it('shows empty state when no notes exist', async () => {
    (helpApi.getReleaseNotes as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 0, results: [] },
    });
    render(<ReleaseNotesTab />);
    expect(await screen.findByText(/no release notes available/i)).toBeInTheDocument();
  });
});
