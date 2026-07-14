import { DEFAULT_DRAW_CONFIGURATION, type DrawConfiguration, type ReversalMode } from './drawTypes';

export const FREE_TABLE_REVERSAL_OPTIONS = [
  {
    value: 'disabled',
    label: '不使用逆位',
    description: '所有选中的牌都保持正位。',
  },
  {
    value: 'standard',
    label: '普通逆位',
    description: '牌可能为正位或逆位；逆位不区分表达方式。',
  },
  {
    value: 'expression',
    label: '逆位表达',
    description: '逆位牌会进一步记录为“表达不足”或“表达过度”。',
  },
] as const satisfies readonly {
  value: ReversalMode;
  label: string;
  description: string;
}[];

export function reversalModeForDraw(
  drawMode: string | undefined,
  freeTableMode: ReversalMode,
): ReversalMode {
  return drawMode === 'table' ? freeTableMode : DEFAULT_DRAW_CONFIGURATION.reversalMode;
}

export function resolveFreeTableReversal(
  configuration: Pick<
    DrawConfiguration,
    'reversalMode' | 'reversedProbability' | 'overexpressedProbabilityWhenReversed'
  >,
  reversalRoll = Math.random(),
  expressionRoll = Math.random(),
) {
  const reversed =
    configuration.reversalMode !== 'disabled' && reversalRoll < configuration.reversedProbability;
  const reversalExpression =
    reversed && configuration.reversalMode === 'expression'
      ? expressionRoll < configuration.overexpressedProbabilityWhenReversed
        ? ('overexpressed' as const)
        : ('underexpressed' as const)
      : null;

  return {
    orientation: reversed ? ('reversed' as const) : ('upright' as const),
    reversalExpression,
  };
}
