import type { QuestionTag, UUID } from '../../domain/types';
import {
  RELATIONSHIP_QUESTION_TAG_PRESETS,
  type RelationshipQuestionTagPreset,
  type QuestionTagRepository,
} from './questionTagRepository';

export async function addRelationshipQuestionTagPresets(
  repository: QuestionTagRepository,
  topicId: UUID,
  selectedPresets: readonly RelationshipQuestionTagPreset[] = RELATIONSHIP_QUESTION_TAG_PRESETS,
): Promise<QuestionTag[]> {
  return Promise.all(
    selectedPresets.map((name) => repository.createOrReuseQuestionTag({ topic_id: topicId, name })),
  );
}
