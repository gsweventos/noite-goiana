import { mockTickets } from './mockData';

export type CheckinResult = 'autorizado' | 'ja_utilizado' | 'invalido';

export interface CheckinResponse {
  resultado: CheckinResult;
  ticket?: {
    nome: string;
    evento: string;
    lote: string;
    codigo: string;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

/**
 * A validação de um ingresso NUNCA deve ser decidida só no cliente: o app de
 * check-in apenas lê o QR Code e envia o payload para o backend, que:
 *   1. Verifica a assinatura do payload (HMAC);
 *   2. Consulta o Firestore pelo ticketId;
 *   3. Verifica atomicamente (transação) se o status ainda é "valido";
 *   4. Se sim, marca como "utilizado" e registra o check-in — impedindo
 *      reutilização mesmo em caso de duas leituras simultâneas.
 */
export const checkinService = {
  async validateQr(qrPayload: string, operadorId: string): Promise<CheckinResponse> {
    if (!API_BASE_URL) {
      // Modo demonstração local, usando os ingressos mock em memória.
      const ticket = mockTickets.find((t) => t.qrPayload === qrPayload);
      if (!ticket) return { resultado: 'invalido' };
      if (ticket.status === 'utilizado') {
        return {
          resultado: 'ja_utilizado',
          ticket: { nome: ticket.compradorNome, evento: ticket.eventoNome, lote: ticket.lotNome, codigo: ticket.codigo },
        };
      }
      ticket.status = 'utilizado';
      ticket.utilizadoEm = new Date().toISOString();
      ticket.utilizadoPor = operadorId;
      return {
        resultado: 'autorizado',
        ticket: { nome: ticket.compradorNome, evento: ticket.eventoNome, lote: ticket.lotNome, codigo: ticket.codigo },
      };
    }

    const res = await fetch(`${API_BASE_URL}/checkin/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrPayload, operadorId }),
    });
    if (!res.ok) return { resultado: 'invalido' };
    return res.json();
  },
};
