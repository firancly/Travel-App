import React, { useState } from 'react';
import { Platform, TouchableOpacity, StyleSheet, View, Modal } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { colors, radius, spacing, fonts } from '@/theme';
import { formatDateLabel } from '@/utils/date';

interface DateFieldProps {
  value: string | null;
  onChange: (iso: string) => void;
  minimumDate?: Date;
}

/** Cross-platform date picker field (Android dialog / iOS inline modal). */
export function DateField({ value, onChange, minimumDate = new Date() }: DateFieldProps) {
  const [iosOpen, setIosOpen] = useState(false);
  const current = value ? new Date(value) : new Date();

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(date.toISOString());
        },
      });
    } else {
      setIosOpen(true);
    }
  };

  return (
    <>
      <TouchableOpacity activeOpacity={0.8} onPress={open} style={styles.field}>
        <CalendarDays size={20} color={colors.primary} strokeWidth={2} />
        <AppText style={[styles.value, !value && styles.placeholder]}>
          {formatDateLabel(value)}
        </AppText>
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="fade">
          <View style={styles.backdrop}>
            <View style={styles.sheet}>
              <DateTimePicker
                value={current}
                mode="date"
                display="inline"
                minimumDate={minimumDate}
                onChange={(_event, date) => {
                  if (date) onChange(date.toISOString());
                }}
                accentColor={colors.primary}
              />
              <Button label="Done" onPress={() => setIosOpen(false)} />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 52,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  value: {
    fontFamily: fonts.interMedium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  placeholder: {
    color: colors.textMuted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.base,
    gap: spacing.md,
  },
});
