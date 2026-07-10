import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';

export function useUnsavedChangesGuard(hasUnsavedChanges: boolean) {
  const navigation = useNavigation();
  const allowNextRemoval = useRef(false);

  const allowNextNavigation = useCallback(() => {
    allowNextRemoval.current = true;
  }, []);

  useEffect(() => {
    return navigation.addListener('beforeRemove', (event) => {
      if (!hasUnsavedChanges || allowNextRemoval.current) {
        return;
      }

      event.preventDefault();
      Alert.alert('放弃未保存的记录？', '离开后，本次输入的牌面和解读将丢失。', [
        { text: '继续编辑', style: 'cancel' },
        {
          text: '放弃修改',
          style: 'destructive',
          onPress: () => {
            allowNextRemoval.current = true;
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });
  }, [hasUnsavedChanges, navigation]);

  return { allowNextNavigation };
}
