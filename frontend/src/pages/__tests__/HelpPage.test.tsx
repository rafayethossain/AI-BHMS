import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const navigateMock = vi.fn();

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../components/GuidedTour', () => ({
  resetTour: vi.fn(),
}));

vi.mock('../../components/OnboardingChecklist', () => ({
  default: () => <div data-testid="onboarding-checklist" />,
}));

vi.mock('../../components/ReleaseNotesTab', () => ({
  default: () => <div data-testid="release-notes-tab" />,
}));

import HelpPage from '../HelpPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/help']}>
      <HelpPage />
    </MemoryRouter>,
  );
}

describe('HelpPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows the new Onboarding and Release Notes tabs', () => {
    renderPage();
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Release Notes')).toBeInTheDocument();
  });

  it('renders the onboarding checklist in the Onboarding tab', () => {
    renderPage();
    fireEvent.click(screen.getByText('Onboarding'));
    expect(screen.getByTestId('onboarding-checklist')).toBeInTheDocument();
  });

  it('renders the release notes tab content', () => {
    renderPage();
    fireEvent.click(screen.getByText('Release Notes'));
    expect(screen.getByTestId('release-notes-tab')).toBeInTheDocument();
  });

  it('filters glossary when searching', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Glossary'));
    const input = screen.getByPlaceholderText('Search glossary terms...');
    fireEvent.change(input, { target: { value: 'BOM' } });
    expect(screen.getByText('BOM')).toBeInTheDocument();
    expect(screen.queryByText('AQL')).not.toBeInTheDocument();
  });
});
