import { Payment } from '@/types';
import { USE_MOCK, db } from '@/lib/firebase';
import { EVENT_ID } from '@/config/event';
import { timestampParaIso } from '@/utils/format';
import { mockPayments } from './mockData';

export const adminPaymentsService = {
  /** Lista todos os pagamentos do evento — uso exclusivo da área administrativa. */
  async listAll(): Promise<Payment[]> {
    if (USE_MOCK) return mockPayments;

    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const q = query(collection(db!, 'payments'), where('eventoId', '==', EVENT_ID));
      const snap = await getDocs(q);
      const payments = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...(data as Omit<Payment, 'id'>),
          criadoEm: timestampParaIso(data.criadoEm),
          atualizadoEm: timestampParaIso(data.atualizadoEm),
        };
      });
      return payments.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    } catch (err) {
      console.error('Não foi possível carregar os pagamentos do Firestore:', err);
      return [];
    }
  },
};
