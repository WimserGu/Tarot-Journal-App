import type { Reading, UUID } from '../../domain/types';
import type { BatchAssignQuestionTagInput, ReadingRepository } from '../readings/readingRepository';
import { ReadingValidationError } from '../readings/readingRepository';

export async function assignQuestionTagToReadings(
  repository: Pick<ReadingRepository, 'assignQuestionTag'>,
  input: BatchAssignQuestionTagInput,
): Promise<Reading[]> {
  const readingIds = [...new Set(input.reading_ids.filter((id) => id.trim().length > 0))];
  if (readingIds.length === 0)
    throw new ReadingValidationError('请至少选择一条需要添加标签的记录。');
  if (!input.topic_id || !input.question_tag_id)
    throw new ReadingValidationError('请选择当前 Topic 下的问题标签。');
  return repository.assignQuestionTag({ ...input, reading_ids: readingIds });
}

export function toggleSelectedReading(selected: ReadonlySet<UUID>, readingId: UUID): Set<UUID> {
  const next = new Set(selected);
  if (next.has(readingId)) next.delete(readingId);
  else next.add(readingId);
  return next;
}
