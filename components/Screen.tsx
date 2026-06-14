import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
  RefreshControlProps,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { ScreenHeader } from './ScreenHeader';
import { colors, SCREEN_PADDING, spacing } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  rightIcon?: LucideIcon;
  onRightPress?: () => void;
  /** Wrap content in a vertical ScrollView. Default true. */
  scroll?: boolean;
  /** Apply the global 20px horizontal padding. Default true. */
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

/**
 * Consistent screen shell: top safe-area + optional header + padded body.
 * Bottom inset is owned by the tab bar, so default edges are top only.
 */
export function Screen({
  children,
  title,
  subtitle,
  rightIcon,
  onRightPress,
  scroll = true,
  padded = true,
  contentStyle,
  edges = ['top'],
  refreshControl,
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {title ? (
        <ScreenHeader
          title={title}
          subtitle={subtitle}
          rightIcon={rightIcon}
          onRightPress={onRightPress}
        />
      ) : null}

      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            padded && styles.padded,
            styles.scrollContent,
            contentStyle,
          ]}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padded && styles.padded, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  flex: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: SCREEN_PADDING,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
});
