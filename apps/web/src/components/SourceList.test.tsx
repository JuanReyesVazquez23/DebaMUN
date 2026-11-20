import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SourceList } from './SourceList';

describe('SourceList', () => {
  it('no repite una fuente que viene del país y de la comisión', () => {
    const unesco = {
      label: 'UNESCO · IA y educación',
      url: 'https://www.unesco.org/en/digital-education/artificial-intelligence',
      kind: 'multilateral',
    };

    const { container } = render(
      <SourceList
        sources={[
          { label: 'Gobierno de Dinamarca', url: 'https://www.regeringen.dk/', kind: 'official' },
          unesco,
          { ...unesco },
        ]}
      />,
    );

    expect(container.querySelectorAll('.source')).toHaveLength(2);
    expect(screen.getAllByText('UNESCO · IA y educación')).toHaveLength(1);
  });
});
