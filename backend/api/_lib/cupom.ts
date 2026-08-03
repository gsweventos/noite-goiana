import { db } from './firebaseAdmin';
import { precoComTaxa } from './pricing';

export interface ResultadoCupom {
  valido: boolean;
  erro?: string;
  cupom?: { codigo: string; tipo: 'percentual' | 'fixo'; valor: number };
  descontoUnitario?: number; // em reais, por ingresso, sobre o valor TOTAL (já com a taxa incluída)
  precoFinalComDesconto?: number; // valor final por ingresso (total com taxa, já descontado)
}

/**
 * Valida um cupom pra um lote específico e calcula o desconto — ÚNICA fonte
 * de verdade, chamada tanto pelo endpoint de prévia (o que o comprador vê
 * antes de pagar) quanto na hora de criar o pagamento de verdade. Nunca
 * confiar em um valor de desconto vindo do frontend.
 *
 * O desconto é calculado sobre o valor TOTAL (ingresso + taxa de serviço),
 * não só sobre o valor base — ou seja, um cupom de 10% tira 10% do que a
 * pessoa realmente pagaria no fim, taxa incluída.
 */
export async function validarCupom(codigoDigitado: string, lotId: string, precoBase: number): Promise<ResultadoCupom> {
  const codigo = codigoDigitado.trim().toUpperCase();
  if (!codigo) return { valido: false, erro: 'Informe um código de cupom.' };

  const snap = await db.collection('coupons').doc(codigo).get();
  if (!snap.exists) return { valido: false, erro: 'Cupom não encontrado.' };

  const cupom = snap.data()!;

  if (!cupom.ativo) return { valido: false, erro: 'Este cupom não está mais ativo.' };

  if (cupom.validoAte && new Date(cupom.validoAte).getTime() < Date.now()) {
    return { valido: false, erro: 'Este cupom expirou.' };
  }

  if (typeof cupom.usosMaximos === 'number' && cupom.usosAtuais >= cupom.usosMaximos) {
    return { valido: false, erro: 'Este cupom já atingiu o limite de usos.' };
  }

  if (Array.isArray(cupom.lotesAplicaveis) && cupom.lotesAplicaveis.length > 0 && !cupom.lotesAplicaveis.includes(lotId)) {
    return { valido: false, erro: 'Este cupom não é válido para o lote escolhido.' };
  }

  const precoTotalOriginal = precoComTaxa(precoBase); // ingresso + taxa de serviço, valor cheio

  const descontoUnitario =
    cupom.tipo === 'percentual'
      ? Math.round(precoTotalOriginal * (cupom.valor / 100) * 100) / 100
      : Math.min(cupom.valor, precoTotalOriginal);

  const precoFinalComDesconto = Math.max(0, Math.round((precoTotalOriginal - descontoUnitario) * 100) / 100);

  return {
    valido: true,
    cupom: { codigo, tipo: cupom.tipo, valor: cupom.valor },
    descontoUnitario,
    precoFinalComDesconto,
  };
}
