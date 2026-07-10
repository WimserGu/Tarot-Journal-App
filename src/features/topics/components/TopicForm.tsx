import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { topicIconOptions } from '@/features/topics/topicConstants';
import { topicFormSchema, type TopicFormValues } from '@/features/topics/topicSchema';
import { borderRadii, colors, fontSizes, spacing } from '@/theme/tokens';

import { TopicIcon } from './TopicIcon';

type TopicFormProps = {
  initialValues: TopicFormValues;
  onSubmit: (values: TopicFormValues) => Promise<void>;
  submitError?: string | null;
  submitLabel: string;
};

export function TopicForm({ initialValues, onSubmit, submitError, submitLabel }: TopicFormProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<TopicFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(topicFormSchema),
  });

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <Text variant="subtitle">议题名称</Text>
        <Controller
          control={control}
          name="name"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextInput
              accessibilityLabel="议题名称"
              autoCapitalize="sentences"
              maxLength={120}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="例如：论文进展"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={value}
            />
          )}
        />
        {errors.name?.message ? <Text style={styles.errorText}>{errors.name.message}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text variant="subtitle">说明</Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextInput
              accessibilityLabel="议题说明"
              multiline
              numberOfLines={4}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="可选：写下你想持续观察的内容。"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.descriptionInput]}
              textAlignVertical="top"
              value={value}
            />
          )}
        />
        {errors.description?.message ? (
          <Text style={styles.errorText}>{errors.description.message}</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text variant="subtitle">图标</Text>
        <Controller
          control={control}
          name="icon"
          render={({ field: { onChange, value } }) => (
            <View style={styles.iconGrid}>
              {topicIconOptions.map((option) => {
                const isSelected = option.value === value;

                return (
                  <Pressable
                    accessibilityLabel={`选择图标：${option.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={option.value}
                    onPress={() => onChange(option.value)}
                    style={({ pressed }) => [
                      styles.iconOption,
                      isSelected ? styles.iconOptionSelected : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <TopicIcon icon={option.value} />
                    <Text style={styles.iconLabel}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      </View>

      <Controller
        control={control}
        name="isPinned"
        render={({ field: { onChange, value } }) => (
          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text variant="subtitle">置顶显示</Text>
              <Text variant="muted">在长期议题列表中优先显示。</Text>
            </View>
            <Switch
              accessibilityLabel="置顶显示"
              onValueChange={onChange}
              thumbColor={colors.surface}
              trackColor={{ false: colors.border, true: colors.accent }}
              value={value}
            />
          </View>
        )}
      />

      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
      <Button
        disabled={isSubmitting}
        label={isSubmitting ? '正在保存' : submitLabel}
        onPress={handleSubmit(onSubmit)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  descriptionInput: {
    minHeight: 120,
  },
  errorText: {
    color: colors.danger,
  },
  field: {
    gap: spacing.sm,
  },
  form: {
    gap: spacing.xl,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconLabel: {
    fontSize: fontSizes.caption,
    lineHeight: 16,
  },
  iconOption: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    flexBasis: 92,
    gap: spacing.xs,
    minHeight: 72,
    justifyContent: 'center',
    padding: spacing.sm,
  },
  iconOptionSelected: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.accent,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontSizes.body,
    lineHeight: 24,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  switchCopy: {
    flex: 1,
    flexShrink: 1,
    gap: spacing.xs,
  },
  switchRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
});
