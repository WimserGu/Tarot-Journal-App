export type UnsavedChangesGuardCopy = {
  title: string;
  message: string;
  cancel: string;
  discard: string;
};

export const defaultUnsavedChangesGuardCopy: UnsavedChangesGuardCopy = {
  title: '放弃未保存的记录？',
  message: '离开后，本次输入的牌面和解读将丢失。',
  cancel: '继续编辑',
  discard: '放弃修改',
};
