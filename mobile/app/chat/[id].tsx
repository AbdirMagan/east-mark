import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
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

import { api } from '../../src/api/endpoints';
import { Brand, Radius, Space } from '../../src/theme';
import { usePrefs } from '../../src/store/prefs';

export default function ChatScreen() {
  const t = usePrefs((state) => state.t);
  const { id } = useLocalSearchParams<{ id: string }>();
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
        <ActivityIndicator color={Brand.acacia} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
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
          placeholderTextColor={Brand.muted}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.sand },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.sand },
  list: { padding: Space.lg, gap: Space.sm },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.card,
  },
  mine: { alignSelf: 'flex-end', backgroundColor: Brand.acacia },
  theirs: { alignSelf: 'flex-start', backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.sandDeep },
  mineText: { color: Brand.white, fontSize: 14 },
  theirsText: { color: Brand.ink, fontSize: 14 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Space.sm,
    padding: Space.md,
    borderTopWidth: 1,
    borderTopColor: Brand.sandDeep,
    backgroundColor: Brand.white,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: Radius.field,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    paddingHorizontal: Space.md,
    paddingTop: Space.sm,
    fontSize: 15,
    color: Brand.ink,
  },
  send: {
    height: 44,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.pill,
    backgroundColor: Brand.acacia,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: Brand.white, fontWeight: '700' },
});
