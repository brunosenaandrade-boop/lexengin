/**
 * CPF and CNPJ validation utilities
 */

/**
 * Validate CPF (Brazilian individual taxpayer ID)
 */
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');

  if (cleaned.length !== 11) return false;

  // Check for known invalid CPFs
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[9])) return false;

  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[10])) return false;

  return true;
}

/**
 * Validate CNPJ (Brazilian company taxpayer ID)
 */
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');

  if (cleaned.length !== 14) return false;

  // Check for known invalid CNPJs
  if (/^(\d)\1{13}$/.test(cleaned)) return false;

  // Validate first check digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleaned[12])) return false;

  // Validate second check digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cleaned[13])) return false;

  return true;
}

/**
 * Validate CPF or CNPJ based on length
 */
export function isValidCPFCNPJ(value: string): boolean {
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length === 11) return isValidCPF(cleaned);
  if (cleaned.length === 14) return isValidCNPJ(cleaned);

  return false;
}

/**
 * Generate a valid random CPF (for testing purposes only)
 */
export function generateCPF(): string {
  const randomDigits = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10)
  );

  // Calculate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += randomDigits[i] * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  randomDigits.push(remainder);

  // Calculate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += randomDigits[i] * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  randomDigits.push(remainder);

  return randomDigits.join('');
}

/**
 * Generate a valid random CNPJ (for testing purposes only)
 */
export function generateCNPJ(): string {
  const randomDigits = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 10)
  );
  // Add branch number (0001 for main branch)
  randomDigits.push(0, 0, 0, 1);

  // Calculate first check digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += randomDigits[i] * weights1[i];
  }
  let remainder = sum % 11;
  randomDigits.push(remainder < 2 ? 0 : 11 - remainder);

  // Calculate second check digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += randomDigits[i] * weights2[i];
  }
  remainder = sum % 11;
  randomDigits.push(remainder < 2 ? 0 : 11 - remainder);

  return randomDigits.join('');
}

/**
 * Get CPF/CNPJ type
 */
export function getCPFCNPJType(value: string): 'cpf' | 'cnpj' | 'unknown' {
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length === 11) return 'cpf';
  if (cleaned.length === 14) return 'cnpj';

  return 'unknown';
}

/**
 * Clean CPF/CNPJ (remove formatting)
 */
export function cleanCPFCNPJ(value: string): string {
  return value.replace(/\D/g, '');
}
