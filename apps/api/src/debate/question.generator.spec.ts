import { describe, expect, it } from 'vitest';
import { CountriesService } from '../countries/countries.service.js';
import { QuestionGenerator } from './question.generator.js';

function createContext() {
  const countries = new CountriesService();
  countries.onModuleInit();
  return {
    countries,
    committee: countries.requireCommittee('UNESCO'),
    country: countries.requireCountry('CH'),
  };
}

describe('QuestionGenerator', () => {
  it('genera preguntas únicas dentro de una sesión', () => {
    const { committee, country } = createContext();
    const generator = new QuestionGenerator();
    const askedIds: string[] = [];

    for (let index = 0; index < 60; index += 1) {
      const question = generator.next({
        committee,
        country,
        sessionId: 'session-test',
        questionCount: index,
        askedIds,
      });
      expect(askedIds).not.toContain(question.id);
      expect(question.text.length).toBeGreaterThan(60);
      expect(question.focus.length).toBeGreaterThan(3);
      expect(question.suggestedStructure.length).toBe(3);
      askedIds.push(question.id);
    }

    expect(new Set(askedIds).size).toBe(60);
  });

  it('es determinista para la misma sesión y número de pregunta', () => {
    const { committee, country } = createContext();
    const generator = new QuestionGenerator();
    const input = {
      committee,
      country,
      sessionId: 'session-deterministic',
      questionCount: 3,
      askedIds: [],
    };

    const first = generator.next(input);
    const second = generator.next(input);
    expect(second.id).toBe(first.id);
    expect(second.text).toBe(first.text);
  });

  it('personaliza la pregunta con el país y la comisión', () => {
    const { committee, country } = createContext();
    const generator = new QuestionGenerator();
    const question = generator.next({
      committee,
      country,
      sessionId: 'session-personalized',
      questionCount: 0,
      askedIds: [],
    });

    expect(question.committee).toBe('UNESCO');
    expect(question.text).toContain('Suiza');
    expect(question.text.length).toBeGreaterThan(60);
  });

  it('respeta el nivel elegido y evita crisis en básico', () => {
    const { committee, country } = createContext();
    const generator = new QuestionGenerator();

    for (let index = 0; index < 12; index += 1) {
      const basic = generator.next({
        committee,
        country,
        sessionId: 'session-basic',
        questionCount: index,
        askedIds: [],
        difficulty: 1,
      });
      expect(basic.difficulty).toBe(1);
      expect(['apertura', 'seguimiento', 'datos']).toContain(basic.kind);
      expect(basic.timeSeconds).toBeGreaterThanOrEqual(50);
      expect(basic.text.length).toBeLessThan(260);
    }

    const advanced = generator.next({
      committee,
      country,
      sessionId: 'session-advanced',
      questionCount: 0,
      askedIds: [],
      difficulty: 3,
    });
    expect(advanced.difficulty).toBe(3);
  });
});
