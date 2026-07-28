/** Remove tudo que não for dígito (usado para CPF e telefone). */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Separa "(62) 90000-0000" em { area: "62", number: "900000000" }, como o PagBank exige. */
export function splitPhone(telefone: string): { area: string; number: string } {
  const digits = onlyDigits(telefone);
  return {
    area: digits.slice(0, 2),
    number: digits.slice(2),
  };
}
