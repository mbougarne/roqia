import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  View,
} from 'react-native';

import {useLibrary, useOnFocus} from './context';
import {
  editions,
  chapters,
  editionById,
  searchChapters,
  type EditionId,
  type Locator,
} from './domain';
import {IphoneQuranLibrary} from './IphoneQuranLibrary';
import {
  Banner,
  FeatureCard,
  NumberBadge,
  RadioRow,
  SearchField,
  Group,
  SettingRow,
  Ornament,
  rtlRow,
} from '../../design/components';
import {normalizeDigits} from '../../design/format';
import {
  AppIcon,
  IconButton,
  usePalette,
  AppText,
  Button,
  Page,
  Row,
  StateView,
} from '../../design/ui';
import {useFormat} from '../../design/useFormat';

export const act = (promise: Promise<unknown>) => {
  void promise.catch(() =>
    Alert.alert(
      'تعذر إتمام العملية',
      'حاول مرة أخرى. تقدمك ومحتواك المحفوظ لا يتغيران.',
    ),
  );
};

export function QuranLibraryScreen(props: any) {
  return Platform.OS === 'ios' ? (
    <IphoneQuranLibrary {...props} />
  ) : (
    <SurahLibraryScreen {...props} />
  );
}

function SurahLibraryScreen({navigation}: any) {
  const {number} = useFormat();
  const {runtime, ready, error, retry} = useLibrary();
  const p = usePalette();
  const [id, setId] = useState<EditionId>(editions[0].id),
    [resume, setResume] = useState<Locator | null>(null),
    [selectionReady, setSelectionReady] = useState(false),
    [query, setQuery] = useState(''),
    [searchFocused, setSearchFocused] = useState(false),
    [keyboardVisible, setKeyboardVisible] = useState(Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () =>
        setKeyboardVisible(true),
      ),
      hide = Keyboard.addListener('keyboardDidHide', () =>
        setKeyboardVisible(false),
      );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useOnFocus(() => {
    let active = true;
    act(
      runtime
        .preferred()
        .then(async e => {
          const l = await runtime.resume(e.id);
          if (active) {
            setId(e.id);
            setResume(l);
          }
        })
        .finally(() => {
          if (active) setSelectionReady(true);
        }),
    );
    return () => {
      active = false;
    };
  }, [runtime]);
  const edition = editionById(id),
    text = runtime.text(id);
  // Paint feedback before mounting the full surah list on the first visit.
  // Later tab visits retain their loaded library and search state.
  if (!error && (!ready || !selectionReady))
    return (
      <Page
        title="القرآن الكريم"
        contentStyle={{flexGrow: 1, justifyContent: 'center'}}>
        <View
          testID="quran-library-loading"
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="جارٍ فتح القرآن الكريم"
          accessibilityState={{busy: true}}
          style={{alignItems: 'center', gap: 16, padding: 24}}>
          <ActivityIndicator size="large" color={p.actionPrimary} />
          <AppText role="bodyStrong" style={{textAlign: 'center'}}>
            جارٍ فتح القرآن الكريم…
          </AppText>
        </View>
      </Page>
    );
  return (
    <Page
      title="القرآن الكريم"
      actions={
        <View style={rtlRow}>
          <IconButton
            name="search"
            label="البحث في القرآن"
            onPress={() => navigation.navigate('QuranSearch')}
          />
          <IconButton
            name="bookmark"
            label="علامات القراءة"
            onPress={() => navigation.navigate('QuranBookmarks')}
          />
        </View>
      }>
      {!(searchFocused && keyboardVisible) && !query && (
        <>
          <Group>
            <SettingRow
              title={edition.title}
              icon="book"
              onPress={() => navigation.navigate('QuranEditions')}
            />
          </Group>
          {error ? (
            <StateView
              title="تعذر فتح المكتبة"
              action={{label: 'إعادة المحاولة', onPress: retry}}
            />
          ) : (
            <Banner icon="offline" text="المصحف محفوظ على جهازك" />
          )}
          {resume && (
            <FeatureCard
              title="متابعة القراءة"
              detail={
                chapters[resume.surah - 1].name +
                ' · الآية ' +
                number(resume.verse)
              }
              art="quran-book"
              onPress={() => navigation.navigate('QuranReader', resume)}
            />
          )}
        </>
      )}
      <Row
        title="الاستماع للقرآن"
        icon="headphones"
        onPress={() =>
          navigation.navigate('QuranPlayer', {
            editionId: id,
            surah: resume?.surah ?? 1,
          })
        }
      />
      <Ornament title="السور" />
      <SearchField
        label="البحث عن سورة"
        value={query}
        onChange={setQuery}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
      />
      {searchChapters(normalizeDigits(query)).map(c => (
        <Pressable
          key={c.number}
          accessibilityRole="button"
          accessibilityLabel={number(c.number) + ' · ' + c.name}
          style={{
            ...rtlRow,
            minHeight: 60,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderWidth: 0.5,
            borderRadius: 10,
            backgroundColor: p.surface,
            borderColor: p.borderSubtle,
          }}
          onPress={() =>
            navigation.navigate('QuranReader', {
              editionId: id,
              surah: c.number,
              verse: 1,
              ...(text
                ? {
                    packVersion: text.pack.version,
                    numberingScheme: edition.numbering,
                  }
                : {}),
            })
          }>
          <NumberBadge value={c.number} />
          <View style={{flex: 1}}>
            <AppText role="bodyStrong">{c.name}</AppText>
            <AppText role="caption" style={{color: p.textSecondary}}>
              {edition.title} ·{' '}
              {number(
                edition.riwaya === 'warsh' ? c.warshVerses : c.hafsVerses,
              )}{' '}
              آيات
            </AppText>
          </View>
          <AppIcon name="chevron-left" size={22} />
        </Pressable>
      ))}

      {!searchChapters(normalizeDigits(query)).length && (
        <StateView title="لا توجد سورة مطابقة" />
      )}
    </Page>
  );
}

export function EditionScreen({navigation}: any) {
  const {runtime, ready, error, retry} = useLibrary(),
    [selected, setSelected] = useState<string>('');
  useOnFocus(() => {
    act(runtime.preferred().then(e => setSelected(e.id)));
  }, [runtime]);
  return (
    <Page title="اختيار المصحف" onBack={() => navigation.goBack()}>
      <AppText>
        المصحفان ورش وحفص متاحان دون اتصال. اختر الرواية التي تقرأ بها؛ لكل
        منهما موضع قراءة مستقل.
      </AppText>
      {error && (
        <StateView
          title="تعذر فتح المصاحف"
          action={{label: 'إعادة المحاولة', onPress: retry}}
        />
      )}
      {runtime.catalog.texts
        .map(t => editionById(t.editionId))
        .map(e => (
          <RadioRow
            key={e.id}
            title={e.title}
            detail={e.publisher}
            selected={selected === e.id}
            onPress={() =>
              act(runtime.select(e.id).then(() => setSelected(e.id)))
            }
          />
        ))}
      <Banner
        icon="offline"
        text="النص والخط مرفقان بالتطبيق. التنزيل للصوت فقط."
      />
      {!!selected && (
        <Group>
          <SettingRow
            title="معلومات المصحف"
            icon="book"
            onPress={() =>
              navigation.navigate('QuranSource', {editionId: selected})
            }
          />
          <SettingRow
            title="اختيار الترجمة"
            detail="Français · English · دون ترجمة"
            icon="translate"
            onPress={() =>
              navigation.navigate('QuranTranslations', {editionId: selected})
            }
          />
        </Group>
      )}
      <Button
        label="متابعة"
        disabled={!ready || error || !selected}
        onPress={() => navigation.goBack()}
      />
    </Page>
  );
}
