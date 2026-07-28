import { EventItem } from '@/types';
import truckBg from '@/assets/noite-goiana-truck-bg.jpg';

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
  // Foto oficial da divulgação (GSW Eventos) — recorte da camionete do
  // material de arte da festa, usada como fundo do site.
  imagemCapa: truckBg,
  imagemBanner: truckBg,
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
