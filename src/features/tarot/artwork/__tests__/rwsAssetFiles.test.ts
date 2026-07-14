import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RWS_FRONT_FILENAMES } from '../rwsAssets';

const assetRoot = resolve(process.cwd(), 'assets/tarot/rws');
const frontRoot = resolve(assetRoot, 'fronts');

describe('RWS production asset files', () => {
  it('contains exactly the 78 registered fronts with no missing or orphan files', () => {
    const registered = Object.values(RWS_FRONT_FILENAMES).sort();
    const files = readdirSync(frontRoot)
      .filter((filename) => filename.endsWith('.jpg'))
      .sort();
    expect(registered).toHaveLength(78);
    expect(files).toEqual(registered);
    expect(files.every((filename) => statSync(resolve(frontRoot, filename)).size > 0)).toBe(true);
  });

  it('contains the original app back, fallback, and human-readable attribution', () => {
    expect(existsSync(resolve(assetRoot, 'back/rws_back.png'))).toBe(true);
    expect(existsSync(resolve(assetRoot, 'fallback_front.png'))).toBe(true);
    expect(existsSync(resolve(assetRoot, 'ARTWORK_SOURCE.md'))).toBe(true);
  });

  it('records a public-domain audit row for every individual Commons file', () => {
    const sourceAudit = JSON.parse(
      readFileSync(resolve(assetRoot, 'source-files.json'), 'utf8'),
    ) as {
      files: { cardId: number; assetFilename: string; licenseLabel: string; usageTerms: string }[];
    };
    expect(sourceAudit.files).toHaveLength(78);
    expect(new Set(sourceAudit.files.map((entry) => entry.cardId)).size).toBe(78);
    expect(sourceAudit.files.every((entry) => entry.licenseLabel === 'Public domain')).toBe(true);
    expect(sourceAudit.files.every((entry) => entry.usageTerms === 'Public domain')).toBe(true);
    expect(sourceAudit.files.map((entry) => entry.assetFilename).sort()).toEqual(
      Object.values(RWS_FRONT_FILENAMES).sort(),
    );
  });
});
