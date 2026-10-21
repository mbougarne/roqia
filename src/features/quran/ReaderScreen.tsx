import Clipboard from '@react-native-clipboard/clipboard';
import {useFocusEffect} from '@react-navigation/native';
import React, {useEffect, useRef, useState, useCallback, useMemo} from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  View,
  Text,
  AccessibilityInfo,
  Pressable,
  Modal,
  Platform,
  StyleSheet,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useLibrary} from './context';
import {
  containsCoordinate,
  sectionAt,
  sectionChapter,
  sectionRange,
  sectionStarts,
  sectionTarget,
  sectionWord,
  sectionNavigationLabel,
} from './divisions';
import {
  type Chapter,
  type Locator,
  type Verse,
  editionById,
  chapters,
  validateLocator,
  locatorKey,
} from './domain';
import {act} from './LibraryScreens';
import {ReaderVerseAudio} from './ListenScreen';
import {QuranIndex} from './QuranIndex';
import {readerPassages, verseAtOffset} from './readerLayout';
import {readerDefaults, type ReaderPreferences, keepAwake} from './runtime';
import {
  translationForVerse,
  type DisplayTranslation,
} from './translationAlignment';
import {NumberBadge, Ornament, rtlRow} from '../../design/components';
import {number as markerNumber} from '../../design/format';
import {
  AppText,
  AppIcon,
  Button,
  Card,
  IconButton,
  Page,
  StateView,
  Sheet,
  usePalette,
} from '../../design/ui';
import {useFormat} from '../../design/useFormat';

export function QuranReaderScreen(props: any) {
  let identity: string;
  try {
    const p = props.route.params,
      e = editionById(p.editionId);
    identity = locatorKey({
      editionId: e.id,
      numberingScheme: p.numberingScheme ?? e.numbering,
      surah: p.surah,
      verse: p.verse ?? 1,
      packVersion: p.packVersion ?? 'requested',
    });
    if (Platform.OS === 'ios' && p.section) {
      const range = sectionRange(e.id, p.section);
      if (!containsCoordinate(range, {surah: p.surah, verse: p.verse ?? 1}))
        throw Error('section_locator_mismatch');
      identity += `:${p.section.kind}:${p.section.number}`;
    }
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
  // Navigation can reuse this screen with new params. Never render the previous
  // chapter against the new locator while the loading effect is still pending.
  return <Reader key={identity} {...props} />;
}

function Reader({route, navigation}: any) {
  const {number} = useFormat();
  const {runtime, ready, error: libraryError} = useLibrary(),
    p = usePalette(),
    params = route.params;
  const [chapter, setChapter] = useState<Chapter | null>(null),
    [font, setFont] = useState(''),
    [failure, setFailure] = useState(false),
    [preparing, setPreparing] = useState(true),
    [attempt, setAttempt] = useState(0),
    [prefs, setPrefs] = useState<ReaderPreferences>(readerDefaults),
    [translated, setTranslated] = useState<DisplayTranslation[] | null>(null),
    [translationError, setTranslationError] = useState(false),
    [saved, setSaved] = useState<string[]>([]),
    [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [focused, setFocused] = useState(false),
    [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [translationVerse, setTranslationVerse] = useState<number | null>(null);
  const [indexVisible, setIndexVisible] = useState(false);
  const closeIndex = () => {
    Keyboard.dismiss();
    setIndexVisible(false);
  };
  const [audioVerse, setAudioVerse] = useState<{
    verse: number;
    request: number;
  } | null>(null);
  const audioRequest = useRef(0);
  const dimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [tapPoint, setTapPoint] = useState({x: 0, y: 100});
  const continuous = useRef(false);
  continuous.current = prefs.view === 'continuous';
  const textLines = useRef<{y: number; height: number; verse: number}[]>([]);
  const headerHeight = useRef<number | null>(null);
  const position = useRef(params.verse ?? 1);
  const [visibleVerse, setVisibleVerse] = useState(params.verse ?? 1);
  const list = useRef<FlatList<Verse[]>>(null);
  const pendingRestore = useRef<number | null>(params.verse ?? 1);
  const restoreFailed = useRef(false);
  const contentReady = useRef(false);
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layout = useRef('');
  const edition = editionById(params.editionId),
    text = runtime.text(edition.id, params.packVersion),
    surah = params.surah;
  const section =
    Platform.OS === 'ios'
      ? (params.section ?? {kind: 'surah', number: surah})
      : undefined;
  const bounds = section
    ? sectionChapter(edition.id, section, surah)
    : undefined;
  const firstVerse = bounds?.first ?? 1;
  const lastVerse = bounds?.last;
  const sourceVerseMarkers = edition.sourceVerseMarkers;
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setAudioVerse(null);
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
    // Keep the mounted chapter and scroll position while another screen covers it.
    // Revalidate on return without turning the saved verse into a data boundary.
    if (!ready || !focused) return;
    setFailure(false);
    void (async () => {
      if (!text) throw Error('missing_pack');
      const locator: Locator = validateLocator({
        editionId: edition.id,
        numberingScheme: params.numberingScheme ?? edition.numbering,
        surah,
        verse: position.current,
        packVersion: text.pack.version,
      });
      const [c, settings, marks] = await Promise.all([
        runtime.chapter(text, surah),
        runtime.preferences(edition.id),
        runtime.bookmarks(),
      ]);
      const family = await runtime.font(text, c);
      let translation: null | DisplayTranslation[] = null,
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
      const nextLayout = JSON.stringify([
        settings.view,
        settings.size,
        settings.lineHeight,
        settings.translationId,
      ]);
      if (layout.current !== nextLayout) {
        setPreparing(true);
        pendingRestore.current = position.current;
        textLines.current = [];
        headerHeight.current = null;
        contentReady.current = false;
        if (restoreTimer.current) clearTimeout(restoreTimer.current);
      }
      layout.current = nextLayout;
      setPrefs(settings);
      setTranslated(translation);
      setTranslationError(translationFailed);
      setSaved(marks.map(m => locatorKey(m as Locator)));
      setFont(family);
      setChapter(c);
      // Persist an explicitly opened, validated locator; subsequent scroll updates stay edition-bound.
      await runtime.remember({
        ...locator,
        verse: position.current,
        ...(section ? {section} : {}),
      });
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
    // Audio download progress must not reload the text or move the reader.
    // Text selection and focus changes still revalidate the reader assets.
    text,
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
    if (
      pendingRestore.current === null &&
      !continuous.current &&
      viewableItems[0]
    ) {
      position.current = viewableItems[0].item[0].number;
      setVisibleVerse(position.current);
    }
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
        ...(section ? {section} : {}),
      });
    const sub = AppState.addEventListener('change', s => {
      if (s !== 'active') act(persist());
    });
    return () => {
      sub.remove();
      act(persist());
    };
  }, [chapter, text, runtime, edition.id, edition.numbering, surah]);
  useEffect(
    () => () => {
      if (restoreTimer.current) clearTimeout(restoreTimer.current);
    },
    [],
  );
  const restorePosition = () => {
    const verse = pendingRestore.current;
    if (
      verse === null ||
      !list.current ||
      headerHeight.current === null ||
      !contentReady.current
    )
      return;
    if (prefs.view === 'continuous') {
      const line =
        textLines.current.find(line => line.verse >= verse) ??
        textLines.current[textLines.current.length - 1];
      if (!line) return;
      list.current.scrollToOffset({
        offset: verse === firstVerse ? 0 : headerHeight.current + line.y + 4,
        animated: false,
      });
    } else {
      restoreFailed.current = false;
      list.current.scrollToIndex({
        index: verse - firstVerse,
        animated: false,
        viewPosition: 0,
      });
      if (restoreFailed.current) return;
    }
    position.current = verse;
    setVisibleVerse(verse);
    pendingRestore.current = null;
    setPreparing(false);
  };
  const passages = useMemo(
    () =>
      chapter
        ? readerPassages(
            chapter.verses.filter(
              v =>
                v.number >= firstVerse &&
                (lastVerse === undefined || v.number <= lastVerse),
            ),
            prefs.view === 'continuous',
          )
        : [],
    [chapter, prefs.view, firstVerse, lastVerse],
  );
  const actions = (verse: Verse, inline = false) => (
    <View style={{...rtlRow, justifyContent: 'center', gap: 8}}>
      <IconButton
        name="copy"
        label="نسخ الآية"
        onPress={() => {
          Clipboard.setString(verse.text);
          AccessibilityInfo.announceForAccessibility('تم نسخ الآية');
          setSelectedVerse(null);
        }}
      />
      <IconButton
        name="bookmark"
        selected={saved.includes(locatorKey(locator(verse.number)))}
        label={
          saved.includes(locatorKey(locator(verse.number)))
            ? 'إزالة علامة القراءة'
            : 'حفظ علامة القراءة'
        }
        onPress={() =>
          act(
            runtime
              .toggleBookmark(locator(verse.number))
              .then(() => runtime.bookmarks())
              .then(rows => {
                setSaved(rows.map(b => locatorKey(b as Locator)));
                setSelectedVerse(null);
              }),
          )
        }
      />
      {inline && prefs.translationId && (
        <IconButton
          name="translate"
          label="ترجمة الآية"
          disabled={!translated}
          onPress={() => {
            setSelectedVerse(null);
            setTranslationVerse(verse.number);
          }}
        />
      )}
      <IconButton
        name="volume"
        label="الاستماع للآية"
        onPress={() => {
          setSelectedVerse(null);
          setAudioVerse({
            verse: verse.number,
            request: ++audioRequest.current,
          });
        }}
      />
    </View>
  );
  const verseText = (verse: Verse) =>
    verse.text +
    (edition.riwaya === 'hafs' && !sourceVerseMarkers
      ? ` ﴿${markerNumber(verse.number)}﴾ `
      : ' ');
  const translationContent = (translation: DisplayTranslation | undefined) => {
    return translation?.text ? (
      <View style={{gap: 8}}>
        <Ornament />
        <AppText role="caption" style={{color: p.textSecondary}}>
          ترجمة المعاني ·{' '}
          {
            runtime.catalog.translations.find(t => t.id === prefs.translationId)
              ?.title
          }
        </AppText>
        {translation.warshStart !== undefined && (
          <AppText role="caption">
            {'معاني آيات ورش ' +
              number(translation.warshStart!) +
              '–' +
              number(translation.number) +
              ' · مرجع الترجمة ' +
              number(translation.sourceStart!) +
              '–' +
              number(translation.sourceEnd!)}
          </AppText>
        )}
        <AppText
          role="translation"
          accessibilityLanguage={
            runtime.catalog.translations.find(t => t.id === prefs.translationId)
              ?.language
          }
          style={{
            writingDirection: 'ltr',
            textAlign: 'left',
            fontFamily: 'sans-serif',
          }}>
          {translation.text}
        </AppText>
      </View>
    ) : null;
  };
  const translationFor = (item: Verse) =>
    translationContent(translated?.[item.number - 1]);
  const toolbarWidth = prefs.translationId ? 240 : 184;
  // iOS must not dismiss the native verse-options modal while presenting the
  // audio/translation sheet: UIKit can leave an invisible modal blocking every
  // touch, including the mini-player's close button. Keep this popover in the
  // reader's view hierarchy, so only the destination sheet is a native modal.
  const verseOptions =
    selectedVerse && focused ? (
      <View
        accessibilityViewIsModal
        style={
          Platform.OS === 'ios'
            ? [StyleSheet.absoluteFillObject, {zIndex: 10}]
            : {flex: 1}
        }>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          accessibilityRole="button"
          accessibilityLabel="إغلاق خيارات الآية"
          onPress={() => setSelectedVerse(null)}
        />
        <View
          style={{
            position: 'absolute',
            top: Math.max(
              12,
              Math.min(
                dimensions.height - insets.bottom - 80,
                tapPoint.y - (Platform.OS === 'ios' ? insets.top : 0) - 76,
              ),
            ),
            left: Math.max(
              12,
              Math.min(
                dimensions.width - toolbarWidth - 12,
                tapPoint.x - toolbarWidth / 2,
              ),
            ),
            width: toolbarWidth,
            padding: 8,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: p.borderSubtle,
            backgroundColor: p.surface,
            elevation: 8,
          }}>
          {actions(selectedVerse, true)}
        </View>
      </View>
    ) : null;
  const loading = (
    <View
      testID="quran-reader-loading"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`جارٍ فتح سورة ${chapters[surah - 1].name}`}
      accessibilityState={{busy: true}}
      style={{alignItems: 'center', gap: 16, padding: 24}}>
      <ActivityIndicator size="large" color={p.actionPrimary} />
      <AppText role="bodyStrong" style={{textAlign: 'center'}}>
        جارٍ فتح السورة…
      </AppText>
    </View>
  );
  if (libraryError || failure)
    return (
      <Page title="قراءة القرآن" onBack={() => navigation.goBack()}>
        <StateView
          title="تعذر فتح المصحف بأمان"
          description="قد تكون الحزمة أو الخط المطابق غير متاحين، أو موضع القراءة غير متوافق مع الإصدار. لم نستبدل النص أو الخط."
          action={{
            label: 'إعادة المحاولة',
            onPress: () => setAttempt(n => n + 1),
          }}
        />
        <Button
          label="اختيار المصحف"
          onPress={() => navigation.navigate('QuranEditions')}
        />
      </Page>
    );
  if (!chapter || !font)
    return (
      <Page
        title={chapters[surah - 1].name}
        onBack={() => navigation.goBack()}
        contentStyle={{flexGrow: 1, justifyContent: 'center'}}>
        {loading}
      </Page>
    );
  return (
    <View style={{flex: 1, backgroundColor: p.background}}>
      <View
        style={{flex: 1}}
        accessibilityElementsHidden={indexVisible}
        importantForAccessibility={
          indexVisible ? 'no-hide-descendants' : 'auto'
        }>
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            paddingHorizontal: 12,
            minHeight: 64,
            gap: 8,
          }}>
          <IconButton
            name="chevron-right"
            label="رجوع"
            onPress={() => navigation.goBack()}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="فتح فهرس القرآن والانتقال إلى موضع"
              onPress={() => setIndexVisible(true)}
              style={{flex: 1, minHeight: 52, justifyContent: 'center'}}>
              <AppText role="sectionTitle" style={{textAlign: 'center'}}>
                {chapters[surah - 1].name} ⌄
              </AppText>
              <AppText
                role="caption"
                style={{textAlign: 'center', color: p.textSecondary}}>
                {sectionWord(
                  sectionAt(edition.id, 'juz', {surah, verse: visibleVerse})
                    .kind,
                )}{' '}
                {number(
                  sectionAt(edition.id, 'juz', {surah, verse: visibleVerse})
                    .number,
                )}{' '}
                · الحزب{' '}
                {number(
                  sectionAt(edition.id, 'hizb', {surah, verse: visibleVerse})
                    .number,
                )}
              </AppText>
            </Pressable>
          ) : (
            <AppText
              role="screenTitle"
              accessibilityRole="header"
              style={{flex: 1, textAlign: 'center'}}>
              {chapters[surah - 1].name}
            </AppText>
          )}
          <IconButton
            name="settings"
            label="إعدادات القراءة"
            disabled={preparing}
            onPress={() =>
              navigation.navigate('QuranPreferences', {editionId: edition.id})
            }
          />
        </View>
        <View style={{flex: 1}}>
          <FlatList
            ref={list}
            key={layout.current}
            data={passages}
            style={{opacity: preparing ? 0 : 1}}
            pointerEvents={preparing ? 'none' : 'auto'}
            accessibilityElementsHidden={preparing}
            importantForAccessibility={
              preparing ? 'no-hide-descendants' : 'auto'
            }
            onScrollToIndexFailed={({index, averageItemLength}) => {
              restoreFailed.current = true;
              // Before any row is measured, a zero estimate would reset the
              // initial window to verse 1. Wait for layout instead.
              if (averageItemLength > 0) {
                list.current?.scrollToOffset({
                  offset:
                    (headerHeight.current ?? 0) + index * averageItemLength,
                  animated: false,
                });
              }
              if (restoreTimer.current) clearTimeout(restoreTimer.current);
              restoreTimer.current = setTimeout(restorePosition, 100);
            }}
            onContentSizeChange={(_width, height) => {
              if (height > 0) {
                contentReady.current = true;
                restorePosition();
              }
            }}
            keyExtractor={v => String(v[0].number)}
            // Variable-height cards need the prefix measured for an exact locator.
            // Ordinary chapter openings still render only the first ten verses.
            initialNumToRender={Math.max(
              10,
              (pendingRestore.current ?? firstVerse) - firstVerse + 1,
            )}
            maxToRenderPerBatch={8}
            windowSize={7}
            contentContainerStyle={{
              padding: 16,
              paddingTop: 4,
              maxWidth: 560,
              width: '100%',
              alignSelf: 'center',
              gap: prefs.view === 'verses' ? 12 : 0,
            }}
            scrollEventThrottle={80}
            onScroll={e => {
              if (!continuous.current || pendingRestore.current !== null)
                return;
              const y = Math.max(
                0,
                e.nativeEvent.contentOffset.y -
                  (headerHeight.current ?? 0) -
                  12,
              );
              const line = textLines.current.find(
                line => line.y + line.height > y,
              );
              if (line) {
                position.current = line.verse;
                setVisibleVerse(line.verse);
              }
            }}
            onMomentumScrollEnd={() => {
              act(
                runtime.remember({
                  ...locator(position.current),
                  ...(section ? {section} : {}),
                }),
              );
            }}
            onScrollEndDrag={() => {
              act(
                runtime.remember({
                  ...locator(position.current),
                  ...(section ? {section} : {}),
                }),
              );
            }}
            onViewableItemsChanged={viewable}
            viewabilityConfig={{viewAreaCoveragePercentThreshold: 20}}
            ListHeaderComponent={
              <View
                onLayout={e => {
                  headerHeight.current = e.nativeEvent.layout.height;
                  restorePosition();
                }}
                style={{gap: 8, marginBottom: 8}}>
                <View
                  style={{
                    ...rtlRow,
                    justifyContent: 'center',
                    backgroundColor: p.surfaceMuted,
                    borderRadius: 10,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderWidth: 0.5,
                    borderColor: p.accent,
                  }}>
                  <AppIcon name="medallion" size={30} color={p.accent} />
                  <AppText
                    role="sectionTitle"
                    style={{flex: 1, textAlign: 'center'}}>
                    {chapters[surah - 1].name}
                  </AppText>
                  <AppIcon name="medallion" size={30} color={p.accent} />
                </View>
                {translationError && (
                  <StateView
                    title="الترجمة المختارة غير متاحة"
                    description="النص العربي مستقل. اختر ترجمة متوافقة أو أعد تنزيلها."
                    action={{
                      label: 'إدارة الترجمة',
                      onPress: () =>
                        navigation.navigate('QuranTranslations', {
                          editionId: edition.id,
                        }),
                    }}
                  />
                )}
                {firstVerse === 1 && chapter.opening && (
                  <Text
                    onPress={
                      prefs.view === 'continuous' &&
                      translated?.some(t => t.number === 0)
                        ? () => setTranslationVerse(0)
                        : undefined
                    }
                    accessibilityLabel={
                      prefs.view === 'continuous' &&
                      translated?.some(t => t.number === 0)
                        ? 'البسملة، ترجمة المعاني'
                        : undefined
                    }
                    selectable={prefs.view !== 'continuous'}
                    style={{
                      fontFamily: font,
                      fontSize: prefs.size,
                      lineHeight: prefs.size * prefs.lineHeight,
                      fontWeight: 'normal',
                      includeFontPadding: true,
                      textAlign: 'center',
                      writingDirection: 'rtl',
                      color: p.textPrimary,
                    }}>
                    {chapter.opening}
                  </Text>
                )}
                {firstVerse === 1 &&
                  prefs.view !== 'continuous' &&
                  translated?.find(v => v.number === 0) && (
                    <AppText
                      role="translation"
                      style={{
                        writingDirection: 'ltr',
                        textAlign: 'left',
                        fontFamily: 'sans-serif',
                      }}>
                      {translated.find(v => v.number === 0)!.text}
                    </AppText>
                  )}
              </View>
            }
            renderItem={({item: passage}) => (
              <View style={{gap: 12}}>
                {prefs.view === 'continuous' ? (
                  <Text
                    onTextLayout={e => {
                      const source = passage.map(verseText).join('');
                      const lengths = passage.map(v => verseText(v).length);
                      let offset = 0;
                      textLines.current = e.nativeEvent.lines.map(line => {
                        const found = source.indexOf(line.text.trim(), offset);
                        const start = found < 0 ? offset : found;
                        offset = start + line.text.trim().length;
                        return {
                          y: line.y,
                          height: line.height,
                          verse: passage[verseAtOffset(lengths, start)].number,
                        };
                      });
                      restorePosition();
                    }}
                    style={{
                      fontFamily: font,
                      fontSize: prefs.size,
                      lineHeight: prefs.size * prefs.lineHeight,
                      fontWeight: 'normal',
                      includeFontPadding: true,
                      textAlign: 'justify',
                      direction: 'rtl',
                      writingDirection: 'rtl',
                      color: p.textPrimary,
                    }}>
                    {passage.map(verse => (
                      <Text
                        key={verse.number}
                        accessibilityRole="button"
                        accessibilityLabel={`الآية ${number(verse.number)}، خيارات الآية`}
                        onPress={e => {
                          setTapPoint({
                            x: e.nativeEvent.pageX,
                            y: e.nativeEvent.pageY,
                          });
                          position.current = verse.number;
                          setVisibleVerse(verse.number);
                          setSelectedVerse(verse);
                        }}>
                        {verseText(verse)}
                      </Text>
                    ))}
                  </Text>
                ) : (
                  <View>
                    <Card
                      style={{
                        backgroundColor: p.surfaceMuted,
                        borderColor: p.borderControl,
                        borderRadius: 20,
                      }}>
                      {!sourceVerseMarkers && (
                        <View style={{flexDirection: 'row-reverse'}}>
                          <NumberBadge value={passage[0].number} />
                        </View>
                      )}
                      <Text
                        style={{
                          fontFamily: font,
                          fontSize: prefs.size,
                          lineHeight: prefs.size * prefs.lineHeight,
                          fontWeight: 'normal',
                          includeFontPadding: true,
                          textAlign: 'center',
                          writingDirection: 'rtl',
                          color: p.textPrimary,
                        }}>
                        {passage[0].text}
                      </Text>
                      {translationFor(passage[0])}
                      {actions(passage[0])}
                    </Card>
                  </View>
                )}
              </View>
            )}
            ListFooterComponent={
              <View style={{gap: 12, paddingTop: 20}}>
                {section && bounds ? (
                  <>
                    <AppText role="caption" style={{textAlign: 'center'}}>
                      {section.kind === 'surah'
                        ? 'نهاية السورة'
                        : surah < bounds.lastSurah
                          ? `متابعة ${sectionWord(section.kind)} ${number(section.number)}`
                          : `نهاية ${sectionWord(section.kind)} ${number(section.number)}`}
                    </AppText>
                    {surah < bounds.lastSurah ? (
                      <Button
                        label={`متابعة ${sectionWord(section.kind)} · ${chapters[surah].name}`}
                        onPress={() =>
                          navigation.replace(
                            'QuranReader',
                            sectionTarget(
                              edition.id,
                              text!.pack.version,
                              section,
                              {surah: surah + 1, verse: 1},
                            ),
                          )
                        }
                      />
                    ) : (
                      section.number <
                        sectionStarts(edition.id, section.kind).length && (
                        <Button
                          label={sectionNavigationLabel(section.kind, true)}
                          onPress={() =>
                            navigation.replace(
                              'QuranReader',
                              sectionTarget(edition.id, text!.pack.version, {
                                ...section,
                                number: section.number + 1,
                              }),
                            )
                          }
                        />
                      )
                    )}
                    {surah > bounds.firstSurah ? (
                      <Button
                        secondary
                        label={`السابق ضمن ${sectionWord(section.kind)} · ${chapters[surah - 2].name}`}
                        onPress={() => {
                          const previous = sectionChapter(
                            edition.id,
                            section,
                            surah - 1,
                          );
                          navigation.replace(
                            'QuranReader',
                            sectionTarget(
                              edition.id,
                              text!.pack.version,
                              section,
                              {surah: surah - 1, verse: previous.first},
                            ),
                          );
                        }}
                      />
                    ) : (
                      section.number > 1 && (
                        <Button
                          secondary
                          label={sectionNavigationLabel(section.kind, false)}
                          onPress={() =>
                            navigation.replace(
                              'QuranReader',
                              sectionTarget(edition.id, text!.pack.version, {
                                ...section,
                                number: section.number - 1,
                              }),
                            )
                          }
                        />
                      )
                    )}
                  </>
                ) : (
                  surah < 114 && (
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
                  )
                )}
              </View>
            }
          />
          {preparing && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: p.background,
                justifyContent: 'center',
              }}>
              {loading}
            </View>
          )}
        </View>
        {Platform.OS === 'ios' ? (
          verseOptions
        ) : (
          <Modal
            transparent
            visible={selectedVerse !== null && focused}
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setSelectedVerse(null)}>
            {verseOptions}
          </Modal>
        )}
        {audioVerse && focused && (
          <ReaderVerseAudio
            key={audioVerse.request}
            editionId={edition.id}
            surah={surah}
            verse={audioVerse.verse}
            onClose={() => setAudioVerse(null)}
          />
        )}
        <Sheet
          centered
          visible={translationVerse !== null && focused}
          title={
            translationVerse === 0
              ? 'ترجمة معاني البسملة'
              : `ترجمة معاني الآية ${number(translationVerse ?? 1)}`
          }
          onClose={() => setTranslationVerse(null)}>
          {translationVerse !== null &&
            translationContent(
              translationForVerse(translated ?? [], translationVerse),
            )}
        </Sheet>
        <View
          style={{
            ...rtlRow,
            borderTopWidth: 1,
            borderColor: p.borderSubtle,
            backgroundColor: p.surface,
            justifyContent: 'space-around',
            paddingHorizontal: 12,
          }}>
          <IconButton
            name="volume"
            label="الاستماع لهذه الرواية"
            onPress={() =>
              navigation.navigate('QuranPlayer', {editionId: edition.id, surah})
            }
          />
          <IconButton
            name="translate"
            label="الترجمات"
            onPress={() =>
              navigation.navigate('QuranTranslations', {editionId: edition.id})
            }
          />
          {Platform.OS === 'ios' ? (
            <IconButton
              name="book"
              label="فهرس القرآن"
              onPress={() => setIndexVisible(true)}
            />
          ) : (
            <IconButton
              name="text-size"
              label="إعدادات القراءة"
              onPress={() =>
                navigation.navigate('QuranPreferences', {editionId: edition.id})
              }
            />
          )}
        </View>
      </View>
      {indexVisible && focused && (
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={insets.top}
          style={{
            ...StyleSheet.absoluteFillObject,
            zIndex: 20,
            backgroundColor: p.scrim,
          }}>
          <View style={{flex: 1, justifyContent: 'flex-end'}}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="إغلاق فهرس القرآن"
              style={StyleSheet.absoluteFillObject}
              onPress={closeIndex}
            />
            <View
              accessibilityViewIsModal
              style={{
                maxHeight: '90%',
                backgroundColor: p.surface,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 16,
                paddingBottom: Math.max(16, insets.bottom),
              }}>
              <View style={{...rtlRow, alignItems: 'center'}}>
                <AppText role="sectionTitle" style={{flex: 1}}>
                  فهرس القرآن
                </AppText>
                <IconButton name="close" label="إغلاق" onPress={closeIndex} />
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                <QuranIndex
                  editionId={edition.id}
                  packVersion={text!.pack.version}
                  initialKind={section?.kind}
                  allowAyahJump
                  onSelect={target => {
                    closeIndex();
                    navigation.replace('QuranReader', target);
                  }}
                />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
