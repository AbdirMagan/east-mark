import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Space } from '../theme';
import type { Palette } from '../theme';
import { useColors, useStyles } from '../useTheme';
import { CURRENCIES, usePrefs } from '../store/prefs';

/**
 * Which currency prices are shown in.
 *
 * The choice is sent with the listings query and the backend returns prices
 * already converted, so every client agrees on what a thing costs. Converting
 * here instead would mean the phone carrying its own exchange rates and
 * quietly disagreeing with the website.
 */
export function CurrencyPicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useColors();
  const styles = useStyles(makeStyles);
  const currency = usePrefs((state) => state.currency);
  const setCurrency = usePrefs((state) => state.setCurrency);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Currency</Text>

        <ScrollView>
          {CURRENCIES.map((item) => {
            const selected = item.code === currency;
            return (
              <Pressable
                key={item.code}
                onPress={() => {
                  setCurrency(item.code);
                  onClose();
                }}
                style={styles.row}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.code, selected && styles.selected]}>
                    {item.code} ({item.symbol})
                  </Text>
                  <Text style={styles.label}>{item.label}</Text>
                </View>
                {selected ? <Ionicons name="checkmark" size={18} color={c.teal} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(9,24,44,0.45)' },
  sheet: {
    maxHeight: '70%',
    backgroundColor: c.surface,
    borderTopLeftRadius: Radius.chip,
    borderTopRightRadius: Radius.chip,
    paddingBottom: Space.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.divider,
    marginTop: Space.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: c.text,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.lg,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  rowText: { gap: 2 },
  code: { fontSize: 15, color: c.text, fontWeight: '600' },
  selected: { color: c.teal, fontWeight: '800' },
  label: { fontSize: 12, color: c.textMuted },
  tick: { color: c.teal, fontSize: 17, fontWeight: '700' },
});
