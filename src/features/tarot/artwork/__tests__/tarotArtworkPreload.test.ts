import { describe, expect, it, vi } from 'vitest';
import { createArtworkPreloadCache, resolveArtworkPreloadUri } from '../artworkPreloadCache';

describe('tarot artwork preload cache', () => {
  it('safely skips URI preloading when the platform has no asset resolver', () => {
    expect(resolveArtworkPreloadUri(42, undefined)).toBeNull();
  });

  it('shares one in-flight load for the same card artwork', async () => {
    const loadImage = vi.fn(async () => true);
    const cache = createArtworkPreloadCache(loadImage);

    const first = cache.preload('rws:1', 'card-1.jpg');
    const second = cache.preload('rws:1', 'card-1.jpg');

    expect(first).toBe(second);
    await expect(first).resolves.toBe(true);
    expect(loadImage).toHaveBeenCalledTimes(1);
  });

  it('allows a failed preload to be retried', async () => {
    const loadImage = vi
      .fn<(uri: string) => Promise<boolean>>()
      .mockRejectedValueOnce(new Error('decode failed'))
      .mockResolvedValueOnce(true);
    const cache = createArtworkPreloadCache(loadImage);

    await expect(cache.preload('rws:2', 'card-2.jpg')).resolves.toBe(false);
    await expect(cache.preload('rws:2', 'card-2.jpg')).resolves.toBe(true);
    expect(loadImage).toHaveBeenCalledTimes(2);
  });
});
