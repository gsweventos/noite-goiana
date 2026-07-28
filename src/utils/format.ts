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
