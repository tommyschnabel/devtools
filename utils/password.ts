export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export function generatePassword(options: PasswordOptions): string {
  let charset = '';

  if (options.uppercase) charset += UPPERCASE;
  if (options.lowercase) charset += LOWERCASE;
  if (options.numbers) charset += NUMBERS;
  if (options.symbols) charset += SYMBOLS;

  if (charset.length === 0) {
    throw new Error('At least one character type must be selected');
  }

  const randomValues = new Uint32Array(options.length);
  crypto.getRandomValues(randomValues);

  let password = '';
  for (let i = 0; i < options.length; i++) {
    const randomIndex = randomValues[i]! % charset.length;
    password += charset[randomIndex]!;
  }

  return password;
}
