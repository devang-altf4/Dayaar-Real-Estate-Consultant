/**
 * Normalizes a phone number into a standard clean format.
 * Strips formatting characters, handles Indian standard +91 or leading 0s.
 *
 * @param phone Raw phone string
 * @returns Clean normalized 10-digit number or E.164 string
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove spaces, hyphens, parentheses, dots
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '').trim();

  // If starts with +91, remove prefix
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length > 10) {
    cleaned = cleaned.substring(1);
  }

  // Strip non-digit characters
  cleaned = cleaned.replace(/\D/g, '');

  return cleaned;
}

/**
 * Formats a phone number for display (+91 98765 43210)
 */
export function formatDisplayPhone(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (normalized.length === 10) {
    return `+91 ${normalized.slice(0, 5)} ${normalized.slice(5)}`;
  }
  return phone;
}

/**
 * Validates whether the normalized phone number is valid (e.g. 10 digits in India)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  return /^[6-9]\d{9}$/.test(normalized);
}
