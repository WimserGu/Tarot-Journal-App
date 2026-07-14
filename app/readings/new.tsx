import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { IconButton } from '@/features/topics/components/IconButton';
import { getCurrentTimeZone } from '@/features/topics/topicPresentation';
import { ReadingForm } from '@/features/readings/components/ReadingForm';
import { buildInitialReadingFormValues } from '@/features/readings/readingFormState';
import { drawSessionCardsToForm } from '@/features/draw/drawSessionStore';
import { drawSessionRepository, readingRepository } from '@/repositories/repositoryFactory';
import type { DrawSession } from '@/features/draw/drawTypes';
import { toReadingCreateInput, type ReadingFormValues } from '@/features/readings/readingSchema';
import { createSubmissionGuard } from '@/features/readings/submissionGuard';
import { FREE_TABLE_SPREAD_LABEL } from '@/features/readings/readingSpreadPresentation';
import { useReadingFormContext } from '@/features/readings/useReadings';
import { useUnsavedChangesGuard } from '@/features/readings/useUnsavedChangesGuard';
import { colors, spacing } from '@/theme/tokens';

function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function NewReadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    topicId?: string | string[];
    questionTemplateId?: string | string[];
    questionText?: string | string[];
    drawSessionId?: string | string[];
  }>();
  const topicId = firstRouteParam(params.topicId);
  const questionTemplateId = firstRouteParam(params.questionTemplateId);
  const questionText = firstRouteParam(params.questionText);
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

    const values = buildInitialReadingFormValues(
      context,
      {
        topic_id: topicId,
        question_template_id: questionTemplateId,
        temporary_question: drawSession?.configuration.questionText ?? questionText,
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
  }, [context, drawSession, questionTemplateId, questionText, timeZone, topicId]);

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
        router.replace({ pathname: '/readings/[readingId]', params: { readingId: reading.id } });
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : '暂时无法保存这条记录。');
      } finally {
        setIsSaving(false);
      }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <IconButton accessibilityLabel="返回" icon="arrow-back" onPress={() => router.back()} />
            <View style={styles.headerCopy}>
              <Text variant="eyebrow">{drawSessionId ? 'App 抽牌结果' : '实体牌记录'}</Text>
              <Text variant="title">新增牌阵记录</Text>
            </View>
          </View>

          {isLoading ? <Text variant="muted">正在准备记录表单…</Text> : null}

          {!isLoading && errorMessage ? (
            <View style={styles.state}>
              <Text>{errorMessage}</Text>
              <Button label="重新加载" onPress={() => void reload()} />
            </View>
          ) : null}

          {!isLoading && !errorMessage && context && initialValues && drawSessionLoaded ? (
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
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    flexShrink: 1,
    gap: spacing.xs,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  state: {
    gap: spacing.md,
  },
});
