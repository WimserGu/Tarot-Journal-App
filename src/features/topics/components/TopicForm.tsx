import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { MoonButton as Button, MysticText as Text } from '@/components/mystic';
import { topicIconOptions } from '@/features/topics/topicConstants';
import { topicFormSchema, type TopicFormValues } from '@/features/topics/topicSchema';
import type { AppTheme } from '@/theme/types';
import { useAppTheme } from '@/theme/useAppTheme';

import { TopicIcon } from './TopicIcon';

type TopicFormProps = {
  initialValues: TopicFormValues;
  onSubmit: (values: TopicFormValues) => Promise<void>;
  submitError?: string | null;
  submitLabel: string;
};

export function TopicForm({ initialValues, onSubmit, submitError, submitLabel }: TopicFormProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
              placeholderTextColor={theme.colors.textMuted}
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
              placeholderTextColor={theme.colors.textMuted}
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
              thumbColor={theme.colors.moonlight}
              trackColor={{ false: theme.colors.divider, true: theme.colors.primary }}
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

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    descriptionInput: {
      minHeight: 120,
    },
    errorText: {
      color: theme.colors.danger,
    },
    field: {
      backgroundColor: theme.colors.glassSubtle,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.lg,
      borderWidth: theme.borders.hairline,
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
    },
    form: {
      gap: theme.spacing.lg,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    iconLabel: {
      fontSize: theme.typography.caption,
      lineHeight: 16,
    },
    iconOption: {
      alignItems: 'center',
      backgroundColor: theme.colors.glass,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      flexBasis: 92,
      gap: theme.spacing.xs,
      minHeight: 72,
      justifyContent: 'center',
      padding: theme.spacing.sm,
    },
    iconOptionSelected: {
      backgroundColor: theme.colors.glassElevated,
      borderColor: theme.colors.primarySoft,
    },
    input: {
      backgroundColor: theme.colors.glass,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.body,
      lineHeight: 24,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    pressed: {
      opacity: theme.opacity.pressed,
    },
    switchCopy: {
      flex: 1,
      flexShrink: 1,
      gap: theme.spacing.xs,
    },
    switchRow: {
      alignItems: 'center',
      backgroundColor: theme.colors.glassSubtle,
      borderBottomColor: theme.colors.glassBorder,
      borderTopColor: theme.colors.glassBorder,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
  });
}
