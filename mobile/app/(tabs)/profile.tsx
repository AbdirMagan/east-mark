import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '../../src/api/endpoints';
import { PasswordField } from '../../src/components/PasswordField';
import { Radius, Space, Type } from '../../src/theme';
import type { Palette } from '../../src/theme';
import { useColors, useStyles } from '../../src/useTheme';
import { LANGUAGES, LANGUAGE_NAMES } from '../../src/i18n';
import { displayName } from '../../src/api/types';
import { useAuth } from '../../src/store/auth';
import { AppHeader } from '../../src/components/AppHeader';
import { usePrefs } from '../../src/store/prefs';

/**
 * System first, because someone who has set their whole phone to dark at night
 * has already said what they want. The other two are there because that
 * setting is blunt: people read in bed with the lights on, and people use a
 * bright phone outdoors.
 */
const THEME_OPTIONS = [
  { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
] as const;

export default function AccountScreen() {
  const c = useColors();
  const styles = useStyles(makeStyles);
  const t = usePrefs((state) => state.t);
  const language = usePrefs((state) => state.language);
  const themeMode = usePrefs((state) => state.themeMode);
  const setThemeMode = usePrefs((state) => state.setThemeMode);
  const setLanguage = usePrefs((state) => state.setLanguage);

  const session = useAuth((state) => state.session);
  const profile = useAuth((state) => state.profile);
  const working = useAuth((state) => state.working);
  const lastError = useAuth((state) => state.lastError);
  const signIn = useAuth((state) => state.signIn);
  const signUp = useAuth((state) => state.signUp);
  const signInWithPhone = useAuth((state) => state.signInWithPhone);
  const signUpWithPhone = useAuth((state) => state.signUpWithPhone);
  const signOut = useAuth((state) => state.signOut);
  const requestPasswordReset = useAuth((state) => state.requestPasswordReset);

  const [registering, setRegistering] = useState(false);
  // Phone first: most people here have one, and many have no email at all.
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dialCode, setDialCode] = useState('252');
  const [password, setPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const countries = useQuery({ queryKey: ['countries', 'en'], queryFn: () => api.countries('en') });
  const byPhone = method === 'phone';
  const identifier = byPhone ? phone.trim() : email.trim();

  return (
    <View style={styles.screen}>
    <AppHeader showSearch={false} />
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {session ? (
        <View style={styles.card}>
          <Text style={styles.name}>{displayName(profile)}</Text>
          <Text style={styles.email}>{session.user.email}</Text>
          <Pressable onPress={() => void signOut()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{t('signOut')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{registering ? t('signUp') : t('signIn')}</Text>

          {registering ? (
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('name')}
              placeholderTextColor={c.slateLight}
              textContentType="name"
              style={styles.input}
            />
          ) : null}

          <View style={styles.methods}>
            {(['phone', 'email'] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => setMethod(option)}
                style={[styles.method, method === option && styles.methodOn]}
              >
                <Ionicons
                  name={option === 'phone' ? 'call-outline' : 'mail-outline'}
                  size={15}
                  color={method === option ? c.text : c.textMuted}
                />
                <Text style={[styles.methodText, method === option && styles.methodTextOn]}>
                  {t(option === 'phone' ? 'phone' : 'email')}
                </Text>
              </Pressable>
            ))}
          </View>

          {byPhone ? (
            <View style={styles.phoneRow}>
              {/* The dial code travels with the number: "063 440 0000" is only
                  a number once you know which country it is in. */}
              <Pressable
                style={styles.dial}
                onPress={() => {
                  const list = (countries.data ?? []).map((country) =>
                    (country.dialCode ?? '').replace(/[^0-9]/g, ''),
                  );
                  const unique = [...new Set(list)].filter(Boolean);
                  if (!unique.length) return;
                  const next = unique[(unique.indexOf(dialCode) + 1) % unique.length];
                  setDialCode(next ?? dialCode);
                }}
              >
                <Text style={styles.dialText}>+{dialCode}</Text>
                <Ionicons name="chevron-down" size={13} color={c.textMuted} />
              </Pressable>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="063 440 0000"
                placeholderTextColor={c.slateLight}
                keyboardType="phone-pad"
                autoCorrect={false}
                textContentType="telephoneNumber"
                style={[styles.input, styles.phoneInput]}
              />
            </View>
          ) : (
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('email')}
              placeholderTextColor={c.slateLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              style={styles.input}
            />
          )}

          <PasswordField
            value={password}
            onChangeText={setPassword}
            placeholder={t('password')}
            textContentType={registering ? 'newPassword' : 'password'}
          />

          {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
          {confirmSent ? <Text style={styles.notice}>{t('forgotSent')}</Text> : null}
          {resetSent ? <Text style={styles.notice}>{t('forgotSent')}</Text> : null}

          <Pressable
            onPress={async () => {
              if (byPhone) {
                // No code to wait for and no inbox to check: a phone account
                // is usable the moment it is made.
                const ok = registering
                  ? await signUpWithPhone({
                      phone: phone.trim(),
                      dialCode,
                      password,
                      fullName: fullName.trim(),
                    })
                  : await signInWithPhone(phone.trim(), dialCode, password);
                if (ok) setConfirmSent(false);
                return;
              }
              const ok = registering
                ? await signUp(email.trim(), password, fullName.trim())
                : await signIn(email.trim(), password);
              if (ok && registering) setConfirmSent(true);
            }}
            disabled={working || !identifier || !password}
            style={[styles.button, (working || !identifier || !password) && styles.buttonDisabled]}
          >
            {working ? (
              <ActivityIndicator color={c.white} />
            ) : (
              <Text style={styles.buttonText}>{registering ? t('signUp') : t('signIn')}</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setRegistering((previous) => !previous);
              setConfirmSent(false);
              setResetSent(false);
            }}
          >
            <Text style={styles.link}>{registering ? t('signIn') : t('signUp')}</Text>
          </Pressable>

          {/* Only on sign-in: someone creating an account has no password to
              have forgotten. Uses the address already typed rather than
              asking for it again on another screen. */}
          {!registering ? (
            <Pressable
              onPress={async () => {
                if (await requestPasswordReset(email.trim())) setResetSent(true);
              }}
              disabled={working || !email.trim()}
            >
              <Text style={[styles.link, (working || !email.trim()) && styles.linkDisabled]}>
                {t('forgotPassword')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Appearance</Text>
        <View style={styles.themes}>
          {THEME_OPTIONS.map((option) => {
            const selected = themeMode === option.mode;
            return (
              <Pressable
                key={option.mode}
                onPress={() => setThemeMode(option.mode)}
                style={[styles.themeOption, selected && styles.themeOptionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
              >
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={selected ? c.white : c.slate}
                />
                <Text style={[styles.themeLabel, selected && styles.themeLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('language')}</Text>
        <View style={styles.languages}>
          {LANGUAGES.map((code) => (
            <Pressable
              key={code}
              onPress={() => setLanguage(code)}
              style={[styles.chip, language === code && styles.chipSelected]}
            >
              <Text style={[styles.chipText, language === code && styles.chipTextSelected]}>
                {LANGUAGE_NAMES[code]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: Space.lg, gap: Space.lg },
  card: {
    padding: Space.lg,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: c.divider,
    backgroundColor: c.surface,
    gap: Space.md,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: c.text },
  name: { fontSize: 20, fontWeight: '700', color: c.text },
  email: { fontSize: 13, color: c.textMuted },
  methods: { flexDirection: 'row', gap: 6, marginBottom: Space.sm },
  method: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: Radius.field,
    backgroundColor: c.card,
  },
  methodOn: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.teal },
  methodText: { fontSize: Type.small, fontWeight: '600', color: c.textMuted },
  methodTextOn: { color: c.text },

  phoneRow: { flexDirection: 'row', gap: Space.sm },
  dial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Space.md,
    height: 46,
    borderRadius: Radius.field,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.divider,
  },
  dialText: { fontSize: Type.body, fontWeight: '700', color: c.text },
  phoneInput: { flex: 1 },

  input: {
    height: 48,
    borderRadius: Radius.field,
    borderWidth: 1,
    borderColor: c.divider,
    paddingHorizontal: Space.md,
    fontSize: 15,
    color: c.text,
    backgroundColor: c.surface,
  },
  button: {
    height: 50,
    borderRadius: Radius.pill,
    backgroundColor: c.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: c.white, fontWeight: '700', fontSize: 15 },
  secondaryButton: {
    height: 46,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: c.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: c.text, fontWeight: '600' },
  link: { color: c.teal, fontWeight: '600', fontSize: 13, textAlign: 'center' },
  linkDisabled: { opacity: 0.4 },
  error: { color: c.error, fontSize: 13 },
  notice: { color: c.textMuted, fontSize: 13 },
  languages: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  themes: { flexDirection: 'row', gap: Space.sm },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    gap: Space.xs,
    paddingVertical: Space.md,
    borderRadius: Radius.field,
    borderWidth: 1,
    borderColor: c.divider,
  },
  themeOptionSelected: { backgroundColor: c.teal, borderColor: c.teal },
  themeLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  themeLabelSelected: { color: c.white },
  chip: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: c.divider,
  },
  chipSelected: { backgroundColor: c.teal, borderColor: c.teal },
  chipText: { fontSize: 15, color: c.text },
  chipTextSelected: { color: c.white, fontWeight: '700' },
});
