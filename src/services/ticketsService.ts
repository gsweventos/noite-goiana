import { Ticket } from '@/types';
import { USE_MOCK, db } from '@/lib/firebase';
import { mockTickets } from './mockData';

export const ticketsService = {
  async listByUser(email: string): Promise<Ticket[]> {
    if (USE_MOCK) {
      return mockTickets.filter((t) => t.compradorEmail === email);
    }
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const q = query(collection(db!, 'tickets'), where('compradorEmail', '==', email));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ticket);
  },

  async getById(id: string): Promise<Ticket | null> {
    if (USE_MOCK) return mockTickets.find((t) => t.id === id) ?? null;
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db!, 'tickets', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Ticket) : null;
  },

  async listByEvent(eventoId: string): Promise<Ticket[]> {
    if (USE_MOCK) return mockTickets.filter((t) => t.eventoId === eventoId);
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const q = query(collection(db!, 'tickets'), where('eventoId', '==', eventoId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ticket);
  },
};
