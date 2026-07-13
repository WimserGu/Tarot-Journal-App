import type { UnsavedChangesGuardCopy } from '../readings/unsavedChangesGuardCopy';

/** Copy scoped to the Import Assistant; Reading screens retain the guard defaults. */
export const importUnsavedChangesGuardCopy: UnsavedChangesGuardCopy = {
  title: '放弃导入草稿？',
  message: '离开后，当前导入草稿和修改会丢失。\n已经成功导入的 Reading 不受影响。',
  cancel: '继续编辑',
  discard: '放弃并离开',
};
