/** Remove tudo que não for dígito (usado para CPF e telefone). */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}
