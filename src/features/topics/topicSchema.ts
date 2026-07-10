import { z } from 'zod';

import { topicIconValues } from './topicConstants';

export const topicFormSchema = z.object({
  name: z.string().trim().min(1, '请输入议题名称。').max(120, '议题名称不能超过 120 个字符。'),
  description: z.string().trim().max(5000, '说明不能超过 5000 个字符。'),
  icon: z.enum(topicIconValues),
  isPinned: z.boolean(),
});

export type TopicFormValues = z.infer<typeof topicFormSchema>;
