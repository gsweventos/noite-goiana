import { EventCategory, EventItem, Ticket, Payment } from '@/types';

/**
 * Dados fictícios usados apenas para demonstração local (modo mock).
 * Em produção, essas informações vêm do Firestore através dos serviços em src/services.
 */

export const mockCategories: EventCategory[] = [
  { id: 'cat-shows', nome: 'Shows', slug: 'shows', icone: 'Music' },
  { id: 'cat-baladas', nome: 'Baladas', slug: 'baladas', icone: 'PartyPopper' },
  { id: 'cat-universitarias', nome: 'Festas Universitárias', slug: 'universitarias', icone: 'GraduationCap' },
  { id: 'cat-festivais', nome: 'Festivais', slug: 'festivais', icone: 'Sparkles' },
];

const img = (seed: string) => `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=1200&q=80`;

export const mockEvents: EventItem[] = [
  {
    id: 'evt-001',
    slug: 'sertanejo-universitario-goiania',
    nome: 'Sertanejo Universitário — Edição Goiânia',
    descricaoCurta: 'A maior festa universitária do Centro-Oeste retorna com line-up triplo.',
    descricao:
      'Uma noite inteira dedicada ao sertanejo universitário, com três atrações principais, open bar premium e estrutura completa para até 8 mil pessoas. Portões abrem às 22h.',
    imagemCapa: img('photo-1470229722913-7c0e2dbbafd3'),
    imagemBanner: img('photo-1493225457124-a3eb161ffa5f'),
    categoriaId: 'cat-universitarias',
    organizador: 'Noite Goiana Produções',
    local: {
      local: 'Arena Eventos Goiânia',
      endereco: 'Av. Perimetral Norte, 1200',
      cidade: 'Goiânia',
      estado: 'GO',
      latitude: -16.6799,
      longitude: -49.255,
    },
    dataInicio: '2026-08-22T22:00:00-03:00',
    dataFim: '2026-08-23T05:00:00-03:00',
    capacidade: 8000,
    lotes: [
      { id: 'lot-1', nome: '1º Lote', preco: 60, quantidadeTotal: 2000, quantidadeVendida: 1840, dataInicio: '2026-06-01', dataFim: '2026-07-01', ativo: false },
      { id: 'lot-2', nome: '2º Lote', preco: 80, quantidadeTotal: 3000, quantidadeVendida: 1120, dataInicio: '2026-07-02', dataFim: '2026-08-10', ativo: true },
      { id: 'lot-3', nome: 'VIP', preco: 150, quantidadeTotal: 500, quantidadeVendida: 90, dataInicio: '2026-07-02', dataFim: '2026-08-20', ativo: true },
    ],
    regulamento: 'Proibida a entrada de menores de 18 anos. Ingresso pessoal e intransferível, vinculado ao CPF do comprador.',
    status: 'publicado',
    destaque: true,
    criadoEm: '2026-05-10T12:00:00-03:00',
  },
  {
    id: 'evt-002',
    slug: 'neon-nights-festival',
    nome: 'Neon Nights Festival',
    descricaoCurta: 'Eletrônica, luzes e uma pista a céu aberto para 5 mil pessoas.',
    descricao:
      'Festival eletrônico com line-up nacional e internacional, arena a céu aberto, praça de alimentação e estrutura premium. Evento autoral da Noite Goiana.',
    imagemCapa: img('photo-1516450360452-9312f5e86fc7'),
    imagemBanner: img('photo-1470225620780-dba8ba36b745'),
    categoriaId: 'cat-festivais',
    organizador: 'Neon Entretenimento',
    local: {
      local: 'Parque de Exposições',
      endereco: 'Rod. GO-020, km 3',
      cidade: 'Goiânia',
      estado: 'GO',
      latitude: -16.62,
      longitude: -49.28,
    },
    dataInicio: '2026-09-12T18:00:00-03:00',
    dataFim: '2026-09-13T04:00:00-03:00',
    capacidade: 5000,
    lotes: [
      { id: 'lot-1', nome: 'Lote Promocional', preco: 90, quantidadeTotal: 1500, quantidadeVendida: 1500, dataInicio: '2026-05-01', dataFim: '2026-06-01', ativo: false },
      { id: 'lot-2', nome: '2º Lote', preco: 120, quantidadeTotal: 2000, quantidadeVendida: 640, dataInicio: '2026-06-02', dataFim: '2026-08-30', ativo: true },
    ],
    regulamento: 'Evento +18. Não é permitida a entrada com câmeras profissionais sem credenciamento de imprensa.',
    status: 'publicado',
    destaque: true,
    criadoEm: '2026-04-02T09:30:00-03:00',
  },
  {
    id: 'evt-003',
    slug: 'stand-up-comedy-night',
    nome: 'Stand-Up Comedy Night',
    descricaoCurta: 'Uma noite de comédia com os maiores nomes do humor goiano.',
    descricao:
      'Line-up com quatro comediantes locais e um convidado nacional. Casa intimista com mesas numeradas e open food no valor do ingresso VIP.',
    imagemCapa: img('photo-1527224857830-43a7acc85260'),
    imagemBanner: img('photo-1508973379184-7517410fb0bc'),
    categoriaId: 'cat-shows',
    organizador: 'Rir Produções',
    local: {
      local: 'Teatro Sesc',
      endereco: 'Rua T-30, 500',
      cidade: 'Goiânia',
      estado: 'GO',
    },
    dataInicio: '2026-08-05T21:00:00-03:00',
    dataFim: '2026-08-05T23:30:00-03:00',
    capacidade: 400,
    lotes: [
      { id: 'lot-1', nome: 'Único', preco: 45, quantidadeTotal: 400, quantidadeVendida: 210, dataInicio: '2026-06-10', dataFim: '2026-08-04', ativo: true },
    ],
    regulamento: 'Classificação indicativa: 16 anos. Meia-entrada mediante comprovação na entrada.',
    status: 'publicado',
    criadoEm: '2026-05-20T15:00:00-03:00',
  },
  {
    id: 'evt-004',
    slug: 'baile-black-anos-2000',
    nome: 'Baile Black — Anos 2000',
    descricaoCurta: 'R&B, funk e hip-hop dos anos 2000 em uma pista retrô.',
    descricao: 'Uma viagem no tempo com os maiores hits do R&B e hip-hop dos anos 2000, decoração temática e DJ residente.',
    imagemCapa: img('photo-1571266028243-d220c9c3b31d'),
    imagemBanner: img('photo-1514525253161-7a46d19cd819'),
    categoriaId: 'cat-baladas',
    organizador: 'Noite Goiana Produções',
    local: {
      local: 'Club 22',
      endereco: 'Av. T-9, 850',
      cidade: 'Goiânia',
      estado: 'GO',
    },
    dataInicio: '2026-08-15T23:00:00-03:00',
    dataFim: '2026-08-16T05:00:00-03:00',
    capacidade: 1200,
    lotes: [
      { id: 'lot-1', nome: '1º Lote', preco: 35, quantidadeTotal: 400, quantidadeVendida: 400, dataInicio: '2026-06-01', dataFim: '2026-07-15', ativo: false },
      { id: 'lot-2', nome: '2º Lote', preco: 50, quantidadeTotal: 800, quantidadeVendida: 310, dataInicio: '2026-07-16', dataFim: '2026-08-14', ativo: true },
    ],
    regulamento: 'Entrada permitida a partir de 18 anos, mediante documento com foto.',
    status: 'publicado',
    criadoEm: '2026-05-28T10:00:00-03:00',
  },
];

export const mockTickets: Ticket[] = [
  {
    id: 'a1b2c3d4-0001',
    codigo: 'NG-8F2K9X',
    qrPayload: 'NG:a1b2c3d4-0001:evt-001:sig9f2k',
    eventoId: 'evt-001',
    eventoNome: 'Sertanejo Universitário — Edição Goiânia',
    lotId: 'lot-2',
    lotNome: '2º Lote',
    compradorNome: 'Maria Silva',
    compradorCpf: '000.000.000-00',
    compradorEmail: 'maria@example.com',
    numero: 1,
    status: 'valido',
    criadoEm: '2026-07-01T14:22:00-03:00',
    paymentId: 'pay-001',
  },
];

export const mockPayments: Payment[] = [
  {
    id: 'pay-001',
    mpPaymentId: '123456789',
    mpPreferenceId: 'pref-abc123',
    eventoId: 'evt-001',
    compradorNome: 'Maria Silva',
    compradorCpf: '000.000.000-00',
    compradorEmail: 'maria@example.com',
    compradorTelefone: '(62) 90000-0000',
    quantidade: 1,
    lotId: 'lot-2',
    valorTotal: 80,
    status: 'aprovado',
    criadoEm: '2026-07-01T14:20:00-03:00',
    atualizadoEm: '2026-07-01T14:22:00-03:00',
  },
];
