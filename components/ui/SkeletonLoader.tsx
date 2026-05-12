import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '../../constants/theme';

interface SkeletonBoxProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({
  width = '100%',
  height = 16,
  borderRadius = Radius.sm,
  style,
}: SkeletonBoxProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius, backgroundColor: Colors.surfaceHigh },
        { opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SkeletonBox width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBox width="65%" height={14} />
          <SkeletonBox width="45%" height={12} />
        </View>
      </View>
      <SkeletonBox width="100%" height={12} style={{ marginTop: 12 }} />
      <SkeletonBox width="80%" height={12} style={{ marginTop: 6 }} />
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: Spacing.md, padding: Spacing.lg }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
});
