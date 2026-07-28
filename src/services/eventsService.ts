import { EventItem, EventCategory } from '@/types';
import { USE_MOCK, db } from '@/lib/firebase';
import { mockEvents, mockCategories } from './mockData';

export interface EventFilters {
  cidade?: string;
  categoriaId?: string;
  precoMax?: number;
  busca?: string;
}

/**
 * Camada de acesso a dados dos eventos.
 * Hoje: lê de src/services/mockData.ts (USE_MOCK === true, sem .env configurado).
 * Amanhã: basta que USE_MOCK vire false (ao preencher o .env do Firebase) para
 * que estas mesmas funções passem a consultar o Firestore, sem mudar nenhuma página.
 */
export const eventsService = {
  async listPublished(filters: EventFilters = {}): Promise<EventItem[]> {
    if (USE_MOCK) {
      let list = mockEvents.filter((e) => e.status === 'publicado' || e.status === 'esgotado');
      if (filters.cidade) list = list.filter((e) => e.local.cidade === filters.cidade);
      if (filters.categoriaId) list = list.filter((e) => e.categoriaId === filters.categoriaId);
      if (filters.busca) {
        const q = filters.busca.toLowerCase();
        list = list.filter((e) => e.nome.toLowerCase().includes(q));
      }
      if (filters.precoMax) {
        list = list.filter((e) => Math.min(...e.lotes.map((l) => l.preco)) <= filters.precoMax!);
      }
      return list.sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
    }

    // --- Implementação real com Firestore ---
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const constraints = [where('status', 'in', ['publicado', 'esgotado'])];
    if (filters.cidade) constraints.push(where('local.cidade', '==', filters.cidade));
    if (filters.categoriaId) constraints.push(where('categoriaId', '==', filters.categoriaId));
    const q = query(collection(db!, 'events'), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EventItem);
  },

  async getBySlug(slug: string): Promise<EventItem | null> {
    if (USE_MOCK) {
      return mockEvents.find((e) => e.slug === slug) ?? null;
    }
    const { collection, getDocs, query, where, limit } = await import('firebase/firestore');
    const q = query(collection(db!, 'events'), where('slug', '==', slug), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as EventItem;
  },

  async getFeatured(): Promise<EventItem[]> {
    if (USE_MOCK) return mockEvents.filter((e) => e.destaque);
    const all = await this.listPublished();
    return all.filter((e) => e.destaque);
  },

  async listCategories(): Promise<EventCategory[]> {
    if (USE_MOCK) return mockCategories;
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(db!, 'categories'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EventCategory);
  },

  async listCities(): Promise<string[]> {
    const events = USE_MOCK ? mockEvents : await this.listPublished();
    return Array.from(new Set(events.map((e) => e.local.cidade))).sort();
  },

  // --- Escrita (uso exclusivo da área administrativa) ---
  async create(event: Omit<EventItem, 'id' | 'criadoEm'>): Promise<string> {
    if (USE_MOCK) {
      const id = `evt-${Date.now()}`;
      mockEvents.push({ ...event, id, criadoEm: new Date().toISOString() });
      return id;
    }
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const ref = await addDoc(collection(db!, 'events'), { ...event, criadoEm: serverTimestamp() });
    return ref.id;
  },

  async update(id: string, patch: Partial<EventItem>): Promise<void> {
    if (USE_MOCK) {
      const idx = mockEvents.findIndex((e) => e.id === id);
      if (idx >= 0) mockEvents[idx] = { ...mockEvents[idx], ...patch };
      return;
    }
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db!, 'events', id), patch as Record<string, unknown>);
  },
};
