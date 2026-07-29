import { Ticket } from '@/types';
import { USE_MOCK, db } from '@/lib/firebase';
import { timestampParaIso } from '@/utils/format';
import { mockTickets } from './mockData';

/** Converte um documento do Firestore no formato Ticket, corrigindo os campos de data. */
function paraTicket(id: string, data: Record<string, unknown>): Ticket {
  return {
    id,
    ...(data as Omit<Ticket, 'id'>),
    criadoEm: timestampParaIso(data.criadoEm),
    utilizadoEm: data.utilizadoEm ? timestampParaIso(data.utilizadoEm) : undefined,
  };
}

export const ticketsService = {
  async listByUser(email: string): Promise<Ticket[]> {
    if (USE_MOCK) {
      return mockTickets.filter((t) => t.compradorEmail === email);
    }
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const q = query(collection(db!, 'tickets'), where('compradorEmail', '==', email));
      const snap = await getDocs(q);
      return snap.docs.map((d) => paraTicket(d.id, d.data()));
    } catch (err) {
      console.error('Não foi possível carregar os ingressos do Firestore:', err);
      return [];
    }
  },

  async getById(id: string): Promise<Ticket | null> {
    if (USE_MOCK) return mockTickets.find((t) => t.id === id) ?? null;
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db!, 'tickets', id));
      return snap.exists() ? paraTicket(snap.id, snap.data()!) : null;
    } catch (err) {
      console.error('Não foi possível carregar o ingresso do Firestore:', err);
      return null;
    }
  },

  async listByEvent(eventoId: string): Promise<Ticket[]> {
    if (USE_MOCK) return mockTickets.filter((t) => t.eventoId === eventoId);
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const q = query(collection(db!, 'tickets'), where('eventoId', '==', eventoId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => paraTicket(d.id, d.data()));
    } catch (err) {
      console.error('Não foi possível carregar os ingressos do evento no Firestore:', err);
      return [];
    }
  },
};
