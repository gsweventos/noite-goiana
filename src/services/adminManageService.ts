import { auth, USE_MOCK } from '@/lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

async function chamarComoAdmin(caminho: string, body: unknown) {
  if (USE_MOCK || !API_BASE_URL) {
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true };
  }

  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('Sessão expirada — faça login de novo.');

  const res = await fetch(`${API_BASE_URL}${caminho}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? 'Não foi possível completar a ação.');
  }
  return res.json();
}

export const adminManageService = {
  /** Apaga um pagamento e todos os ingressos gerados a partir dele. */
  async deletePayment(paymentId: string): Promise<void> {
    await chamarComoAdmin('/admin/delete-payment', { paymentId });
  },

  /** Apaga um único ingresso (sem mexer no resto da compra). */
  async deleteTicket(ticketId: string): Promise<void> {
    await chamarComoAdmin('/admin/delete-ticket', { ticketId });
  },

  /** Ferramenta única: corrige cortesias antigas para o modelo de reserva separada. */
  async corrigirCortesiasAntigas(): Promise<{ corrigidos: number; mensagem?: string }> {
    return chamarComoAdmin('/admin/corrigir-cortesias-antigas', {});
  },
};
