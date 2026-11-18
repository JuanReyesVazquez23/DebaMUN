import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnswerText } from './AnswerText';

describe('AnswerText', () => {
  it('convierte el énfasis del asistente en elementos reales', () => {
    const { container } = render(
      <AnswerText
        text={'**Evidencia por fuente**\n\n1. **Suiza · IA y educación** — Dato del corpus _( Administración Federal Suiza )_'}
      />,
    );

    expect(screen.getByText('Evidencia por fuente').tagName).toBe('STRONG');
    expect(screen.getByText('Suiza · IA y educación').tagName).toBe('STRONG');
    expect(container.textContent).not.toContain('**');
    expect(container.textContent).not.toContain('_(');
    expect(screen.getByText('Administración Federal Suiza').tagName).toBe('EM');
  });

  it('mantiene encabezados y viñetas sin marcar', () => {
    const { container } = render(<AnswerText text={'## Cómo usarlo\n- Responsable\n- Financiamiento'} />);

    expect(container.textContent).toContain('Cómo usarlo');
    expect(container.textContent).toContain('• Responsable');
    expect(container.textContent).not.toContain('##');
    expect(container.textContent).not.toContain('- Financiamiento');
  });
});
