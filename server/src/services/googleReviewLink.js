const knownReviewLinks = new Map([
  [
    'https://share.google/ANVFFbVH78QgPCRPy',
    'https://search.google.com/local/writereview?placeid=/g/11x5vtnxq3'
  ]
]);

export function getGoogleReviewTarget(link) {
  const cleanLink = String(link || '').trim();
  if (!cleanLink) return cleanLink;

  const mappedLink = knownReviewLinks.get(cleanLink);
  if (mappedLink) return mappedLink;

  try {
    const url = new URL(cleanLink);
    const placeId = url.searchParams.get('placeid');
    if (placeId && url.hostname.includes('google')) {
      return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
    }

    const kgmid = url.searchParams.get('kgmid');
    if (kgmid && url.hostname.includes('google')) {
      return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(kgmid)}`;
    }
  } catch {
    return cleanLink;
  }

  return cleanLink;
}
