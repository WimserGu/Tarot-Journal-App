import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import {
  addCard,
  deleteCard,
  editCandidate,
  editCard,
  moveCard,
} from '@/features/import/candidateEditor';
import {
  importReviewedReadings,
  type BatchImportResult,
} from '@/features/import/importCoordinator';
import {
  IMPORT_AI_PROMPT,
  parseImportText,
  type ImportParseResult,
} from '@/features/import/importParser';
import { importUnsavedChangesGuardCopy } from '@/features/import/importUiCopy';
import {
  createOrReuseImportTopic,
  findExactImportTopic,
  type ImportTopicChoice,
} from '@/features/import/importTopics';
import { tarotCards } from '@/domain/tarotCards';
import { readingRepository, topicRepository } from '@/repositories/repositoryFactory';
import { colors, spacing } from '@/theme/tokens';
import { useUnsavedChangesGuard } from '@/features/readings/useUnsavedChangesGuard';

const SAMPLE = `[Reading]\nDate: 2026-07-13\nTopic: 关系\nQuestion: 她现在想对我说什么？\nCards:\n- 星币国王 | upright\n- 权杖七 | reversed\n- 星币四 | reversed | underexpressed\nNotes:\n这是多行备注的第一行。\n这是第二行。`;
export default function ImportScreen() {
  const router = useRouter();
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState<ImportParseResult | null>(null);
  const [topics, setTopics] = useState<ImportTopicChoice[]>([]);
  const [topicIds, setTopicIds] = useState(new Map<string, string>());
  const [open, setOpen] = useState(new Set<string>());
  const [result, setResult] = useState<BatchImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [creatingTopic, setCreatingTopic] = useState<string | null>(null);
  useUnsavedChangesGuard(
    raw.length > 0 || preview !== null || Boolean(result?.failed.length),
    importUnsavedChangesGuardCopy,
  );
  const loadTopics = () =>
    void readingRepository
      .getReadingFormContext()
      .then((c) => setTopics(c.topics.map((t) => ({ id: t.id, title: t.title }))));
  useEffect(loadTopics, []);
  const parse = () => {
    const next = parseImportText(raw);
    setPreview(next);
    const selected = new Map<string, string>();
    next.readings.forEach((c) => {
      const found = findExactImportTopic(c.topicText, topics);
      if (found) selected.set(c.importId, found.id);
    });
    setTopicIds(selected);
    setResult(null);
  };
  const change = (
    id: string,
    fn: (
      c: NonNullable<ImportParseResult>['readings'][number],
    ) => NonNullable<ImportParseResult>['readings'][number],
  ) =>
    setPreview((p) =>
      p ? { ...p, readings: p.readings.map((c) => (c.importId === id ? fn(c) : c)) } : p,
    );
  const submit = async (onlyFailed = false) => {
    if (!preview) return;
    setBusy(true);
    const failed = new Set(result?.failed.map((x) => x.importId));
    const selected = onlyFailed
      ? preview.readings.filter((c) => failed.has(c.importId))
      : preview.readings;
    const next = await importReviewedReadings({
      candidates: selected,
      topicIds,
      topics: [] as never,
      repository: readingRepository,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      alreadySucceeded: new Set(result?.succeeded.map((x) => x.importId)),
    });
    setResult((old) =>
      old
        ? {
            succeeded: [...old.succeeded, ...next.succeeded],
            failed: next.failed,
            skipped: [...old.skipped, ...next.skipped],
          }
        : next,
    );
    setBusy(false);
  };
  const reset = () =>
    Alert.alert(
      '重置导入？',
      '这会清除当前粘贴内容、解析结果和未保存修改。已经成功保存的 Reading 不会被删除。',
      [
        { text: '取消' },
        {
          text: '重置',
          style: 'destructive',
          onPress: () => {
            setRaw('');
            setPreview(null);
            setTopicIds(new Map());
            setResult(null);
            setOpen(new Set());
          },
        },
      ],
    );
  const copy = async (value: string, label: string) => {
    try {
      await Clipboard.setStringAsync(value);
      setNotice(`${label}已复制。`);
    } catch {
      setNotice('复制失败，请手动复制。');
    }
  };
  return (
    <Screen scroll>
      <Text variant="eyebrow">1. 模板 · 2. 粘贴 · 3. 解析 · 4. 编辑 · 5. 导入 · 6. 结果</Text>
      <Text variant="title">导入历史记录</Text>
      <Text variant="muted">
        模板只复制到剪贴板。你自行决定是否交给外部 AI；App 不会上传粘贴内容，解析不等于保存。
      </Text>
      <Button label="复制 AI 整理模板" onPress={() => void copy(IMPORT_AI_PROMPT, '模板')} />
      <Button label="复制示例格式" onPress={() => void copy(SAMPLE, '示例')} />
      {notice ? <Text>{notice}</Text> : null}
      <TextInput
        accessibilityLabel="粘贴整理结果"
        multiline
        value={raw}
        onChangeText={setRaw}
        placeholder="[Reading]"
        style={styles.input}
      />
      <Button label="本地解析" onPress={parse} />
      {preview ? (
        <>
          <Text variant="subtitle">编辑和确认：{preview.readings.length} 条</Text>
          {preview.readings.map((c) => {
            const imported = result?.succeeded.some((x) => x.importId === c.importId);
            const failed = result?.failed.find((x) => x.importId === c.importId);
            return (
              <View key={c.importId} style={styles.card}>
                <Pressable
                  onPress={() =>
                    setOpen((s) => {
                      const n = new Set(s);
                      if (n.has(c.importId)) n.delete(c.importId);
                      else n.add(c.importId);
                      return n;
                    })
                  }
                >
                  <Text variant="subtitle">
                    #{c.sourceOrder} ·{' '}
                    {c.excluded
                      ? '已排除'
                      : imported
                        ? '已导入'
                        : failed
                          ? '导入失败'
                          : c.isValid && topicIds.has(c.importId)
                            ? '可导入'
                            : '无法导入'}
                  </Text>
                  <Text>{c.question || '缺少问题'}</Text>
                </Pressable>
                {open.has(c.importId) ? (
                  <View>
                    <TextInput
                      value={c.date ?? ''}
                      placeholder="YYYY-MM-DD"
                      onChangeText={(date) =>
                        change(c.importId, (x) => editCandidate(x, { date: date || null }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      value={c.question}
                      onChangeText={(question) =>
                        change(c.importId, (x) => editCandidate(x, { question }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      multiline
                      value={c.notes ?? ''}
                      onChangeText={(notes) =>
                        change(c.importId, (x) => editCandidate(x, { notes: notes || null }))
                      }
                      style={styles.input}
                    />
                    <Text>
                      原始 Topic：{c.topicText ?? '无'}；
                      {topicIds.has(c.importId) ? '已选择' : '未匹配 Topic'}
                    </Text>
                    <TextInput
                      value={c.topicText ?? ''}
                      placeholder="新 Topic 名称"
                      onChangeText={(topicText) =>
                        change(c.importId, (x) =>
                          editCandidate(x, { topicText: topicText || null }),
                        )
                      }
                      style={styles.input}
                    />
                    <Button
                      label={creatingTopic === c.importId ? '正在创建 Topic…' : '创建 Topic'}
                      onPress={() =>
                        void (async () => {
                          const title = c.topicText?.trim();
                          if (!title || creatingTopic) {
                            setNotice('请输入 Topic 名称。');
                            return;
                          }
                          setCreatingTopic(c.importId);
                          try {
                            const topic = await createOrReuseImportTopic(
                              title,
                              topics,
                              topicRepository,
                            );
                            setTopics((current) =>
                              current.some((item) => item.id === topic.id)
                                ? current
                                : [...current, topic],
                            );
                            setTopicIds(new Map(topicIds).set(c.importId, topic.id));
                          } catch (error) {
                            setNotice(error instanceof Error ? error.message : '创建 Topic 失败。');
                          } finally {
                            setCreatingTopic(null);
                          }
                        })()
                      }
                    />
                    {topics.map((t) => (
                      <Button
                        key={t.id}
                        label={t.title}
                        onPress={() => setTopicIds(new Map(topicIds).set(c.importId, t.id))}
                      />
                    ))}
                    <Button
                      label={c.excluded ? '恢复' : '排除'}
                      onPress={() =>
                        change(c.importId, (x) => editCandidate(x, { excluded: !x.excluded }))
                      }
                    />
                    {c.cards.map((card, i) => (
                      <View key={`${i}-${card.rawCardName}`}>
                        <Text>{card.rawCardName}</Text>
                        <Button
                          label="上一张牌"
                          onPress={() =>
                            change(c.importId, (x) =>
                              editCard(x, i, {
                                tarotCardId:
                                  tarotCards[
                                    (tarotCards.findIndex((t) => t.id === card.tarotCardId) -
                                      1 +
                                      tarotCards.length) %
                                      tarotCards.length
                                  ]!.id,
                                rawCardName:
                                  tarotCards[
                                    (tarotCards.findIndex((t) => t.id === card.tarotCardId) -
                                      1 +
                                      tarotCards.length) %
                                      tarotCards.length
                                  ]!.name_zh,
                                warnings: [],
                              }),
                            )
                          }
                        />
                        <Button
                          label="正位"
                          onPress={() =>
                            change(c.importId, (x) => editCard(x, i, { orientation: 'upright' }))
                          }
                        />
                        <Button
                          label="普通逆位"
                          onPress={() =>
                            change(c.importId, (x) =>
                              editCard(x, i, { orientation: 'reversed', reversalExpression: null }),
                            )
                          }
                        />
                        <Button
                          label="表达不足"
                          onPress={() =>
                            change(c.importId, (x) =>
                              editCard(x, i, {
                                orientation: 'reversed',
                                reversalExpression: 'underexpressed',
                              }),
                            )
                          }
                        />
                        <Button
                          label="表达过度"
                          onPress={() =>
                            change(c.importId, (x) =>
                              editCard(x, i, {
                                orientation: 'reversed',
                                reversalExpression: 'overexpressed',
                              }),
                            )
                          }
                        />
                        <Button
                          label="上移"
                          onPress={() => change(c.importId, (x) => moveCard(x, i, -1))}
                        />
                        <Button
                          label="下移"
                          onPress={() => change(c.importId, (x) => moveCard(x, i, 1))}
                        />
                        <Button
                          label="删除"
                          onPress={() => change(c.importId, (x) => deleteCard(x, i))}
                        />
                      </View>
                    ))}
                    <Button label="添加卡牌" onPress={() => change(c.importId, addCard)} />
                    {[...c.warnings, ...c.cards.flatMap((k) => k.warnings)].map((w, i) => (
                      <Text key={`${w.code}-${i}`} style={styles.error}>
                        {w.message}
                      </Text>
                    ))}
                    {failed ? <Text style={styles.error}>{failed.error}</Text> : null}
                  </View>
                ) : null}
              </View>
            );
          })}
          <Button label={busy ? '正在导入…' : '确认批量导入'} onPress={() => void submit()} />
          {result ? (
            <View>
              <Text variant="subtitle">
                结果：成功 {result.succeeded.length} · 失败 {result.failed.length} · 跳过{' '}
                {result.skipped.length}
              </Text>
              {result.succeeded.map((s) => {
                const c = preview.readings.find((x) => x.importId === s.importId);
                return (
                  <Button
                    key={s.importId}
                    label={`打开 Reading：${c?.question ?? '已导入记录'}`}
                    onPress={() => router.push(`/readings/${s.readingId}` as never)}
                  />
                );
              })}
              {result.failed.length ? (
                <Button label="仅重试失败项" onPress={() => void submit(true)} />
              ) : null}
            </View>
          ) : null}
          <Button label="重置导入" onPress={reset} />
        </>
      ) : null}
      <Button label="返回" onPress={() => router.back()} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  input: { borderColor: colors.border, borderWidth: 1, minHeight: 44, padding: spacing.sm },
  card: { borderColor: colors.border, borderWidth: 1, gap: spacing.sm, padding: spacing.sm },
  error: { color: colors.danger },
});
