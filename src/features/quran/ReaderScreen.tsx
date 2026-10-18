import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  AppState,
  FlatList,
  View,
  Text,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  AppText,
  Button,
  Card,
  IconButton,
  Page,
  StateView,
  usePalette,
} from '../../design/ui';
import {number, ltr} from '../../design/format';
import {
  type Chapter,
  type Locator,
  type Verse,
  editionById,
  chapters,
  validateLocator,
  locatorKey,
} from './domain';
import {useLibrary} from './context';
import {
  readerDefaults,
  type ReaderPreferences,
  keepAwake,
  supportsKeepAwake,
} from './runtime';
import {act} from './LibraryScreens';
export function QuranReaderScreen(props: any) {
  try {
    const p = props.route.params,
      e = editionById(p.editionId);
    validateLocator({
      editionId: e.id,
      numberingScheme: p.numberingScheme ?? e.numbering,
      surah: p.surah,
      verse: p.verse ?? 1,
      packVersion: p.packVersion ?? 'requested',
    });
  } catch {
    return (
      <Page
        title="موضع قراءة غير صالح"
        onBack={() => props.navigation.goBack()}>
        <StateView
          title="تعذر مطابقة موضع القراءة"
          description="لم ننقل الموضع إلى رواية أو إصدار آخر."
        />
      </Page>
    );
  }
  return <Reader {...props} />;
}
function Reader({route, navigation}: any) {
  const {runtime, revision, ready, error: libraryError} = useLibrary(),
    p = usePalette(),
    params = route.params;
  const [chapter, setChapter] = useState<Chapter | null>(null),
    [font, setFont] = useState(''),
    [failure, setFailure] = useState(false),
    [attempt, setAttempt] = useState(0),
    [prefs, setPrefs] = useState<ReaderPreferences>(readerDefaults),
    [translated, setTranslated] = useState<
      {number: number; text: string}[] | null
    >(null),
    [translationError, setTranslationError] = useState(false),
    [saved, setSaved] = useState<string[]>([]);
  const [focused, setFocused] = useState(false),
    [foreground, setForeground] = useState(AppState.currentState === 'active');
  const loadedRoute = useRef('');
  const position = useRef(1);
  const [anchor, setAnchor] = useState(1);
  const edition = editionById(params.editionId),
    text = runtime.text(edition.id, params.packVersion),
    surah = params.surah;
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        keepAwake(false);
      };
    }, []),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', s =>
      setForeground(s === 'active'),
    );
    return () => sub.remove();
  }, []);
  useEffect(() => {
    keepAwake(!!chapter && !!font && focused && foreground && prefs.keepAwake);
    return () => keepAwake(false);
  }, [chapter, font, focused, foreground, prefs.keepAwake]);
  useEffect(() => {
    let current = true;
    setChapter(null);
    setFont('');
    setFailure(false);
    setTranslated(null);
    setTranslationError(false);
    if (!ready || !focused) return;
    void (async () => {
      if (!text) throw Error('missing_pack');
      const locator: Locator = validateLocator({
        editionId: edition.id,
        numberingScheme: params.numberingScheme ?? edition.numbering,
        surah,
        verse:
          loadedRoute.current ===
          `${edition.id}:${surah}:${params.verse}:${params.packVersion}`
            ? position.current
            : (params.verse ?? 1),
        packVersion: text.pack.version,
      });
      const c = await runtime.chapter(text, surah),
        family = await runtime.font(text, c),
        settings = await runtime.preferences(edition.id),
        marks = await runtime.bookmarks();
      let translation: null | {number: number; text: string}[] = null,
        translationFailed = false;
      if (settings.translationId) {
        const t = runtime.catalog.translations.find(
          t => t.id === settings.translationId,
        );
        try {
          if (!t) throw Error('translation_unavailable');
          translation = await runtime.translation(t, c, text);
        } catch {
          translationFailed = true;
        }
      }
      if (!current) return;
      loadedRoute.current = `${edition.id}:${surah}:${params.verse}:${params.packVersion}`;
      setAnchor(locator.verse);
      position.current = locator.verse;
      setPrefs(settings);
      setTranslated(translation);
      setTranslationError(translationFailed);
      setSaved(marks.map(m => m.bookmarkId));
      setFont(family);
      setChapter(c);
      // Persist an explicitly opened, validated locator; subsequent scroll updates stay edition-bound.
      await runtime.remember(locator);
    })().catch(() => {
      if (current) setFailure(true);
    });
    return () => {
      current = false;
    };
  }, [
    runtime,
    ready,
    focused,
    edition.id,
    surah,
    params.verse,
    params.packVersion,
    params.numberingScheme,
    revision,
    attempt,
  ]);
  const locator = (verse: number): Locator => ({
    editionId: edition.id,
    numberingScheme: edition.numbering,
    surah,
    verse,
    packVersion: text!.pack.version,
  });
  const viewable = useRef(({viewableItems}: any) => {
    if (viewableItems[0]) position.current = viewableItems[0].item.number;
  }).current;
  useEffect(() => {
    if (!chapter || !text) return;
    const persist = () =>
      runtime.remember({
        editionId: edition.id,
        numberingScheme: edition.numbering,
        surah,
        verse: position.current,
        packVersion: text.pack.version,
      });
    const sub = AppState.addEventListener('change', s => {
      if (s !== 'active') act(persist());
    });
    return () => {
      sub.remove();
      act(persist());
    };
  }, [chapter, text, runtime, edition.id, edition.numbering, surah]);
  if (libraryError || failure)
    return (
      <Page title="قراءة القرآن" onBack={() => navigation.goBack()}>
        <StateView
          title="تعذر فتح المصحف بأمان"
          description={
            Platform.OS !== 'android'
              ? 'قارىء المصحف غير متاح على هذا النظام بعد اكتمال اختبارات Android.'
              : Number(Platform.Version) < 31
                ? 'يتطلب التحقق من الخط حاليا Android 12 أو أحدث. تبقى الرقية والأذكار متاحة.'
                : 'قد تكون الحزمة أو الخط المطابق غير متاحين، أو موضع القراءة غير متوافق مع الإصدار. لم نستبدل النص أو الخط.'
          }
          action={{
            label: 'إعادة المحاولة',
            onPress: () => setAttempt(n => n + 1),
          }}
        />
        <Button
          label="المصحف والتنزيل"
          onPress={() =>
            navigation.navigate('QuranDownload', {editionId: edition.id})
          }
        />
        <Button
          secondary
          label="معلومات المصدر"
          onPress={() =>
            navigation.navigate('QuranSource', {editionId: edition.id})
          }
        />
      </Page>
    );
  if (!chapter || !font)
    return (
      <Page title="قراءة القرآن" onBack={() => navigation.goBack()}>
        <StateView title="جارٍ التحقق من النص والخط" busy />
      </Page>
    );
  return (
    <View style={{flex: 1, backgroundColor: p.background}}>
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          padding: 12,
          gap: 8,
        }}>
        <IconButton
          name="chevron-right"
          label="رجوع"
          onPress={() => navigation.goBack()}
        />
        <AppText
          role="screenTitle"
          accessibilityRole="header"
          style={{flex: 1}}>
          {chapters[surah - 1].name}
        </AppText>
        <IconButton
          name="settings"
          label="إعدادات القراءة"
          onPress={() =>
            navigation.navigate('QuranPreferences', {editionId: edition.id})
          }
        />
      </View>
      <FlatList
        key={`${chapter.surah}:${anchor}`}
        data={chapter.verses.slice(anchor - 1)}
        keyExtractor={v => String(v.number)}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{
          padding: 20,
          gap: prefs.view === 'verses' ? 16 : 0,
        }}
        onMomentumScrollEnd={() => {
          act(runtime.remember(locator(position.current)));
        }}
        onScrollEndDrag={() => {
          act(runtime.remember(locator(position.current)));
        }}
        onViewableItemsChanged={viewable}
        viewabilityConfig={{viewAreaCoveragePercentThreshold: 20}}
        ListHeaderComponent={
          <View style={{gap: 12, marginBottom: 20}}>
            {anchor > 1 && (
              <Button
                secondary
                label="عرض الآيات السابقة"
                onPress={() =>
                  navigation.replace('QuranReader', {
                    editionId: edition.id,
                    surah,
                    verse: Math.max(1, anchor - 20),
                    packVersion: text!.pack.version,
                  })
                }
              />
            )}

            <AppText>
              {edition.title} · {ltr(text!.pack.version)}
            </AppText>
            <Button
              secondary
              label="الاستماع لهذه الرواية"
              onPress={() =>
                navigation.navigate('QuranAudio', {
                  editionId: edition.id,
                  surah,
                })
              }
            />
            <Button
              secondary
              label="الترجمات"
              onPress={() =>
                navigation.navigate('QuranTranslations', {
                  editionId: edition.id,
                })
              }
            />
            {translationError && (
              <StateView
                title="الترجمة المختارة غير متاحة"
                description="النص العربي مستقل. اختر ترجمة متوافقة أو أعد تنزيلها."
              />
            )}
            <AppText role="caption">
              النص وعلاماته كما وردت في المصدر؛ الأرقام في الأزرار مستقلة.
            </AppText>
          </View>
        }
        renderItem={({item}) => (
          <Card
            style={
              prefs.view === 'continuous'
                ? {borderWidth: 0, borderRadius: 0}
                : undefined
            }>
            <AppText role="caption">
              {ltr(`${number(surah)}:${number(item.number)}`)}
            </AppText>
            <Text
              selectable
              style={{
                fontFamily: font,
                fontSize: prefs.size,
                lineHeight: prefs.size * prefs.lineHeight,
                fontWeight: 'normal',
                includeFontPadding: true,
                textAlign: 'right',
                writingDirection: 'rtl',
                color: p.textPrimary,
              }}>
              {item.text}
            </Text>
            {translated && (
              <View>
                <AppText role="caption">
                  ترجمة المعاني ·{' '}
                  {
                    runtime.catalog.translations.find(
                      t => t.id === prefs.translationId,
                    )?.title
                  }
                </AppText>
                <AppText
                  role="translation"
                  style={{writingDirection: 'ltr', textAlign: 'left'}}>
                  {translated[item.number - 1].text}
                </AppText>
              </View>
            )}
            <View style={{flexDirection: 'row-reverse', gap: 12}}>
              <IconButton
                name="bookmark"
                selected={saved.includes(locatorKey(locator(item.number)))}
                label={
                  saved.includes(locatorKey(locator(item.number)))
                    ? 'إزالة علامة القراءة'
                    : 'حفظ علامة القراءة'
                }
                onPress={() =>
                  act(
                    runtime
                      .toggleBookmark(locator(item.number))
                      .then(() => runtime.bookmarks())
                      .then(rows => setSaved(rows.map(b => b.bookmarkId))),
                  )
                }
              />
              <IconButton
                name="copy"
                label="نسخ الآية"
                onPress={() => {
                  Clipboard.setString(item.text);
                  AccessibilityInfo.announceForAccessibility(
                    'تم نسخ النص كما في المصدر',
                  );
                }}
              />
              <IconButton
                name="info"
                label="الإبلاغ عن ملاحظة في النص"
                onPress={() =>
                  navigation.navigate('QuranSource', locator(item.number))
                }
              />
            </View>
          </Card>
        )}
        ListFooterComponent={
          <View style={{gap: 12, paddingTop: 20}}>
            {surah < 114 && (
              <Button
                label="السورة التالية"
                onPress={() =>
                  navigation.replace('QuranReader', {
                    editionId: edition.id,
                    surah: surah + 1,
                    verse: 1,
                    packVersion: text!.pack.version,
                  })
                }
              />
            )}
            <AppText
              role="caption"
              style={{writingDirection: 'auto', textAlign: 'auto'}}>
              {chapter.sourceNotice}
            </AppText>
          </View>
        }
      />
    </View>
  );
}
