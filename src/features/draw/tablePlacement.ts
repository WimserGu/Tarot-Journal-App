import type {
  DrawConfiguration,
  DrawSession,
  DrawnCard,
  NormalizedTablePlacement,
  TarotTableState,
} from './drawTypes';

export type TableBounds = { width: number; height: number };
export type CardBounds = { width: number; height: number };

const MAX_Z_INDEX = 1000;

export function tablePlacementKey(card: Pick<DrawnCard, 'positionIndex'>): string {
  return `position:${card.positionIndex}`;
}

export function clampNormalized(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function defaultTablePlacement(index: number): NormalizedTablePlacement {
  const column = index % 5;
  const row = Math.floor(index / 5) % 3;
  return {
    x: clampNormalized(0.18 + column * 0.16),
    y: clampNormalized(0.2 + row * 0.24),
    zIndex: index + 1,
  };
}

export function normalizeTablePlacement(
  placement: Partial<NormalizedTablePlacement> | undefined,
  index: number,
): NormalizedTablePlacement {
  const fallback = defaultTablePlacement(index);
  return {
    x: clampNormalized(placement?.x ?? fallback.x),
    y: clampNormalized(placement?.y ?? fallback.y),
    zIndex:
      Number.isInteger(placement?.zIndex) && (placement?.zIndex ?? 0) > 0
        ? Math.min(MAX_Z_INDEX, placement!.zIndex!)
        : fallback.zIndex,
  };
}

export function tableStateForSession(session: DrawSession): TarotTableState {
  const stored = session.configuration.table?.placementsByCardId ?? {};
  return {
    placementsByCardId: Object.fromEntries(
      session.cards.map((card, index) => [
        tablePlacementKey(card),
        normalizeTablePlacement(stored[tablePlacementKey(card)] ?? stored[card.id], index),
      ]),
    ),
  };
}

export function withInitialTablePlacement(
  configuration: DrawConfiguration,
  cardId: string,
  index: number,
): DrawConfiguration {
  const placements = configuration.table?.placementsByCardId ?? {};
  if (placements[cardId]) return configuration;
  return {
    ...configuration,
    table: {
      placementsByCardId: {
        ...placements,
        [cardId]: defaultTablePlacement(index),
      },
    },
  };
}

export function pixelPlacement(
  placement: NormalizedTablePlacement,
  table: TableBounds,
  card: CardBounds,
): { left: number; top: number } {
  const availableWidth = Math.max(0, table.width - card.width);
  const availableHeight = Math.max(0, table.height - card.height);
  return {
    left: clampNormalized(placement.x) * availableWidth,
    top: clampNormalized(placement.y) * availableHeight,
  };
}

export function placementFromPixels(
  left: number,
  top: number,
  table: TableBounds,
  card: CardBounds,
  zIndex: number,
): NormalizedTablePlacement {
  const availableWidth = Math.max(0, table.width - card.width);
  const availableHeight = Math.max(0, table.height - card.height);
  return {
    x: availableWidth === 0 ? 0 : clampNormalized(left / availableWidth),
    y: availableHeight === 0 ? 0 : clampNormalized(top / availableHeight),
    zIndex: Math.max(1, Math.min(MAX_Z_INDEX, Math.trunc(zIndex))),
  };
}

export function nextTableZIndex(state: TarotTableState): number {
  const maximum = Math.max(
    0,
    ...Object.values(state.placementsByCardId).map((item) => item.zIndex),
  );
  return Math.min(MAX_Z_INDEX, maximum + 1);
}

export function updateTablePlacement(
  session: DrawSession,
  cardId: string,
  placement: NormalizedTablePlacement,
): DrawSession {
  const state = tableStateForSession(session);
  const index = session.cards.findIndex((card) => card.id === cardId);
  if (index < 0) return session;
  const key = tablePlacementKey(session.cards[index]!);
  const normalized = normalizeTablePlacement(placement, index);
  return {
    ...session,
    configuration: {
      ...session.configuration,
      table: {
        placementsByCardId: {
          ...state.placementsByCardId,
          [key]: normalized,
        },
      },
    },
  };
}
