/**
 * The first word of a full name, for the panel's greeting. Full names go up to
 * 120 characters, and the whole name would wrap to six lines on a phone; the
 * design plan allows two (§4). A compound first name keeps only its first word.
 */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
