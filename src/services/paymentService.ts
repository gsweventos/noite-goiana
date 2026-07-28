/**
 * O frontend NUNCA fala diretamente com a API do Mercado Pago nem conhece o
 * Access Token — isso violaria a regra de segurança do projeto ("nenhuma
 * credencial secreta no frontend"). Em vez disso, o frontend chama o backend
 * próprio (Cloud Functions / Cloud Run), que:
 *
 *   1. Cria a "preference" de pagamento no Mercado Pago (Checkout Pro) usando
 *      o Access Token guardado em variável de ambiente do backend;
 *   2. Devolve para o frontend apenas o `init_point` (URL de checkout) e o
 *      `preferenceId`;
 *   3. Recebe o webhook do Mercado Pago de forma assíncrona, valida o
 *      pagamento consultando a API do MP pelo `payment_id` (nunca confiando
 *      só no corpo do webhook) e só então gera o ingresso.
 *
 * Ver functions/src/payments.ts para a implementação de referência do backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export interface CreatePreferencePayload {
  eventoId: string;
  lotId: string;
  quantidade: number;
  comprador: {
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
  };
}

export interface CreatePreferenceResponse {
  preferenceId: string;
  initPoint: string; // URL do Checkout Pro do Mercado Pago
  paymentId: string; // id interno (Firestore) do registro de pagamento, ainda "pendente"
}

export const paymentService = {
  async createPreference(payload: CreatePreferencePayload): Promise<CreatePreferenceResponse> {
    if (!API_BASE_URL) {
      // Modo demonstração: sem backend configurado, simulamos a resposta para
      // que o fluxo de checkout continue navegável na interface.
      await new Promise((r) => setTimeout(r, 900));
      return {
        preferenceId: 'demo-preference',
        initPoint: '#checkout-demo',
        paymentId: `demo-${Date.now()}`,
      };
    }

    const res = await fetch(`${API_BASE_URL}/payments/create-preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error('Não foi possível iniciar o pagamento. Tente novamente em instantes.');
    }
    return res.json();
  },

  async getPaymentStatus(paymentId: string): Promise<{ status: string; ticketIds: string[] }> {
    if (!API_BASE_URL) {
      return { status: 'aprovado', ticketIds: [] };
    }
    const res = await fetch(`${API_BASE_URL}/payments/${paymentId}/status`);
    if (!res.ok) throw new Error('Não foi possível consultar o status do pagamento.');
    return res.json();
  },
};
