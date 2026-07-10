import { describe, expect, it } from 'vitest';

import { topicFormSchema } from '../topicSchema';

describe('topicFormSchema', () => {
  it('rejects a name that is only whitespace', () => {
    const result = topicFormSchema.safeParse({
      name: '   ',
      description: '',
      icon: 'book',
      isPinned: false,
    });

    expect(result.success).toBe(false);
  });

  it('trims valid text fields before they reach a repository', () => {
    const result = topicFormSchema.parse({
      name: '  论文进展  ',
      description: '  记录写作节奏。  ',
      icon: 'book',
      isPinned: true,
    });

    expect(result).toEqual({
      name: '论文进展',
      description: '记录写作节奏。',
      icon: 'book',
      isPinned: true,
    });
  });
});
