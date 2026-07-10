import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { IconButton } from '@/features/topics/components/IconButton';
import { getCurrentTimeZone } from '@/features/topics/topicPresentation';
import { ReadingForm } from '@/features/readings/components/ReadingForm';
import { buildInitialReadingFormValues } from '@/features/readings/readingFormState';
import { readingRepository } from '@/features/readings/mockReadingRepository';
import { toReadingCreateInput, type ReadingFormValues } from '@/features/readings/readingSchema';
import { createSubmissionGuard } from '@/features/readings/submissionGuard';
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
  }>();
  const topicId = firstRouteParam(params.topicId);
  const questionTemplateId = firstRouteParam(params.questionTemplateId);
  const {
    data: context,
    error_message: errorMessage,
    is_loading: isLoading,
    reload,
  } = useReadingFormContext();
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const submissionGuard = useRef(createSubmissionGuard());
  const { allowNextNavigation } = useUnsavedChangesGuard(isDirty);
  const timeZone = getCurrentTimeZone();
  const initialValues = useMemo(() => {
    if (!context) {
      return null;
    }

    return buildInitialReadingFormValues(
      context,
      { topic_id: topicId, question_template_id: questionTemplateId },
      new Date(),
      timeZone,
    );
  }, [context, questionTemplateId, timeZone, topicId]);

  const saveReading = async (values: ReadingFormValues, status: 'draft' | 'completed') => {
    await submissionGuard.current.run(async () => {
      setIsSaving(true);
      setSaveError(null);

      try {
        const reading = await readingRepository.createReading(
          toReadingCreateInput(values, status, timeZone),
        );
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
              <Text variant="eyebrow">实体牌记录</Text>
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

          {!isLoading && !errorMessage && context && initialValues ? (
            <ReadingForm
              context={context}
              initialValues={initialValues}
              isSaving={isSaving}
              onCreateTopic={() => router.push('/topics/new')}
              onDirtyChange={setIsDirty}
              onSave={saveReading}
              saveError={saveError}
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
