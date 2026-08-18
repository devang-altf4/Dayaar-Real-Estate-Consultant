export function getJwtSecret(
  variableName: 'JWT_SECRET' | 'JWT_REFRESH_SECRET',
): string {
  const configured = process.env[variableName];
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${variableName} must be configured in production.`);
  }

  return variableName === 'JWT_SECRET'
    ? 'development-only-access-secret-change-before-production'
    : 'development-only-refresh-secret-change-before-production';
}
