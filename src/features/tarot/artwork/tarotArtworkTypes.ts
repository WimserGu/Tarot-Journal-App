import type { ImageSourcePropType } from 'react-native';

export interface DeckArtworkManifest {
  deckId: string;
  displayName: string;
  artist: string;
  originalPublicationYear: number;
  sourceName: string;
  sourceUrl: string;
  licenseLabel: string;
  attribution: string;
  cardBackSource: string;
  assetVersion: string;
}

export interface TarotCardArtwork {
  cardId: number | null;
  front: ImageSourcePropType;
  filename: string | null;
  isFallback: boolean;
}

export interface TarotDeckTheme {
  id: string;
  name: string;
  shortName: string;
  artist: string;
  year: number | null;
  cardBack: ImageSourcePropType;
  fallbackFront: ImageSourcePropType;
  cardsById: Readonly<Record<number, TarotCardArtwork>>;
  attribution: string;
  manifest: DeckArtworkManifest;
}

export type ArtworkResolutionStatus = 'ready' | 'fallback-theme' | 'fallback-card';
