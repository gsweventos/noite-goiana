import { Ticket, Payment } from '@/types';
import { EVENT_ID } from '@/config/event';

/**
 * Dados fictícios usados apenas para demonstração local (modo mock), até o
 * primeiro pagamento real acontecer via Asaas + webhook. Servem para
 * mostrar como fica a área administrativa (ingressos, clientes, pagamentos)
 * com alguns exemplos preenchidos.
 */

export const mockTickets: Ticket[] = [
  {
    id: 'a1b2c3d4-0001',
    codigo: 'NG-8F2K9X',
    qrPayload: `NG:a1b2c3d4-0001:${EVENT_ID}:sig9f2k`,
    eventoId: EVENT_ID,
    eventoNome: 'Noite Goiana',
    lotId: 'lot-exemplo',
    lotNome: '1º Lote',
    compradorNome: 'Maria Silva',
    compradorCpf: '000.000.000-00',
    compradorEmail: 'maria@example.com',
    numero: 1,
    status: 'valido',
    criadoEm: '2026-07-20T14:22:00-03:00',
    paymentId: 'pay-001',
  },
];

export const mockPayments: Payment[] = [
  {
    id: 'pay-001',
    asaasPaymentId: 'ORDE_123456789',
    asaasCheckoutId: 'CHEC_abc123',
    eventoId: EVENT_ID,
    compradorNome: 'Maria Silva',
    compradorCpf: '000.000.000-00',
    compradorEmail: 'maria@example.com',
    compradorTelefone: '(62) 90000-0000',
    quantidade: 1,
    lotId: 'lot-exemplo',
    valorTotal: 60,
    status: 'aprovado',
    criadoEm: '2026-07-20T14:20:00-03:00',
    atualizadoEm: '2026-07-20T14:22:00-03:00',
  },
];
