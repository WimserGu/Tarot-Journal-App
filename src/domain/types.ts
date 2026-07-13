export type UUID = string;
export type ISODateTime = string;

export type TarotArcana = 'major' | 'minor';
export type TarotSuit = 'wands' | 'cups' | 'swords' | 'pentacles';
export type CardOrientation = 'upright' | 'reversed';
export type CardEntrySource = 'drawn' | 'manual';
export type ReversalExpression = 'underexpressed' | 'overexpressed' | null;
export type ReadingCardState =
  | { orientation: 'upright'; reversalExpression: null }
  | {
      orientation: 'reversed';
      reversalExpression: ReversalExpression;
    };
export type QuestionFrequency = 'as_needed' | 'daily' | 'weekly';
export type ReadingStatus = 'draft' | 'completed';
export type FollowUpStatus = 'scheduled' | 'completed';
export type FollowUpOutcome = 'happened' | 'partly_happened' | 'did_not_happen' | 'still_unclear';
export type TopicIcon = 'book' | 'briefcase' | 'compass' | 'heart' | 'moon' | 'sparkles';

export type MajorArcanaRank =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | '13'
  | '14'
  | '15'
  | '16'
  | '17'
  | '18'
  | '19'
  | '20'
  | '21';

export type MinorArcanaRank =
  | 'ace'
  | 'two'
  | 'three'
  | 'four'
  | 'five'
  | 'six'
  | 'seven'
  | 'eight'
  | 'nine'
  | 'ten'
  | 'page'
  | 'knight'
  | 'queen'
  | 'king';

export type TarotRankCode = MajorArcanaRank | MinorArcanaRank;

/** Maps directly to the future public.tarot_cards reference table. */
export type TarotCard = {
  id: number;
  card_key: string;
  name_zh: string;
  name_en: string;
  arcana: TarotArcana;
  suit: TarotSuit | null;
  rank_code: TarotRankCode;
  rank_order: number;
  sort_order: number;
};

/**
 * Maps to the future public.topics table. The local `icon` field should become
 * a constrained text column when the Supabase repository is introduced.
 */
export type Topic = {
  id: UUID;
  user_id: UUID;
  title: string;
  description: string | null;
  icon: TopicIcon;
  is_pinned: boolean;
  archived_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

/** Maps directly to the future public.question_templates table. */
export type QuestionTemplate = {
  id: UUID;
  user_id: UUID;
  topic_id: UUID;
  question_text: string;
  frequency: QuestionFrequency;
  is_active: boolean;
  is_pinned: boolean;
  /** Independent ordering among templates in the same Topic. */
  displayOrder: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

/** Maps directly to the future public.question_template_positions table. */
export type QuestionTemplatePosition = {
  id: UUID;
  user_id: UUID;
  question_template_id: UUID;
  position_order: number;
  position_name: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

/** Maps directly to the future public.readings table. */
export type Reading = {
  id: UUID;
  user_id: UUID;
  topic_id: UUID | null;
  question_template_id: UUID | null;
  question_text_snapshot: string | null;
  spread_id: string | null;
  reading_at: ISODateTime;
  reading_timezone: string;
  interpretation: string | null;
  reality_feedback: string | null;
  status: ReadingStatus;
  is_favorite: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

/** Maps directly to the future public.reading_cards table. */
export type ReadingCard = {
  id: UUID;
  user_id: UUID;
  reading_id: UUID;
  tarot_card_id: TarotCard['id'] | null;
  position_order: number;
  position_name: string | null;
  spreadPositionId: string | null;
  orientation: CardOrientation;
  reversalExpression: ReversalExpression;
  source: CardEntrySource;
  drawSessionId: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

/** A dated reflection linked to, and dependent on, one historical Reading. */
export type ReadingFollowUp = {
  id: UUID;
  readingId: UUID;
  scheduledFor: ISODateTime;
  reviewedAt: ISODateTime | null;
  status: FollowUpStatus;
  outcome: FollowUpOutcome | null;
  reflection: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

/**
 * A non-null view of the follow-up fields already stored on a Reading.
 * The MVP database keeps one feedback text on public.readings rather than a
 * separate feedback table.
 */
export type FollowUp = {
  reading_id: UUID;
  user_id: UUID;
  reality_feedback: string;
  updated_at: ISODateTime;
};

export type ReadingQuery = {
  topic_id?: UUID | null;
  question_template_id?: UUID | null;
  question_text?: string;
  date_from?: string;
  date_to?: string;
};
