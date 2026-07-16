import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import {
  EmptyMysticState,
  GlassPanel,
  MysticHeader,
  MysticScreen,
  MysticText as Text,
} from '@/components/mystic';
import { getCurrentTimeZone } from '@/features/topics/topicPresentation';
import { ReadingForm } from '@/features/readings/components/ReadingForm';
import { buildInitialReadingFormValues } from '@/features/readings/readingFormState';
import { navigateAfterReadingSave } from '@/features/readings/readingSaveNavigation';
import { drawSessionCardsToForm } from '@/features/draw/drawSessionStore';
import { drawSessionRepository, readingRepository } from '@/repositories/repositoryFactory';
import type { DrawSession } from '@/features/draw/drawTypes';
import { toReadingCreateInput, type ReadingFormValues } from '@/features/readings/readingSchema';
import { createSubmissionGuard } from '@/features/readings/submissionGuard';
import { FREE_TABLE_SPREAD_LABEL } from '@/features/readings/readingSpreadPresentation';
import { useReadingFormContext } from '@/features/readings/useReadings';
import { useUnsavedChangesGuard } from '@/features/readings/useUnsavedChangesGuard';

function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function NewReadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    topicId?: string | string[];
    questionTemplateId?: string | string[];
    questionText?: string | string[];
    questionTagId?: string | string[];
    drawSessionId?: string | string[];
  }>();
  const topicId = firstRouteParam(params.topicId);
  const questionTemplateId = firstRouteParam(params.questionTemplateId);
  const questionText = firstRouteParam(params.questionText);
  const questionTagId = firstRouteParam(params.questionTagId);
  const drawSessionId = firstRouteParam(params.drawSessionId);
  const {
    data: context,
    error_message: errorMessage,
    is_loading: isLoading,
    reload,
  } = useReadingFormContext();
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [drawSession, setDrawSession] = useState<DrawSession | null>(null);
  const [drawSessionLoaded, setDrawSessionLoaded] = useState(!drawSessionId);
  const submissionGuard = useRef(createSubmissionGuard());
  const { allowNextNavigation } = useUnsavedChangesGuard(isDirty);
  const timeZone = getCurrentTimeZone();
  useEffect(() => {
    if (!drawSessionId) return;
    void drawSessionRepository
      .get(drawSessionId)
      .then((session) => {
        setDrawSession(session);
        setDrawSessionLoaded(true);
      })
      .catch(() => setDrawSessionLoaded(true));
  }, [drawSessionId]);
  const initialValues = useMemo(() => {
    if (!context) {
      return null;
    }

    const sourceTopicId = drawSession?.configuration.sourceTopicId ?? topicId;
    const sourceQuestionTemplateId =
      drawSession?.configuration.sourceQuestionTemplateId ?? questionTemplateId;
    const values = buildInitialReadingFormValues(
      context,
      {
        topic_id: sourceTopicId,
        question_template_id: sourceQuestionTemplateId,
        temporary_question: sourceQuestionTemplateId
          ? undefined
          : (drawSession?.configuration.questionText ?? questionText),
        question_tag_id: questionTagId,
      },
      new Date(),
      timeZone,
    );
    return drawSession
      ? {
          ...values,
          spread_id:
            drawSession.configuration.spreadId === 'free-table'
              ? null
              : drawSession.configuration.spreadId,
          cards: drawSessionCardsToForm(drawSession),
        }
      : values;
  }, [context, drawSession, questionTagId, questionTemplateId, questionText, timeZone, topicId]);

  const saveReading = async (values: ReadingFormValues, status: 'draft' | 'completed') => {
    await submissionGuard.current.run(async () => {
      setIsSaving(true);
      setSaveError(null);

      try {
        const reading = await readingRepository.createReading(
          toReadingCreateInput(values, status, timeZone),
        );
        if (drawSession?.status === 'draft') {
          await drawSessionRepository.update(drawSession.id, {
            cards: drawSession.cards,
            configuration: drawSession.configuration,
            spreadId: drawSession.spreadId,
            status: 'saved',
            linkedReadingId: reading.id,
          });
        }
        allowNextNavigation();
        navigateAfterReadingSave(router, reading.id, drawSession !== null);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : '暂时无法保存这条记录。');
      } finally {
        setIsSaving(false);
      }
    });
  };

  return (
    <MysticScreen scroll maxWidth={900}>
      <MysticHeader
        eyebrow={drawSessionId ? 'App 抽牌结果' : '实体牌记录'}
        title="新增牌阵记录"
        subtitle="把这次抽牌整理成一页可以长期回看的私人日记。"
        onBack={() => router.back()}
      />

      {isLoading ? (
        <GlassPanel variant="subtle">
          <Text variant="muted">正在准备记录表单…</Text>
        </GlassPanel>
      ) : null}

      {!isLoading && errorMessage ? (
        <EmptyMysticState
          title="暂时无法准备记录"
          description={errorMessage}
          actionLabel="重新加载"
          onAction={() => void reload()}
        />
      ) : null}

      {!isLoading && !errorMessage && context && initialValues && drawSessionLoaded ? (
        <View>
          <ReadingForm
            context={context}
            initialValues={initialValues}
            isSaving={isSaving}
            reversalMode={drawSession?.configuration.reversalMode}
            onCreateTopic={() => router.push('/topics/new')}
            onDirtyChange={setIsDirty}
            onSave={saveReading}
            saveError={saveError}
            unspecifiedSpreadLabel={
              drawSession?.configuration.spreadId === 'free-table'
                ? FREE_TABLE_SPREAD_LABEL
                : undefined
            }
          />
        </View>
      ) : null}
    </MysticScreen>
  );
}
