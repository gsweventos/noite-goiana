import { EventItem } from '@/types';

/**
 * A Noite Goiana não é uma plataforma com vários eventos — é o site de UMA
 * festa específica. Este arquivo é a fonte única de verdade sobre ela.
 *
 * Para atualizar data, local, lotes ou textos, basta editar os valores abaixo
 * (ou, futuramente, este mesmo objeto pode vir do Firestore, documento único
 * em vez de uma coleção — a estrutura já está pronta para isso).
 *
 * `lotes: []` sinaliza "ainda não definidos" — a página mostra "em breve" e
 * o botão de compra fica desativado até que pelo menos um lote seja adicionado.
 */
export const EVENT_ID = 'noite-goiana-formosa';

export const MAIN_EVENT: EventItem = {
  id: EVENT_ID,
  slug: 'noite-goiana',
  nome: 'Noite Goiana',
  descricaoCurta: 'Festa de som automotivo em Formosa. Prepare-se para viver a melhor noite automotiva que Formosa já viu.',
  descricao: 'Prepare-se para viver a melhor noite automotiva que Formosa já viu.',
  // Imagens placeholder (banco de imagens gratuito) com clima automotivo/neon —
  // fotos de bancos internacionais não têm exatamente o visual de "deboxe"/som
  // automotivo brasileiro. Troque pela foto real do evento assim que tiver
  // (foto do carro do organizador, de uma edição anterior, do local, etc.).
  imagemCapa: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
  imagemBanner: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1920&q=80',
  categoriaId: 'cat-automotivo',
  organizador: 'Noite Goiana',
  local: {
    local: 'Local a definir',
    endereco: '',
    cidade: 'Formosa',
    estado: 'GO',
  },
  dataInicio: '2026-09-12T22:00:00-03:00',
  dataFim: '2026-09-13T05:00:00-03:00',
  capacidade: 0,
  lotes: [],
  regulamento:
    'Ingresso pessoal e intransferível, vinculado ao CPF do comprador. O evento contará com esquema de segurança reforçado do início ao fim, para garantir uma noite tranquila para todos.',
  status: 'publicado',
  destaque: true,
  criadoEm: '2026-07-28T00:00:00-03:00',
};
