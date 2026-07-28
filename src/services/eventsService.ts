import { EventItem } from '@/types';
import { USE_MOCK, db } from '@/lib/firebase';
import { MAIN_EVENT, EVENT_ID } from '@/config/event';

/**
 * A Noite Goiana é o site de UM evento só. Este serviço existe para manter
 * uma única forma de acessar os dados do evento em todo o app — hoje lendo
 * de src/config/event.ts (USE_MOCK === true), e futuramente lendo do
 * documento único `events/{EVENT_ID}` no Firestore, sem precisar tocar em
 * nenhuma página.
 */
let cachedEvent: EventItem = MAIN_EVENT;

export const eventsService = {
  /** Retorna o evento (única fonte de verdade do site). */
  async getMainEvent(): Promise<EventItem> {
    if (USE_MOCK) return cachedEvent;

    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db!, 'events', EVENT_ID));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as EventItem) : MAIN_EVENT;
    } catch (err) {
      // Se o Firestore falhar (regras ainda não publicadas, documento
      // inexistente, sem internet, etc.), o site continua funcionando com os
      // dados padrão em vez de travar carregando para sempre.
      console.error('Não foi possível carregar o evento do Firestore, usando dados padrão:', err);
      return MAIN_EVENT;
    }
  },

  /** Mantido por compatibilidade com componentes que buscam por slug. */
  async getBySlug(slug: string): Promise<EventItem | null> {
    const evento = await this.getMainEvent();
    return evento.slug === slug ? evento : null;
  },

  /** Atualiza dados do evento (uso exclusivo da área administrativa). */
  async update(patch: Partial<EventItem>): Promise<void> {
    if (USE_MOCK) {
      cachedEvent = { ...cachedEvent, ...patch };
      return;
    }
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db!, 'events', EVENT_ID), patch, { merge: true });
  },
};
