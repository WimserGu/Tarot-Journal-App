import type { DrawConfiguration, ReversalMode } from './drawTypes';

export const FREE_TABLE_REVERSAL_OPTIONS = [
  {
    value: 'disabled',
    label: '不使用逆位',
    description: '所有选中的牌都保持正位。',
  },
  {
    value: 'standard',
    label: '普通正逆位',
    description: '使用传统的正位与倒置逆位。',
  },
  {
    value: 'dual',
    label: '双逆位模式',
    description: '逆位分为左旋与右旋，由你自行定义两个方向的意义。',
  },
] as const satisfies readonly {
  value: ReversalMode;
  label: string;
  description: string;
}[];

export function reversalModeForDraw(
  _drawMode: string | undefined,
  selectedMode: ReversalMode,
): ReversalMode {
  return selectedMode;
}

export function resolveFreeTableReversal(
  configuration: Pick<
    DrawConfiguration,
    'reversalMode' | 'reversedProbability' | 'rightProbabilityWhenReversed'
  >,
  reversalRoll = Math.random(),
  variantRoll = Math.random(),
) {
  const reversed =
    configuration.reversalMode !== 'disabled' && reversalRoll < configuration.reversedProbability;
  const reversalVariant =
    reversed && configuration.reversalMode === 'dual'
      ? variantRoll < configuration.rightProbabilityWhenReversed
        ? ('right' as const)
        : ('left' as const)
      : null;

  return {
    orientation: reversed ? ('reversed' as const) : ('upright' as const),
    reversalVariant,
  };
}
