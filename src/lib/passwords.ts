/** New passwords only. Existing credentials are not rejected for being shorter. */
export const MIN_NEW_PASSWORD_LENGTH = 8;

export function newPasswordError(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < MIN_NEW_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_NEW_PASSWORD_LENGTH} characters`;
  }
  return null;
}
