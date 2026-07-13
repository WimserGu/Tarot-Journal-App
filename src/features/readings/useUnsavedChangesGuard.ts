import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import {
  defaultUnsavedChangesGuardCopy,
  type UnsavedChangesGuardCopy,
} from './unsavedChangesGuardCopy';

export { defaultUnsavedChangesGuardCopy, type UnsavedChangesGuardCopy };

export function useUnsavedChangesGuard(
  hasUnsavedChanges: boolean,
  copy = defaultUnsavedChangesGuardCopy,
) {
  const navigation = useNavigation();
  const allowNextRemoval = useRef(false);

  const allowNextNavigation = useCallback(() => {
    allowNextRemoval.current = true;
  }, []);

  useEffect(() => {
    return navigation.addListener('beforeRemove', (event) => {
      if (!hasUnsavedChanges || allowNextRemoval.current) return;

      event.preventDefault();
      Alert.alert(copy.title, copy.message, [
        { text: copy.cancel, style: 'cancel' },
        {
          text: copy.discard,
          style: 'destructive',
          onPress: () => {
            allowNextRemoval.current = true;
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });
  }, [copy, hasUnsavedChanges, navigation]);

  return { allowNextNavigation };
}
