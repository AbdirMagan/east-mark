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

import { PasswordField } from '../../src/components/PasswordField';
import { Brand, Radius, Space } from '../../src/theme';
import { LANGUAGES, LANGUAGE_NAMES } from '../../src/i18n';
import { displayName } from '../../src/api/types';
import { useAuth } from '../../src/store/auth';
import { usePrefs } from '../../src/store/prefs';

export default function AccountScreen() {
  const t = usePrefs((state) => state.t);
  const language = usePrefs((state) => state.language);
  const setLanguage = usePrefs((state) => state.setLanguage);

  const session = useAuth((state) => state.session);
  const profile = useAuth((state) => state.profile);
  const working = useAuth((state) => state.working);
  const lastError = useAuth((state) => state.lastError);
  const signIn = useAuth((state) => state.signIn);
  const signUp = useAuth((state) => state.signUp);
  const signOut = useAuth((state) => state.signOut);
  const requestPasswordReset = useAuth((state) => state.requestPasswordReset);

  const [registering, setRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  return (
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
              placeholderTextColor={Brand.muted}
              textContentType="name"
              style={styles.input}
            />
          ) : null}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t('email')}
            placeholderTextColor={Brand.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            style={styles.input}
          />

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
              const ok = registering
                ? await signUp(email.trim(), password, fullName.trim())
                : await signIn(email.trim(), password);
              if (ok && registering) setConfirmSent(true);
            }}
            disabled={working || !email.trim() || !password}
            style={[styles.button, (working || !email.trim() || !password) && styles.buttonDisabled]}
          >
            {working ? (
              <ActivityIndicator color={Brand.white} />
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
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.sand },
  content: { padding: Space.lg, gap: Space.lg },
  card: {
    padding: Space.lg,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    backgroundColor: Brand.white,
    gap: Space.md,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  name: { fontSize: 18, fontWeight: '700', color: Brand.ink },
  email: { fontSize: 13, color: Brand.muted },
  input: {
    height: 48,
    borderRadius: Radius.field,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    paddingHorizontal: Space.md,
    fontSize: 15,
    color: Brand.ink,
    backgroundColor: Brand.white,
  },
  button: {
    height: 50,
    borderRadius: Radius.pill,
    backgroundColor: Brand.acacia,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Brand.white, fontWeight: '700', fontSize: 15 },
  secondaryButton: {
    height: 46,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: Brand.ink, fontWeight: '600' },
  link: { color: Brand.acacia, fontWeight: '600', fontSize: 13, textAlign: 'center' },
  linkDisabled: { opacity: 0.4 },
  error: { color: Brand.clayDark, fontSize: 13 },
  notice: { color: Brand.muted, fontSize: 13 },
  languages: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  chip: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
  },
  chipSelected: { backgroundColor: Brand.acacia, borderColor: Brand.acacia },
  chipText: { fontSize: 14, color: Brand.ink },
  chipTextSelected: { color: Brand.white, fontWeight: '700' },
});
