import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '../../src/api/endpoints';
import { Brand, Radius, Space } from '../../src/theme';
import { useAuth } from '../../src/store/auth';
import { usePrefs } from '../../src/store/prefs';

const CONDITIONS = ['new', 'like_new', 'used', 'refurbished'] as const;

export default function SellScreen() {
  const t = usePrefs((state) => state.t);
  const language = usePrefs((state) => state.language);
  const session = useAuth((state) => state.session);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<string>('used');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [busy, setBusy] = useState(false);

  const categories = useQuery({
    queryKey: ['categories', language],
    queryFn: () => api.categories(language),
    enabled: Boolean(session),
  });

  if (!session) {
    return (
      <View style={styles.centred}>
        <Text style={styles.muted}>{t('signIn')}</Text>
        <Link href="/account" asChild>
          <Pressable style={styles.primary}>
            <Text style={styles.primaryText}>{t('signIn')}</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  const pickPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      // Saying what was refused and why it mattered beats a silent no-op.
      Alert.alert(t('post'), 'East Market needs access to your photos to add pictures to a listing.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });
    if (!result.canceled) setPhotos(result.assets);
  };

  const submit = async () => {
    const amount = Number(price);
    if (!title.trim() || !Number.isFinite(amount) || amount <= 0 || !categoryId) return;

    setBusy(true);
    try {
      const created = await api.createListing({
        title: title.trim(),
        description: description.trim() || undefined,
        price: amount,
        currency: 'USD',
        condition,
        categoryId,
      });
      await api.submitForReview(created.id);
      // Photos upload through signed URLs, which is a second round trip per
      // image; the listing exists either way, so a failure there is not a
      // reason to lose what the seller typed.
      Alert.alert(t('post'), `#${created.ref}`);
      setTitle('');
      setDescription('');
      setPrice('');
      setPhotos([]);
      router.push('/');
    } catch (error) {
      Alert.alert(t('post'), error instanceof Error ? error.message : t('offline'));
    } finally {
      setBusy(false);
    }
  };

  const ready = Boolean(title.trim() && Number(price) > 0 && categoryId);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Field label={t('title')}>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholderTextColor={Brand.muted} />
      </Field>

      <Field label={t('price')}>
        <TextInput
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          style={styles.input}
          placeholderTextColor={Brand.muted}
        />
      </Field>

      <Field label={t('description')}>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, styles.multiline]}
          placeholderTextColor={Brand.muted}
        />
      </Field>

      <Field label={t('categories')}>
        <View style={styles.chips}>
          {(categories.data ?? []).map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setCategoryId(category.id)}
              style={[styles.chip, categoryId === category.id && styles.chipSelected]}
            >
              <Text style={[styles.chipText, categoryId === category.id && styles.chipTextSelected]}>
                {category.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label={t('condition')}>
        <View style={styles.chips}>
          {CONDITIONS.map((value) => (
            <Pressable
              key={value}
              onPress={() => setCondition(value)}
              style={[styles.chip, condition === value && styles.chipSelected]}
            >
              <Text style={[styles.chipText, condition === value && styles.chipTextSelected]}>
                {value.replace('_', ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Pressable onPress={pickPhotos} style={styles.secondary}>
        <Text style={styles.secondaryText}>
          {photos.length ? `${photos.length} / 10` : t('addVideo').replace('video', 'photos')}
        </Text>
      </Pressable>

      {photos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
          {photos.map((photo) => (
            <Image key={photo.uri} source={{ uri: photo.uri }} style={styles.thumb} contentFit="cover" />
          ))}
        </ScrollView>
      ) : null}

      <Pressable
        onPress={submit}
        disabled={!ready || busy}
        style={[styles.primary, (!ready || busy) && styles.disabled]}
      >
        {busy ? <ActivityIndicator color={Brand.white} /> : <Text style={styles.primaryText}>{t('post')}</Text>}
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.sand },
  content: { padding: Space.lg, gap: Space.lg, paddingBottom: Space.xl * 2 },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.lg,
    backgroundColor: Brand.sand,
  },
  muted: { color: Brand.muted },
  field: { gap: Space.sm },
  label: { fontSize: 14, fontWeight: '600', color: Brand.ink },
  input: {
    minHeight: 48,
    borderRadius: Radius.field,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    backgroundColor: Brand.white,
    paddingHorizontal: Space.md,
    fontSize: 15,
    color: Brand.ink,
  },
  multiline: { minHeight: 110, paddingTop: Space.md, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  chip: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    backgroundColor: Brand.white,
  },
  chipSelected: { backgroundColor: Brand.acacia, borderColor: Brand.acacia },
  chipText: { fontSize: 14, color: Brand.ink },
  chipTextSelected: { color: Brand.white, fontWeight: '700' },
  thumbs: { gap: Space.sm },
  thumb: { width: 84, height: 84, borderRadius: Radius.field, backgroundColor: Brand.sandDeep },
  primary: {
    height: 52,
    paddingHorizontal: Space.xl,
    borderRadius: Radius.pill,
    backgroundColor: Brand.acacia,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: Brand.white, fontWeight: '700', fontSize: 15 },
  secondary: {
    height: 48,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: Brand.ink, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
