import { randomBytes } from 'crypto';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SPECIAL = '!@#$%&*';
const ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SPECIAL;

/**
 * Generates a random password with at least 1 uppercase, 1 lowercase,
 * 1 digit, and 1 special character.
 */
export function generatePassword(length = 12): string {
  const bytes = randomBytes(length);
  const password: string[] = [];

  // Guarantee at least one of each required character type
  password.push(UPPERCASE[bytes[0] % UPPERCASE.length]);
  password.push(LOWERCASE[bytes[1] % LOWERCASE.length]);
  password.push(DIGITS[bytes[2] % DIGITS.length]);
  password.push(SPECIAL[bytes[3] % SPECIAL.length]);

  // Fill the rest with random characters from all types
  for (let i = 4; i < length; i++) {
    password.push(ALL_CHARS[bytes[i] % ALL_CHARS.length]);
  }

  // Shuffle to avoid predictable positions
  for (let i = password.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
}
