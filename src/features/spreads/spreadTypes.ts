export type SpreadPosition = {
  id: string;
  order: number;
  title: string;
  description: string;
};

export type Spread = {
  id: string;
  name: string;
  description: string;
  positions: readonly SpreadPosition[];
  isOpen: boolean;
};

export const SPREAD_IDS = {
  singleCard: 'single-card',
  threeCards: 'three-cards',
  situation: 'situation',
  open: 'open',
} as const;

export type BuiltInSpreadId = (typeof SPREAD_IDS)[keyof typeof SPREAD_IDS];
