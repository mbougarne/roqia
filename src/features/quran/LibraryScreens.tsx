import React, {useEffect, useState} from 'react';
import {Alert, Keyboard, Pressable, View} from 'react-native';

import {useLibrary, useOnFocus} from './context';
import {
  editions,
  chapters,
  editionById,
  searchChapters,
  type EditionId,
  type Locator,
} from './domain';
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
import {Illustration} from '../../design/Illustration';
import {
  AppIcon,
  IconButton,
  usePalette,
  AppText,
  Button,
  Card,
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

export function QuranLibraryScreen({navigation}: any) {
  const {number} = useFormat();
  const {runtime, ready, error, retry} = useLibrary();
  const p = usePalette();
  const [id, setId] = useState<EditionId>(editions[0].id),
    [resume, setResume] = useState<Locator | null>(null),
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
      runtime.preferred().then(async e => {
        const l = await runtime.resume(e.id);
        if (active) {
          setId(e.id);
          setResume(l);
        }
      }),
    );
    return () => {
      active = false;
    };
  }, [runtime]);
  const edition = editionById(id),
    text = runtime.text(id),
    installed = text && runtime.installed(text.pack);
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
          ) : !ready ? (
            <StateView title="جارٍ فتح المكتبة" busy />
          ) : !installed ? (
            <Card>
              <AppText role="sectionTitle">
                اختر مصحفك للقراءة دون اتصال
              </AppText>
              <AppText>
                يمكنك البحث في أسماء السور الآن. اختيار الرواية لا يبدأ التنزيل.
              </AppText>
              <Button
                label="تنزيل المصحف"
                onPress={() =>
                  navigation.navigate('QuranDownload', {editionId: id})
                }
              />
            </Card>
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
            !installed
              ? navigation.navigate('QuranDownload', {editionId: id})
              : navigation.navigate('QuranReader', {
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
          <AppIcon name={installed ? 'check' : 'download'} size={22} />
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
        اختر الرواية التي تقرأ بها. يمكنك الاحتفاظ بالمصحفين، ولكل منهما موضع
        قراءة مستقل.
      </AppText>
      {error && (
        <StateView
          title="تعذر قراءة حالة التنزيل"
          action={{label: 'إعادة المحاولة', onPress: retry}}
        />
      )}
      {editions.map(e => (
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
      <Banner text="يمكنك إضافة المصحف الآخر لاحقا؛ لكل رواية موضع قراءة مستقل." />
      <Illustration name="download" height={180} />
      <Button
        label="متابعة"
        disabled={!ready || error || !selected}
        onPress={() =>
          navigation.navigate('QuranDownload', {editionId: selected})
        }
      />
    </Page>
  );
}

export function MushafDownloadScreen({route, navigation}: any) {
  const {bytes} = useFormat();
  const {runtime, ready, error, retry} = useLibrary(),
    e = editionById(route.params.editionId),
    t = runtime.text(e.id),
    installed = t && runtime.installed(t.pack);
  const size = t
    ? bytes(t.pack.assets.reduce((sum, a) => sum + a.bytes, 0))
    : '—';
  return (
    <Page title="تحميل المصحف" onBack={() => navigation.goBack()}>
      <FeatureCard
        title={e.title}
        detail={e.publisher + ' · 114 سورة'}
        art="quran-book"
      />
      {error ? (
        <StateView
          title="تعذر فتح التنزيل"
          action={{label: 'إعادة المحاولة', onPress: retry}}
        />
      ) : !t ? (
        <StateView title="المصحف غير متاح للتنزيل بعد" />
      ) : (
        <>
          <Group>
            <SettingRow
              title="معلومات المصحف"
              detail={size}
              icon="book"
              onPress={() =>
                navigation.navigate('QuranSource', {editionId: e.id})
              }
            />
          </Group>
          <Ornament title="ترجمة المعاني" />
          <Row
            title="اختيار الترجمة"
            detail="Français · English · دون ترجمة"
            icon="translate"
            onPress={() =>
              navigation.navigate('QuranTranslations', {editionId: e.id})
            }
          />
          <Group>
            <SettingRow
              title="سياسة التنزيل"
              detail="حسب اختيار Wi-Fi في الإعدادات"
              icon="wifi"
              onPress={() => navigation.navigate('Settings')}
            />
            <SettingRow title="حجم التنزيل" detail={size} icon="storage" />
          </Group>
          <Button
            icon={installed ? 'book' : 'download'}
            label={installed ? 'فتح المصحف' : 'تحميل · ' + size}
            disabled={!ready || error}
            onPress={() =>
              installed
                ? navigation.navigate('QuranReader', {
                    editionId: e.id,
                    surah: 1,
                    verse: 1,
                    packVersion: t.pack.version,
                    numberingScheme: e.numbering,
                  })
                : act(
                    runtime
                      .download(t.pack)
                      .then(() => navigation.navigate('Downloads')),
                  )
            }
          />
        </>
      )}
      <Button
        secondary
        label="اختيار رواية أخرى"
        onPress={() => navigation.navigate('QuranEditions')}
      />
      <Row
        title="إدارة التنزيلات"
        icon="download"
        onPress={() => navigation.navigate('Downloads')}
      />
    </Page>
  );
}
