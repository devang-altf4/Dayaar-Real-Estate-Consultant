export function getJwtSecret(
  variableName: 'JWT_SECRET' | 'JWT_REFRESH_SECRET',
): string {
  const configured = process.env[variableName];
  if (configured) {
    if (configured.length < 32) {
      throw new Error(`${variableName} too short (min 32 chars).`);
    }
    return configured;
  }

  // Fail-closed in every environment — no committed fallback secrets.
  throw new Error(
    `${variableName} must be configured (min 32 chars). No dev fallback is allowed.`,
  );
}

export function assertJwtSecretsConfigured(): void {
  const access = getJwtSecret('JWT_SECRET');
  const refresh = getJwtSecret('JWT_REFRESH_SECRET');
  if (access === refresh) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must differ.');
  }
}
