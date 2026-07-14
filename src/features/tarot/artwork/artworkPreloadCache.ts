type ImageLoader = (uri: string) => Promise<boolean>;

export function resolveArtworkPreloadUri<Source>(
  source: Source,
  resolveAssetSource?: (source: Source) => { uri?: string },
): string | null {
  return resolveAssetSource?.(source).uri ?? null;
}

export function createArtworkPreloadCache(loadImage: ImageLoader) {
  const requests = new Map<string, Promise<boolean>>();

  return {
    preload(key: string, uri: string) {
      const existing = requests.get(key);
      if (existing) return existing;

      const request = loadImage(uri).catch(() => {
        requests.delete(key);
        return false;
      });
      requests.set(key, request);
      return request;
    },
  };
}
