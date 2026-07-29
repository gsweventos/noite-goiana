import { auth, USE_MOCK } from '@/lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export interface LiberarCortesiaPayload {
  eventoId: string;
  quantidade: number;
  comprador: {
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
    dataNascimento?: string;
  };
  motivo?: string;
}

export const courtesyService = {
  /**
   * Libera ingresso(s) sem pagamento (cortesia). Só funciona logado como
   * admin — o backend confere isso de novo, então não é só uma trava visual.
   */
  async liberarCortesia(payload: LiberarCortesiaPayload): Promise<{ paymentId: string }> {
    if (USE_MOCK || !API_BASE_URL) {
      await new Promise((r) => setTimeout(r, 700));
      return { paymentId: `demo-cortesia-${Date.now()}` };
    }

    const token = await auth?.currentUser?.getIdToken();
    if (!token) throw new Error('Sessão expirada — faça login de novo.');

    const res = await fetch(`${API_BASE_URL}/admin/liberar-cortesia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? 'Não foi possível liberar a cortesia.');
    }
    return res.json();
  },
};
