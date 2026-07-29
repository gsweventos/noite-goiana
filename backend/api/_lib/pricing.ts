/**
 * Taxa de serviço do site, somada em cima do valor que o admin define pro
 * ingresso. Precisa ser EXATAMENTE igual à mesma constante do frontend
 * (src/utils/format.ts) — se mudar aqui, muda lá também, senão o valor
 * mostrado no site fica diferente do valor cobrado de verdade.
 */
export const TAXA_SITE_PERCENT = 10;

/** Aplica a taxa de serviço sobre o preço base definido pelo admin. */
export function precoComTaxa(precoBase: number): number {
  return Math.round(precoBase * (1 + TAXA_SITE_PERCENT / 100) * 100) / 100;
}
