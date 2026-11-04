import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '../../../src/api/endpoints';
import { Radius, Space } from '../../../src/theme';
import type { Palette } from '../../../src/theme';
import { useColors, useStyles } from '../../../src/useTheme';
import { AppHeader } from '../../../src/components/AppHeader';
import { usePrefs } from '../../../src/store/prefs';

export default function ChatScreen() {
  const c = useColors();
  const styles = useStyles(makeStyles);
  const t = usePrefs((state) => state.t);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');

  const messages = useQuery({
    queryKey: ['messages', id],
    queryFn: () => api.messages(id),
    // A conversation is the one place where being a minute stale is obvious,
    // so poll while the screen is open rather than waiting for a pull.
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (id) void api.markRead(id);
  }, [id]);

  const send = useMutation({
    mutationFn: (body: string) => api.sendMessage(id, body),
    onSuccess: () => {
      setDraft('');
      void queryClient.invalidateQueries({ queryKey: ['messages', id] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  if (messages.isLoading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={c.teal} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* No search here: a query typed inside a conversation has nowhere to go. */}
      <AppHeader onBack={() => router.back()} showSearch={false} />
      <FlatList
        data={messages.data?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        // Newest at the bottom, which is where a conversation belongs, and
        // inverted keeps it there without scrolling after every send.
        inverted
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.isMine ? styles.mine : styles.theirs]}>
            <Text style={item.isMine ? styles.mineText : styles.theirsText}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('typeMessage')}
          placeholderTextColor={c.slateLight}
          multiline
          style={styles.input}
        />
        <Pressable
          onPress={() => draft.trim() && send.mutate(draft.trim())}
          disabled={!draft.trim() || send.isPending}
          style={[styles.send, (!draft.trim() || send.isPending) && styles.sendDisabled]}
        >
          <Text style={styles.sendText}>{send.isPending ? t('sending') : t('send')}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg },
  list: { padding: Space.lg, gap: Space.sm },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.card,
  },
  mine: { alignSelf: 'flex-end', backgroundColor: c.teal },
  theirs: { alignSelf: 'flex-start', backgroundColor: c.surface, borderWidth: 1, borderColor: c.divider },
  mineText: { color: c.white, fontSize: 15 },
  theirsText: { color: c.text, fontSize: 15 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Space.sm,
    padding: Space.md,
    borderTopWidth: 1,
    borderTopColor: c.divider,
    backgroundColor: c.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: Radius.field,
    borderWidth: 1,
    borderColor: c.divider,
    paddingHorizontal: Space.md,
    paddingTop: Space.sm,
    fontSize: 15,
    color: c.text,
  },
  send: {
    height: 44,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.pill,
    backgroundColor: c.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: c.white, fontWeight: '700' },
});
