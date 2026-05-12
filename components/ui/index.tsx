// ============================================================
// SODALIS — UI Components
// ============================================================
import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ViewStyle, Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '../../constants/theme';
import { getInitials } from '../../utils';
import type { Profile } from '../../types';

// ─── Button ──────────────────────────────────────────────────
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [
    styles.btn,
    styles[`btn_${variant}`],
    styles[`btn_${size}`],
    isDisabled && styles.btn_disabled,
    style as ViewStyle,
  ];

  function handlePress() {
    Haptics.impactAsync(
      variant === 'danger'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Light
    );
    onPress();
  }

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? Colors.textPrimary : Colors.primary}
        />
      ) : (
        <Text style={[styles.btn_text, styles[`btn_text_${variant}`], styles[`btn_text_${size}`]]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── IconButton ──────────────────────────────────────────────
interface IconButtonProps {
  icon: string;
  onPress: () => void;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export function IconButton({ icon, onPress, size = 36, color = Colors.textSecondary, style }: IconButtonProps) {
  return (
    <TouchableOpacity
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.65}
    >
      <Text style={{ fontSize: size * 0.5, color }}>{icon}</Text>
    </TouchableOpacity>
  );
}

// ─── Avatar ──────────────────────────────────────────────────
interface AvatarProps {
  profile: Profile;
  size?: number;
  showName?: boolean;
}

export function Avatar({ profile, size = 40, showName = false }: AvatarProps) {
  return (
    <View style={{ alignItems: 'center', gap: Spacing.xs }}>
      <View style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}>
        {profile.avatar_url ? (
          <Image
            key={profile.avatar_url + (profile.updated_at ?? '')}
            source={{ uri: `${profile.avatar_url}?t=${encodeURIComponent(profile.updated_at ?? '')}` }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
          />
        ) : (
          <Text style={[styles.avatar_initials, { fontSize: size * 0.38 }]}>
            {getInitials(profile.display_name)}
          </Text>
        )}
      </View>
      {showName && (
        <Text style={styles.avatar_name} numberOfLines={1}>
          {profile.display_name}
        </Text>
      )}
    </View>
  );
}

// ─── Card ────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: CardProps) {
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, style as ViewStyle]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style as ViewStyle]}>{children}</View>;
}

// ─── EmptyState ──────────────────────────────────────────────
interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ emoji, title, subtitle, action }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <Text style={styles.empty_emoji}>{emoji}</Text>
      <Text style={styles.empty_title}>{title}</Text>
      {subtitle && <Text style={styles.empty_sub}>{subtitle}</Text>}
      {action && (
        <Button
          title={action.label}
          onPress={action.onPress}
          variant="secondary"
          style={{ marginTop: Spacing.md }}
        />
      )}
    </View>
  );
}

// ─── ErrorState ──────────────────────────────────────────────
interface ErrorStateProps {
  message?: string;
  error?: unknown;
  onRetry?: () => void;
}

export function ErrorState({ message, error, onRetry }: ErrorStateProps) {
  const errMsg = message
    ?? (error as any)?.message
    ?? (error ? String(error) : undefined);
  if (__DEV__ && error) console.error('[ErrorState]', error);
  return (
    <View style={styles.empty}>
      <Text style={styles.empty_emoji}>⚠️</Text>
      <Text style={styles.empty_title}>Qualcosa è andato storto</Text>
      {__DEV__ && errMsg && (
        <Text style={[styles.empty_sub, { color: Colors.error, fontSize: FontSize.xs }]}>
          {errMsg}
        </Text>
      )}
      {onRetry && (
        <Button
          title="Riprova"
          onPress={onRetry}
          variant="secondary"
          style={{ marginTop: Spacing.md }}
        />
      )}
    </View>
  );
}

// ─── LoadingSpinner ──────────────────────────────────────────
export function LoadingSpinner({ full = false }: { full?: boolean }) {
  return (
    <View style={[styles.spinner, full && styles.spinner_full]}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

// ─── Divider ─────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ─── Badge ───────────────────────────────────────────────────
interface BadgeProps {
  label: string;
  color?: string;
}

export function Badge({ label, color = Colors.primary }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '44' }]}>
      <Text style={[styles.badge_text, { color }]}>{label}</Text>
    </View>
  );
}

// ─── SectionHeader ───────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={styles.section_header}>
      <Text style={styles.section_title}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={styles.section_action}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── FAB ─────────────────────────────────────────────────────
interface FABProps {
  onPress: () => void;
  icon?: string;
}

export function FAB({ onPress, icon = '+' }: FABProps) {
  return (
    <TouchableOpacity
      style={[styles.fab, Shadow.lg]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
      activeOpacity={0.85}
    >
      <Text style={styles.fab_icon}>{icon}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Button
  btn: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btn_primary:   { backgroundColor: Colors.primary },
  btn_secondary: { backgroundColor: Colors.surfaceHigh, borderWidth: 1, borderColor: Colors.border },
  btn_ghost:     { backgroundColor: 'transparent' },
  btn_danger:    { backgroundColor: Colors.error + '22', borderWidth: 1, borderColor: Colors.error },
  btn_disabled:  { opacity: 0.4 },
  btn_sm: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md },
  btn_md: { paddingVertical: 12, paddingHorizontal: Spacing.lg },
  btn_lg: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },

  btn_text:           { fontWeight: FontWeight.semibold },
  btn_text_primary:   { color: Colors.textPrimary, fontSize: FontSize.md },
  btn_text_secondary: { color: Colors.textPrimary, fontSize: FontSize.md },
  btn_text_ghost:     { color: Colors.primary, fontSize: FontSize.md },
  btn_text_danger:    { color: Colors.error, fontSize: FontSize.md },
  btn_text_sm: { fontSize: FontSize.sm },
  btn_text_md: { fontSize: FontSize.md },
  btn_text_lg: { fontSize: FontSize.lg },

  // Avatar
  avatar: {
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar_initials: {
    color: Colors.primaryLight,
    fontWeight: FontWeight.bold,
  },
  avatar_name: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    maxWidth: 60,
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Empty
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  empty_emoji: { fontSize: 48, marginBottom: Spacing.sm },
  empty_title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  empty_sub: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Spinner
  spinner: { padding: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  spinner_full: { flex: 1 },

  // Divider
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },

  // Badge
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  badge_text: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  // SectionHeader
  section_header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  section_title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  section_action: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab_icon: { fontSize: 26, color: Colors.textPrimary, lineHeight: 30 },
});
