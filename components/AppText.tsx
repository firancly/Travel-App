import React from 'react';
import { Text, TextProps, StyleProp, TextStyle } from 'react-native';
import { typography, TypographyVariant } from '@/theme';

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  center?: boolean;
  style?: StyleProp<TextStyle>;
}

/** App-wide text component that applies the typography scale + fonts. */
export function AppText({
  variant = 'body',
  color,
  center,
  style,
  children,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        color ? { color } : null,
        center ? { textAlign: 'center' } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
