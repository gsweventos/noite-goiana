/**
 * O Firestore devolve campos de data/hora como um objeto "Timestamp" (com
 * método .toDate()), não como texto — mesmo o código salvando com
 * serverTimestamp(). Esse helper converte isso para uma string ISO comum,
 * do jeito que o resto do app espera (ex: para passar em formatDateTime).
 * Se já vier como string (modo demonstração, sem Firestore), devolve como está.
 */
export function timestampParaIso(valor: unknown): string {
  if (!valor) return new Date().toISOString();
  if (typeof valor === 'string') return valor;
  if (valor && typeof valor === 'object' && 'toDate' in valor && typeof (valor as any).toDate === 'function') {
    return (valor as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
}

export function formatDay(iso: string): string {
  return new Date(iso).getDate().toString().padStart(2, '0');
}

export function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
}

/** Máscara simples de CPF: 000.000.000-00 */
export function maskCpf(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** Máscara simples de telefone: (00) 00000-0000 */
export function maskPhone(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

/** Máscara simples de data: 00/00/0000 */
export function maskDate(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d{1,4})$/, '$1/$2');
}

/** Confere se uma data no formato DD/MM/AAAA é uma data real e não está no futuro. */
export function isValidBirthDate(value: string): boolean {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  const [, dia, mes, ano] = match.map(Number) as unknown as [string, number, number, number];
  const data = new Date(ano, mes - 1, dia);
  const valida = data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
  return valida && data <= new Date() && ano >= 1900;
}

/** Validação de CPF (algoritmo de dígitos verificadores) */
export function isValidCpf(cpfRaw: string): boolean {
  const cpf = cpfRaw.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(cpf[i]) * (len + 1 - i);
    const digit = (sum * 10) % 11;
    return digit === 10 ? 0 : digit;
  };

  return calc(9) === parseInt(cpf[9]) && calc(10) === parseInt(cpf[10]);
}

export function lotProgress(vendidos: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((vendidos / total) * 100));
}
