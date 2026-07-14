import type { CardOrientation, ReversalVariant } from '../../domain/types';
import type { ReversalMode } from './drawTypes';

export function reversalStateLabel(
  orientation: CardOrientation,
  reversalVariant: ReversalVariant,
): string {
  if (orientation === 'upright') return '正位';
  if (reversalVariant === 'left') return '逆位・左旋';
  if (reversalVariant === 'right') return '逆位・右旋';
  return '逆位';
}

export function reversalAccessibilityLabel(
  orientation: CardOrientation,
  reversalVariant: ReversalVariant,
): string {
  if (orientation === 'upright') return '正位';
  if (reversalVariant === 'left') return '逆位，左旋三十度';
  if (reversalVariant === 'right') return '逆位，右旋三十度';
  return '逆位';
}

export function reversalModeLabel(mode: ReversalMode): string {
  if (mode === 'disabled') return '不使用逆位';
  if (mode === 'dual') return '双逆位模式';
  return '普通正逆位';
}

export const compatibleReversalStates = [
  { orientation: 'upright', reversalVariant: null, label: '正位' },
  { orientation: 'reversed', reversalVariant: null, label: '逆位' },
  { orientation: 'reversed', reversalVariant: 'left', label: '逆位・左旋' },
  { orientation: 'reversed', reversalVariant: 'right', label: '逆位・右旋' },
] as const;

export function reversalStatesForMode(mode?: ReversalMode) {
  if (mode === 'disabled') return compatibleReversalStates.slice(0, 1);
  if (mode === 'standard') return compatibleReversalStates.slice(0, 2);
  if (mode === 'dual')
    return [compatibleReversalStates[0], compatibleReversalStates[2], compatibleReversalStates[3]];
  return compatibleReversalStates;
}

export function isReversalStateValidForMode(
  mode: ReversalMode,
  orientation: CardOrientation,
  reversalVariant: ReversalVariant,
): boolean {
  return reversalStatesForMode(mode).some(
    (state) => state.orientation === orientation && state.reversalVariant === reversalVariant,
  );
}

export function reversalVariantForArtworkInspection(
  originalVariant: ReversalVariant,
  showTraditionalReversal: boolean,
): ReversalVariant {
  return showTraditionalReversal ? null : originalVariant;
}
