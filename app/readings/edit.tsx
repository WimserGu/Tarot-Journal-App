import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  EmptyMysticState,
  GlassPanel,
  MoonButton as Button,
  MysticHeader,
  MysticScreen,
  MysticText as Text,
} from '@/components/mystic';
import { getCurrentTimeZone } from '@/features/topics/topicPresentation';
import { ReadingForm } from '@/features/readings/components/ReadingForm';
import { buildReadingFormValuesFromDetail } from '@/features/readings/readingFormState';
import { readingRepository } from '@/repositories/repositoryFactory';
import { toReadingCreateInput, type ReadingFormValues } from '@/features/readings/readingSchema';
import { createSubmissionGuard } from '@/features/readings/submissionGuard';
import { useReadingDetail, useReadingFormContext } from '@/features/readings/useReadings';
import { useUnsavedChangesGuard } from '@/features/readings/useUnsavedChangesGuard';

function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function confirmCompletedToDraft(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert('转回草稿？', '转回草稿后，这条记录将不再作为正式记录参与后续分析。', [
      { text: '取消', style: 'cancel', onPress: () => resolve(false) },
      { text: '转为草稿', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export default function EditReadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ readingId?: string | string[] }>();
  const readingId = firstRouteParam(params.readingId);
  const formContext = useReadingFormContext();
  const readingDetail = useReadingDetail(readingId);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const submissionGuard = useRef(createSubmissionGuard());
  const { allowNextNavigation } = useUnsavedChangesGuard(isDirty);
  const timeZone = getCurrentTimeZone();
  const initialValues = useMemo(() => {
    if (!formContext.data || !readingDetail.data) {
      return null;
    }

    return buildReadingFormValuesFromDetail(formContext.data, readingDetail.data);
  }, [formContext.data, readingDetail.data]);
  const isLoading = formContext.is_loading || readingDetail.is_loading;
  const errorMessage = formContext.error_message ?? readingDetail.error_message;

  const saveReading = async (values: ReadingFormValues, status: 'draft' | 'completed') => {
    if (!readingDetail.data || !readingId) {
      return;
    }

    if (readingDetail.data.reading.status === 'completed' && status === 'draft') {
      const confirmed = await confirmCompletedToDraft();

      if (!confirmed) {
        return;
      }
    }

    await submissionGuard.current.run(async () => {
      setIsSaving(true);
      setSaveError(null);

      try {
        await readingRepository.updateReading(
          readingId,
          toReadingCreateInput(values, status, timeZone),
        );
        allowNextNavigation();
        router.replace({ pathname: '/readings/[readingId]', params: { readingId } });
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : '暂时无法更新这条记录。');
      } finally {
        setIsSaving(false);
      }
    });
  };

  return (
    <MysticScreen scroll maxWidth={900}>
      <MysticHeader
        eyebrow="私人塔罗日记"
        title="编辑牌阵记录"
        subtitle="调整牌面、问题与解读，不改变原始 Draw Session。"
        onBack={() => router.back()}
      />

      {isLoading ? (
        <GlassPanel variant="subtle">
          <Text variant="muted">正在准备编辑表单…</Text>
        </GlassPanel>
      ) : null}
      {!isLoading && errorMessage ? (
        <GlassPanel variant="elevated">
          <View>
            <Text>{errorMessage}</Text>
            <Button
              label="重新加载"
              onPress={() => {
                void formContext.reload();
                void readingDetail.reload();
              }}
            />
            <Button label="返回记录详情" onPress={() => router.back()} />
          </View>
        </GlassPanel>
      ) : null}
      {!isLoading && !errorMessage && !readingDetail.data ? (
        <EmptyMysticState
          title="找不到这条记录"
          description="这条记录可能已经被删除，或当前账户无法访问。"
          actionLabel="返回议题列表"
          onAction={() => router.replace('/topics')}
        />
      ) : null}
      {!isLoading && !errorMessage && formContext.data && initialValues ? (
        <ReadingForm
          context={formContext.data}
          initialValues={initialValues}
          isSaving={isSaving}
          onCreateTopic={() => router.push('/topics/new')}
          onDirtyChange={setIsDirty}
          onSave={saveReading}
          saveError={saveError}
        />
      ) : null}
    </MysticScreen>
  );
}
