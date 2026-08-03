import { Coupon } from '@/types';
import { auth, db, USE_MOCK } from '@/lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export interface ResultadoValidacaoCupom {
  valido: boolean;
  erro?: string;
  cupom?: { codigo: string; tipo: 'percentual' | 'fixo'; valor: number };
  descontoUnitario?: number;
  precoBaseComDesconto?: number;
  precoFinalComDesconto?: number;
}

async function chamarComoAdmin(caminho: string, body: unknown) {
  if (USE_MOCK || !API_BASE_URL) {
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true };
  }
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('Sessão expirada — faça login de novo.');

  const res = await fetch(`${API_BASE_URL}${caminho}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? 'Não foi possível completar a ação.');
  }
  return res.json();
}

export const couponService = {
  /** Uso público, no checkout — só pra prévia visual, nunca é a fonte de verdade da cobrança. */
  async validar(codigo: string, eventoId: string, lotId: string): Promise<ResultadoValidacaoCupom> {
    if (USE_MOCK || !API_BASE_URL) {
      return { valido: false, erro: 'Cupons não funcionam no modo demonstração.' };
    }
    const res = await fetch(`${API_BASE_URL}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, eventoId, lotId }),
    });
    if (!res.ok) return { valido: false, erro: 'Não foi possível validar o cupom agora.' };
    return res.json();
  },

  /** Uso exclusivo do admin — lista todos os cupons cadastrados. */
  async listarAdmin(): Promise<Coupon[]> {
    if (USE_MOCK) return [];
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(collection(db!, 'coupons'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Coupon);
    } catch (err) {
      console.error('Não foi possível carregar os cupons do Firestore:', err);
      return [];
    }
  },

  async salvar(payload: {
    codigo: string;
    tipo: 'percentual' | 'fixo';
    valor: number;
    ativo: boolean;
    usosMaximos?: number;
    validoAte?: string;
    lotesAplicaveis?: string[];
  }): Promise<void> {
    await chamarComoAdmin('/admin/coupons-save', payload);
  },

  async apagar(codigo: string): Promise<void> {
    await chamarComoAdmin('/admin/coupons-delete', { codigo });
  },
};
