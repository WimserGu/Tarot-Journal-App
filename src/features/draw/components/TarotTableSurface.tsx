import { PropsWithChildren } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { spacing } from '@/theme/tokens';

export function TarotTableSurface({
  children,
  empty,
  onLayout,
}: PropsWithChildren<{ empty: boolean; onLayout?: (event: LayoutChangeEvent) => void }>) {
  return (
    <View accessibilityLabel="Tarot table" onLayout={onLayout} style={styles.surface}>
      {empty ? (
        <View style={styles.empty}>
          <Text style={styles.placeholder}>Select a card from the deck below.</Text>
        </View>
      ) : (
        <View style={styles.cards}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cards: {
    flex: 1,
    position: 'relative',
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  placeholder: {
    color: '#B9CBC4',
    textAlign: 'center',
  },
  surface: {
    backgroundColor: '#17382F',
    borderColor: '#31594C',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    minHeight: 280,
    overflow: 'hidden',
  },
});
