import React, { forwardRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ViewStyle, TextInputProps,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, containerStyle, style, ...props }, ref) => {
    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            error ? styles.input_error : null,
            style,
          ]}
          placeholderTextColor={Colors.textTertiary}
          {...props}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        {hint && !error && <Text style={styles.hint}>{hint}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
  },
  input_error: { borderColor: Colors.error },
  error: { fontSize: FontSize.sm, color: Colors.error },
  hint:  { fontSize: FontSize.sm, color: Colors.textTertiary },
});
