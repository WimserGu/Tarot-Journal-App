import { describe, expect, it } from 'vitest';

import { MOCK_QUESTION_IDS, MOCK_TOPIC_IDS, mockReadings } from '../mockData';
import { filterReadings, searchTarotCards } from '../readingUtils';
import { tarotCards } from '../tarotCards';

describe('filterReadings', () => {
  it('filters records by topic', () => {
    const readings = filterReadings(mockReadings, {
      topic_id: MOCK_TOPIC_IDS.thesis,
    });

    expect(readings).toHaveLength(3);
    expect(readings.every((reading) => reading.topic_id === MOCK_TOPIC_IDS.thesis)).toBe(true);
  });

  it('filters records by a fixed question template', () => {
    const readings = filterReadings(mockReadings, {
      question_template_id: MOCK_QUESTION_IDS.thesisObstacle,
    });

    expect(readings).toHaveLength(2);
    expect(
      readings.every(
        (reading) => reading.question_template_id === MOCK_QUESTION_IDS.thesisObstacle,
      ),
    ).toBe(true);
  });

  it('filters records with inclusive date-only boundaries', () => {
    const readings = filterReadings(mockReadings, {
      date_from: '2026-07-09',
      date_to: '2026-07-10',
    });

    expect(readings.map((reading) => reading.id)).toEqual([
      '40000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000002',
    ]);
  });

  it('can filter temporary drafts by a null question template', () => {
    const readings = filterReadings(mockReadings, {
      question_template_id: null,
    });

    expect(readings).toHaveLength(1);
    expect(readings[0]?.status).toBe('draft');
  });

  it('rejects an invalid date range', () => {
    expect(() => {
      filterReadings(mockReadings, {
        date_from: '2026-07-11',
        date_to: '2026-07-10',
      });
    }).toThrow(RangeError);
  });
});

describe('searchTarotCards', () => {
  it('matches Chinese names, English names, and stable card identifiers', () => {
    expect(searchTarotCards('宝剑八', tarotCards).map((card) => card.card_key)).toEqual([
      'swords_eight',
    ]);
    expect(
      searchTarotCards('eight', tarotCards).some((card) => card.card_key === 'pentacles_eight'),
    ).toBe(true);
    expect(searchTarotCards('pentacles_eight', tarotCards)[0]?.card_key).toBe('pentacles_eight');
  });
});
