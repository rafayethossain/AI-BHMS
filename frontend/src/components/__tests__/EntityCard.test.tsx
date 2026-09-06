import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import EntityCard from '../EntityCard';
import type { EntityCardProps } from '../EntityCard';

const base: EntityCardProps = {
  id: 'reg-1',
  code: 'REG-1001',
  title: 'Relaxed Jogger',
  status: 'new',
  image: 'http://localhost/media/sketch.png',
  url: '/design-sheets/reg-1',
  metrics: [
    { label: 'Live', value: 3 },
    { label: 'Completed', value: 2 },
  ],
};

function renderCard(overrides: Partial<EntityCardProps> = {}) {
  return render(
    <MemoryRouter>
      <EntityCard {...base} {...overrides} />
    </MemoryRouter>,
  );
}

describe('EntityCard', () => {
  it('renders the default roomy layout', () => {
    const { container } = renderCard();
    expect(container.querySelector('.h-44')).not.toBeNull();
    expect(container.querySelector('.p-4')).not.toBeNull();
    expect(container.querySelector('.text-sm.font-medium')).not.toBeNull();
  });

  it('renders a compact layout with a smaller image, tighter padding and smaller metric text', () => {
    const { container } = renderCard({ compact: true });
    expect(container.querySelector('.h-24')).not.toBeNull();
    expect(container.querySelector('.p-3')).not.toBeNull();
    expect(container.querySelector('.text-xs.font-medium')).not.toBeNull();
    expect(container.querySelector('.h-44')).toBeNull();
    expect(container.querySelector('.p-4')).toBeNull();
  });
});