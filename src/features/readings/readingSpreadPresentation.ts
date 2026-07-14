export const LEGACY_UNSPECIFIED_SPREAD_LABEL = '旧记录（未指定牌阵）';
export const FREE_TABLE_SPREAD_LABEL = '自由牌桌（无固定牌阵）';

export function readingSpreadLabel(
  spreadName: string | undefined,
  unspecifiedLabel = LEGACY_UNSPECIFIED_SPREAD_LABEL,
): string {
  return spreadName ?? unspecifiedLabel;
}
