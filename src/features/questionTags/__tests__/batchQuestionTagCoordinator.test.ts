import { describe, expect, it, vi } from 'vitest';

import { assignQuestionTagToReadings, toggleSelectedReading } from '../batchQuestionTagCoordinator';

describe('batch question tag coordinator', () => {
  it('deduplicates selected readings before assigning the tag', async () => {
    const assignQuestionTag = vi.fn().mockResolvedValue([]);
    await assignQuestionTagToReadings(
      { assignQuestionTag },
      {
        topic_id: 'topic-1',
        question_tag_id: 'tag-1',
        reading_ids: ['reading-1', 'reading-1', 'reading-2'],
      },
    );
    expect(assignQuestionTag).toHaveBeenCalledWith({
      topic_id: 'topic-1',
      question_tag_id: 'tag-1',
      reading_ids: ['reading-1', 'reading-2'],
    });
  });

  it('blocks an empty selection', async () => {
    await expect(
      assignQuestionTagToReadings(
        { assignQuestionTag: vi.fn() },
        { topic_id: 'topic-1', question_tag_id: 'tag-1', reading_ids: [] },
      ),
    ).rejects.toThrow('请至少选择一条');
  });

  it('toggles a reading without mutating the previous selection', () => {
    const previous = new Set(['reading-1']);
    expect([...toggleSelectedReading(previous, 'reading-2')]).toEqual(['reading-1', 'reading-2']);
    expect([...previous]).toEqual(['reading-1']);
    expect([...toggleSelectedReading(previous, 'reading-1')]).toEqual([]);
  });
});
