import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Space } from '../theme';
import type { Palette } from '../theme';
import { useColors, useStyles } from '../useTheme';
import { usePrefs } from '../store/prefs';

/**
 * A password box that can be unmasked.
 *
 * Typing a password you cannot see is hard on a phone keyboard, where a
 * mistyped character is invisible and the only feedback is a sign-in that
 * fails without saying which field was wrong. It starts masked, because people
 * type passwords where others can see the screen, and the toggle names the
 * state it will move to so a screen reader says something useful.
 */
export function PasswordField({
  value,
  onChangeText,
  placeholder,
  textContentType = 'password',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  textContentType?: 'password' | 'newPassword';
}) {
  const c = useColors();
  const styles = useStyles(makeStyles);
  const t = usePrefs((state) => state.t);
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.row}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.slateLight}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType={textContentType}
        style={styles.input}
      />
      <Pressable
        onPress={() => setVisible((previous) => !previous)}
        accessibilityRole="button"
        accessibilityState={{ selected: visible }}
        accessibilityLabel={visible ? t('hidePassword') : t('showPassword')}
        // 44pt square: the size a thumb can actually hit.
        style={styles.toggle}
      >
        <Text style={styles.toggleText}>{visible ? '🙈' : '👁'}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.divider,
    borderRadius: Radius.field,
    backgroundColor: c.surface,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: Space.md,
    fontSize: 15,
    color: c.text,
  },
  toggle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 20 },
});
