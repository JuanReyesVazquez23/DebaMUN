import { describe, expect, it } from 'vitest';
import type { DatabaseService } from './database.service.js';
import { StoreService } from './store.service.js';

function memoryStore() {
  return new StoreService({ isReady: false } as DatabaseService);
}

const base = {
  id: 'c0ffee00-0000-4000-8000-000000000001',
  username: 'Valentina Ríos',
  countryCode: 'CH',
  committee: 'UNESCO' as const,
  grade: 'secundaria-5',
};

describe('StoreService.clearChatMessages', () => {
  it('borra la conversación del delegado y deja el historial vacío', async () => {
    const store = memoryStore();
    await store.restoreDelegate(base);
    await store.addChatMessage({
      delegateId: base.id,
      role: 'user',
      content: '¿Qué organizaciones tiene Dinamarca?',
      sources: [],
    });
    await store.addChatMessage({
      delegateId: base.id,
      role: 'assistant',
      content: 'Danida, Digitaliseringsstyrelsen…',
      sources: [],
    });

    expect(await store.countChats(base.id)).toBe(2);

    const removed = await store.clearChatMessages(base.id);

    expect(removed).toBe(2);
    expect(await store.listChatMessages(base.id)).toEqual([]);
    expect(await store.countChats(base.id)).toBe(0);
  });
});

describe('StoreService.restoreDelegate', () => {
  it('recrea al delegado con el mismo id que guarda el navegador', async () => {
    const store = memoryStore();

    const restored = await store.restoreDelegate(base);

    expect(restored.id).toBe(base.id);
    expect(restored.username).toBe(base.username);
    expect((await store.getDelegate(base.id))?.countryCode).toBe('CH');
  });

  it('no sobrescribe a un delegado que ya existe', async () => {
    const store = memoryStore();
    await store.restoreDelegate(base);

    const again = await store.restoreDelegate({ ...base, username: 'Otro nombre', committee: 'ECOSOC' });

    expect(again.username).toBe(base.username);
    expect(again.committee).toBe('UNESCO');
  });
});
