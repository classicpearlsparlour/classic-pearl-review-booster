export const productionFrontendUrl = 'https://classic-pearl-review-booster-client.vercel.app';
export const temporaryFrontendUrl = 'https://temporary.vercel.app';

export function getPublicAppUrl() {
  const configuredUrl = process.env.PUBLIC_APP_URL?.trim();
  if (configuredUrl && configuredUrl !== temporaryFrontendUrl) {
    return configuredUrl;
  }

  return process.env.NODE_ENV === 'production' ? productionFrontendUrl : 'http://localhost:5173';
}

export function getAllowedOrigins() {
  const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .filter((origin) => origin !== temporaryFrontendUrl);

  return [...new Set([...configuredOrigins, productionFrontendUrl, 'http://localhost:5173'])];
}
