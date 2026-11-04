import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '../api/endpoints';
import { Radius, Space } from '../theme';
import type { Palette } from '../theme';
import { useColors, useStyles } from '../useTheme';
import { usePrefs } from '../store/prefs';

/**
 * Country, then city.
 *
 * Two steps rather than one long list: five countries and every city in them
 * is hundreds of rows, and nobody scrolls past Djibouti looking for Hargeisa.
 * Cities are fetched only once a country is chosen, so opening the picker
 * costs one small request instead of five.
 *
 * "All locations" stays at the top because a buyer who has just moved, or who
 * will travel for the right car, needs a way back out of a filter.
 */
export function LocationPicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useColors();
  const styles = useStyles(makeStyles);
  const language = usePrefs((state) => state.language);
  const countryId = usePrefs((state) => state.countryId);
  const cityId = usePrefs((state) => state.cityId);
  const setLocation = usePrefs((state) => state.setLocation);

  // Which country's cities are on screen -- not the same as the saved one,
  // because browsing another country should not change the filter until a
  // city is actually picked.
  const [openCountry, setOpenCountry] = useState<{ id: number; name: string } | null>(null);

  const countries = useQuery({
    queryKey: ['countries', language],
    queryFn: () => api.countries(language),
    enabled: visible,
  });

  const cities = useQuery({
    queryKey: ['cities', openCountry?.id, language],
    queryFn: () => api.cities(openCountry!.id, language),
    enabled: visible && openCountry !== null,
  });

  const close = () => {
    setOpenCountry(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.headerRow}>
          {openCountry ? (
            <Pressable
              onPress={() => setOpenCountry(null)}
              style={styles.back}
              accessibilityRole="button"
              // A glyph rather than a word: there is no "back" string in the
              // dictionaries, and inventing one in four languages for a
              // chevron is not worth it when the label can carry the meaning.
              accessibilityLabel="Back to countries"
            >
              <Ionicons name="chevron-back" size={22} color={c.teal} />
            </Pressable>
          ) : null}
          <Text style={styles.title}>{openCountry?.name ?? 'Location'}</Text>
        </View>

        {openCountry === null ? (
          <FlatList
            data={countries.data ?? []}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={
              <Row
                label="All locations"
                selected={countryId === null}
                onPress={() => {
                  setLocation({ countryId: null, cityId: null, label: null });
                  close();
                }}
              />
            }
            ListEmptyComponent={
              countries.isLoading ? (
                <ActivityIndicator color={c.teal} style={styles.spinner} />
              ) : undefined
            }
            renderItem={({ item }) => (
              <Row
                label={item.name}
                selected={countryId === item.id && cityId === null}
                chevron
                onPress={() => setOpenCountry({ id: item.id, name: item.name })}
                // Choosing the country alone is a valid answer: someone who
                // will drive anywhere in Somaliland should not have to name a
                // city to say so.
                onSelectWhole={() => {
                  setLocation({ countryId: item.id, cityId: null, label: item.name });
                  close();
                }}
              />
            )}
          />
        ) : (
          <FlatList
            data={cities.data ?? []}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={
              <Row
                label={`All of ${openCountry.name}`}
                selected={countryId === openCountry.id && cityId === null}
                onPress={() => {
                  setLocation({ countryId: openCountry.id, cityId: null, label: openCountry.name });
                  close();
                }}
              />
            }
            ListEmptyComponent={
              cities.isLoading ? (
                <ActivityIndicator color={c.teal} style={styles.spinner} />
              ) : undefined
            }
            renderItem={({ item }) => (
              <Row
                label={item.name}
                selected={cityId === item.id}
                onPress={() => {
                  setLocation({ countryId: openCountry.id, cityId: item.id, label: item.name });
                  close();
                }}
              />
            )}
          />
        )}
      </View>
    </Modal>
  );
}

function Row({
  label,
  selected,
  chevron,
  onPress,
  onSelectWhole,
}: {
  label: string;
  selected: boolean;
  chevron?: boolean;
  onPress: () => void;
  onSelectWhole?: () => void;
}) {
  const c = useColors();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Pressable style={styles.rowMain} onPress={onPress} accessibilityRole="button">
        <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>{label}</Text>
        {selected ? <Ionicons name="checkmark" size={18} color={c.teal} /> : null}
      </Pressable>
      {chevron ? (
        <Pressable onPress={onSelectWhole} style={styles.whole} accessibilityRole="button">
          <Text style={styles.wholeText}>All</Text>
        </Pressable>
      ) : null}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={c.textFaint} /> : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(9,24,44,0.45)' },
  sheet: {
    maxHeight: '75%',
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  back: { paddingRight: Space.sm },
  title: { fontSize: 17, fontWeight: '800', color: c.text },
  spinner: { marginVertical: Space.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    paddingHorizontal: Space.lg,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Space.lg,
  },
  rowLabel: { fontSize: 15, color: c.text },
  rowLabelSelected: { fontWeight: '700', color: c.teal },
  tick: { color: c.teal, fontSize: 17, fontWeight: '700' },
  whole: { paddingHorizontal: Space.sm, paddingVertical: Space.xs },
  wholeText: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
  chevron: { color: c.textFaint, fontSize: 20, paddingLeft: Space.xs },
});
