import { describe, expect, it } from 'vitest';
import { importUnsavedChangesGuardCopy } from '../../import/importUiCopy';
import { defaultUnsavedChangesGuardCopy } from '../unsavedChangesGuardCopy';

describe('unsaved changes guard copy', () => {
  it('keeps the Reading default copy backward compatible', () => {
    expect(defaultUnsavedChangesGuardCopy).toMatchObject({
      title: '放弃未保存的记录？',
      message: '离开后，本次输入的牌面和解读将丢失。',
      cancel: '继续编辑',
      discard: '放弃修改',
    });
  });
  it('uses the dedicated Import Assistant confirmation copy', () => {
    expect(importUnsavedChangesGuardCopy).toEqual({
      title: '放弃导入草稿？',
      message: '离开后，当前导入草稿和修改会丢失。\n已经成功导入的 Reading 不受影响。',
      cancel: '继续编辑',
      discard: '放弃并离开',
    });
  });
});
