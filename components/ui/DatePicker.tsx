import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ViewStyle,
} from 'react-native';
import {
  format, addMonths, subMonths,
  startOfMonth, endOfMonth,
  eachDayOfInterval, startOfWeek, endOfWeek,
  isSameDay, isSameMonth, parseISO,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../constants/theme';

interface DatePickerProps {
  value: string;           // formato YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

const DAY_NAMES = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];

export function DatePicker({ value, onChange, label, error, containerStyle }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : null;
  const [viewDate, setViewDate] = useState<Date>(selected ?? new Date());

  const daysInView = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(viewDate),   { weekStartsOn: 1 }),
  });

  function selectDate(day: Date) {
    onChange(format(day, 'yyyy-MM-dd'));
    setOpen(false);
  }

  function goToday() {
    const today = new Date();
    setViewDate(today);
    onChange(format(today, 'yyyy-MM-dd'));
    setOpen(false);
  }

  const displayValue = selected
    ? format(selected, 'd MMMM yyyy', { locale: it })
    : 'Seleziona data';

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.trigger, error ? styles.trigger_error : null]}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
      >
        <Text style={styles.trigger_icon}>📅</Text>
        <Text style={[styles.trigger_value, !selected && styles.trigger_placeholder]}>
          {displayValue}
        </Text>
        <Text style={styles.trigger_arrow}>▾</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error_text}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setOpen(false)}
          activeOpacity={1}
        >
          {/* Intercetta i tocchi interni per non chiudere */}
          <View
            style={styles.sheet}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {/* Nav mese */}
            <View style={styles.nav}>
              <TouchableOpacity
                onPress={() => setViewDate((d) => subMonths(d, 1))}
                style={styles.nav_btn}
              >
                <Text style={styles.nav_arrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.month_title}>
                {format(viewDate, 'MMMM yyyy', { locale: it })}
              </Text>
              <TouchableOpacity
                onPress={() => setViewDate((d) => addMonths(d, 1))}
                style={styles.nav_btn}
              >
                <Text style={styles.nav_arrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Intestazione giorni */}
            <View style={styles.day_names}>
              {DAY_NAMES.map((d) => (
                <Text key={d} style={styles.day_name}>{d}</Text>
              ))}
            </View>

            {/* Griglia giorni */}
            <View style={styles.grid}>
              {daysInView.map((day, i) => {
                const isSelected  = selected ? isSameDay(day, selected) : false;
                const inMonth     = isSameMonth(day, viewDate);
                const isToday     = isSameDay(day, new Date());
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.day,
                      isSelected && styles.day_selected,
                      isToday && !isSelected && styles.day_today,
                    ]}
                    onPress={() => selectDate(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.day_text,
                      !inMonth       && styles.day_other,
                      isSelected     && styles.day_text_selected,
                      isToday && !isSelected && styles.day_text_today,
                    ]}>
                      {format(day, 'd')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bottone Oggi */}
            <TouchableOpacity style={styles.today_btn} onPress={goToday}>
              <Text style={styles.today_text}>Oggi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    gap: Spacing.sm,
  },
  trigger_error:       { borderColor: Colors.error },
  trigger_icon:        { fontSize: 16 },
  trigger_value:       { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  trigger_placeholder: { color: Colors.textTertiary },
  trigger_arrow:       { fontSize: FontSize.sm, color: Colors.textTertiary },
  error_text:          { fontSize: FontSize.xs, color: Colors.error, marginTop: 4 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 360,
  },

  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  nav_btn:    { padding: Spacing.sm },
  nav_arrow:  { fontSize: 22, color: Colors.primary, fontWeight: FontWeight.bold },
  month_title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },

  day_names: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  day_name: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  day_selected: { backgroundColor: Colors.primary },
  day_today:    { backgroundColor: Colors.primaryDim },
  day_text: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  day_other:          { color: Colors.textTertiary },
  day_text_selected:  { color: Colors.textPrimary, fontWeight: FontWeight.bold },
  day_text_today:     { color: Colors.primaryLight, fontWeight: FontWeight.bold },

  today_btn: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  today_text: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});
