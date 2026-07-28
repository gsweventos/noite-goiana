/**
 * Tipos centrais do domínio da Noite Goiana.
 * Mantidos independentes de Firebase/Firestore para que o resto do app
 * não dependa diretamente do provedor de dados escolhido.
 */

export type UserRole = 'cliente' | 'admin' | 'operador';

export interface AppUser {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  cpf?: string;
  role: UserRole;
  fotoUrl?: string;
  criadoEm: string; // ISO date
}

export interface EventCategory {
  id: string;
  nome: string;
  slug: string;
  icone?: string;
}

export interface TicketLot {
  id: string;
  nome: string; // ex: "1º Lote", "Lote Promocional", "VIP"
  preco: number; // em reais
  quantidadeTotal: number;
  quantidadeVendida: number;
  dataInicio: string; // ISO
  dataFim: string; // ISO
  ativo: boolean;
}

export type EventStatus = 'rascunho' | 'publicado' | 'esgotado' | 'encerrado' | 'cancelado';

export interface EventLocation {
  local: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
}

export interface EventItem {
  id: string;
  slug: string;
  nome: string;
  descricao: string;
  descricaoCurta: string;
  imagemCapa: string; // usado nos cards
  imagemBanner: string; // usado no topo da página do evento
  categoriaId: string;
  organizador: string;
  local: EventLocation;
  dataInicio: string; // ISO
  dataFim: string; // ISO
  capacidade: number;
  lotes: TicketLot[];
  regulamento: string;
  status: EventStatus;
  destaque?: boolean;
  criadoEm: string;
}

export type TicketStatus = 'valido' | 'utilizado' | 'cancelado';

export interface Ticket {
  id: string; // UUID único
  codigo: string; // código curto legível, ex: NG-8F2K9X
  qrPayload: string; // conteúdo criptografado/assinado embutido no QR Code
  eventoId: string;
  eventoNome: string;
  lotId: string;
  lotNome: string;
  compradorNome: string;
  compradorCpf: string;
  compradorEmail: string;
  numero: number; // número sequencial do ingresso dentro da compra
  status: TicketStatus;
  criadoEm: string;
  utilizadoEm?: string;
  utilizadoPor?: string; // operador responsável pelo check-in
  paymentId: string;
}

export type PaymentStatus = 'pendente' | 'aprovado' | 'rejeitado' | 'estornado' | 'em_analise';

export interface Payment {
  id: string;
  mpPaymentId?: string; // id retornado pelo Mercado Pago
  mpPreferenceId?: string;
  eventoId: string;
  compradorNome: string;
  compradorCpf: string;
  compradorEmail: string;
  compradorTelefone: string;
  quantidade: number;
  lotId: string;
  valorTotal: number;
  status: PaymentStatus;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CheckinRecord {
  id: string;
  ticketId: string;
  eventoId: string;
  data: string; // ISO
  operadorId: string;
  operadorNome: string;
  resultado: 'autorizado' | 'ja_utilizado' | 'invalido';
}

export interface DashboardStats {
  totalEventos: number;
  eventosAtivos: number;
  ingressosVendidos: number;
  receitaTotal: number;
  checkinsHoje: number;
  vendasPorDia: { data: string; valor: number }[];
}
