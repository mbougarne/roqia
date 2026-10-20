import React, {useEffect, useRef, useState} from 'react';
import {Text} from 'react-native';

import {useLibrary, useOnFocus, useQuran} from './context';
import {
  chapters,
  editionById,
  searchChapters,
  type EditionId,
  type Locator,
} from './domain';
import {act} from './LibraryScreens';
import {
  readerDefaults,
  type ReaderPreferences,
  supportsKeepAwake,
} from './runtime';
import {noteData} from '../../data';
import {
  Banner,
  Group,
  Ornament,
  RadioRow,
  Range,
  SearchField,
  Segments,
  SettingRow,
  Toggle,
} from '../../design/components';
import {ltr} from '../../design/format';
import {
  IconButton,
  AppText,
  Button,
  Card,
  Page,
  Row,
  StateView,
  usePalette,
  Sheet,
} from '../../design/ui';
import {useFormat} from '../../design/useFormat';
import {type Bookmark} from '../../repositories/models';
import {removeBookmark} from '../devotional/bookmarks';

export function QuranPreferencesScreen({route, navigation}: any) {
  const {digits} = useFormat();
  const p = usePalette();
  const [preview, setPreview] = useState<{text: string; font: string} | null>(
    null,
  );
  const runtime = useQuran(),
    id: EditionId = route.params.editionId,
    [prefs, setPrefs] = useState<ReaderPreferences>(readerDefaults),
    [loaded, setLoaded] = useState(false),
    [failed, setFailed] = useState(false);
  const load = () => {
    setFailed(false);
    void runtime
      .preferences(id)
      .then(p => {
        setPrefs(p);
        setLoaded(true);
      })
      .catch(() => setFailed(true));
  };
  useEffect(load, [runtime, id]);
  // Translation selection is saved on its own screen; retain draft typography
  // while refreshing that independently persisted field on return.
  useOnFocus(() => {
    void runtime
      .preferences(id)
      .then(saved =>
        setPrefs(draft => ({...draft, translationId: saved.translationId})),
      )
      .catch(() => setFailed(true));
  }, [runtime, id]);
  useEffect(() => {
    let active = true;
    setPreview(null);
    const pack = runtime.text(id);
    if (pack)
      void runtime
        .chapter(pack, 1)
        .then(async chapter => ({
          text: chapter.verses[0].text,
          font: await runtime.font(pack, chapter),
        }))
        .then(value => {
          if (active) setPreview(value);
        })
        .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [runtime, id]);
  const change = (patch: Partial<ReaderPreferences>) =>
    setPrefs(p => ({...p, ...patch}));
  return (
    <Page title="إعدادات القراءة" onBack={() => navigation.goBack()}>
      <AppText>{editionById(id).title} · إعدادات مستقلة عن حجم الواجهة</AppText>
      {failed ? (
        <StateView
          title="تعذر قراءة الإعدادات"
          action={{label: 'إعادة المحاولة', onPress: load}}
        />
      ) : !loaded ? (
        <StateView busy title="جارٍ الاسترجاع" />
      ) : (
        <>
          {preview && (
            <Card>
              <AppText role="caption">معاينة النص من المصحف المختار</AppText>
              <Text
                selectable
                style={{
                  fontFamily: preview.font,
                  fontSize: prefs.size,
                  lineHeight: prefs.size * prefs.lineHeight,
                  color: p.textPrimary,
                  textAlign: 'center',
                  writingDirection: 'rtl',
                }}>
                {preview.text}
              </Text>
            </Card>
          )}
          <Card>
            <Range
              label="حجم نص القرآن"
              min={22}
              max={34}
              step={4}
              value={prefs.size}
              onChange={size => change({size})}
            />
            <Range
              label="تباعد الأسطر"
              min={1.7}
              max={2.2}
              step={0.1}
              stops={[1.7, 1.9, 2.2]}
              value={prefs.lineHeight}
              onChange={lineHeight => change({lineHeight})}
            />
          </Card>
          <Card>
            <Ornament title="طريقة العرض" />
            <Segments
              value={prefs.view}
              options={[
                {value: 'verses', label: 'آيات'},
                {value: 'continuous', label: 'قراءة متصلة'},
              ]}
              onChange={view => change({view})}
            />
          </Card>
          <Group>
            <SettingRow
              title="ترجمة المعاني"
              icon="translate"
              onPress={() =>
                navigation.navigate('QuranTranslations', {editionId: id})
              }
            />
            <SettingRow
              title="شكل الأرقام"
              detail={ltr(digits('0123456789'))}
              icon="text-size"
              onPress={() => navigation.navigate('Settings')}
            />
            <SettingRow title="إبقاء الشاشة مضاءة" icon="sun">
              <Toggle
                label="إبقاء الشاشة مضاءة"
                value={prefs.keepAwake}
                disabled={!supportsKeepAwake()}
                onChange={keepAwake => change({keepAwake})}
              />
            </SettingRow>
          </Group>
          <Button
            label="حفظ"
            onPress={() =>
              act(
                runtime
                  .savePreferences(id, prefs)
                  .then(() => navigation.goBack()),
              )
            }
          />
          <Button
            secondary
            label="استعادة الافتراضي"
            onPress={() => setPrefs({...readerDefaults})}
          />
        </>
      )}
    </Page>
  );
}

export function TranslationScreen({route, navigation}: any) {
  const {bytes} = useFormat();
  const {runtime, ready: _ready, error, retry} = useLibrary(),
    id: EditionId = route.params.editionId,
    e = editionById(id),
    [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useOnFocus(() => {
    act(runtime.preferences(id).then(p => setSelected(p.translationId)));
  }, [runtime, id]);
  const select = (translationId: string | null) =>
    act(
      runtime
        .preferences(id)
        .then(p => runtime.savePreferences(id, {...p, translationId}))
        .then(() => setSelected(translationId)),
    );
  const choices = runtime.catalog.translations;
  return (
    <Page title="ترجمة المعاني" onBack={() => navigation.goBack()}>
      <Group>
        <SettingRow title={e.title} icon="book" />
      </Group>
      <AppText role="caption">اختر لغة لعرض المعاني بجانب النص</AppText>
      <RadioRow
        title="دون ترجمة"
        icon="translate"
        selected={!selected}
        onPress={() => select(null)}
      />
      {error && (
        <StateView
          title="تعذر قراءة التنزيلات"
          action={{label: 'إعادة المحاولة', onPress: retry}}
        />
      )}
      {!choices.length ? (
        <StateView
          title="الفرنسية والإنجليزية غير متاحتين للتنزيل بعد"
          description="تظهر الترجمات هنا بعد مراجعة ملفاتها ومطابقتها ومصادرها."
        />
      ) : (
        choices.map(t => (
          <Group key={t.id}>
            <RadioRow
              title={t.language === 'fr' ? 'Français' : 'English'}
              detail={
                t.title +
                ' · ' +
                (runtime.installed(t.pack)
                  ? 'محفوظة دون اتصال'
                  : bytes(t.pack.assets.reduce((n, a) => n + a.bytes, 0)))
              }
              icon="translate"
              selected={selected === t.id}
              onPress={() =>
                runtime.installed(t.pack)
                  ? select(t.id)
                  : act(
                      runtime
                        .download(t.pack)
                        .then(() => navigation.navigate('Downloads')),
                    )
              }
            />
            <SettingRow
              title="معلومات الترجمة"
              icon="info"
              onPress={() => setNotice(t.notice)}
            />
          </Group>
        ))
      )}
      <Banner
        text={
          e.riwaya === 'warsh'
            ? 'ترجمة للمعاني مصدرها مصحف حفص. تُعرض المقاطع كاملة عند اختلاف حدود الآيات، وقد لا تعكس الترجمة فروق القراءات.'
            : 'الترجمة بيان للمعاني، والنص القرآني يبقى بالعربية.'
        }
      />
      {choices.length > 0 && (
        <Button
          secondary
          label="إدارة التنزيلات والتخزين"
          onPress={() => navigation.navigate('Storage')}
        />
      )}
      <Sheet
        title="معلومات الترجمة"
        visible={notice !== null}
        onClose={() => setNotice(null)}>
        <AppText
          selectable
          style={{writingDirection: 'auto', textAlign: 'auto'}}>
          {notice}
        </AppText>
      </Sheet>
    </Page>
  );
}

export function QuranSearchScreen({navigation}: any) {
  const {number} = useFormat();
  const palette = usePalette();
  const {runtime, ready} = useLibrary(),
    [id, setId] = useState<EditionId>('warsh-kfgqpc-v2.1-update6'),
    [query, setQuery] = useState(''),
    [recent, setRecent] = useState<string[]>([]),
    [results, setResults] = useState<
      {locator: Locator; text: string; fontFamily: string}[]
    >([]),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false),
    generation = useRef(0);
  useOnFocus(() => {
    act(runtime.preferred().then(e => setId(e.id)));
    act(runtime.recent().then(setRecent));
    return () => {
      generation.current++;
    };
  }, [runtime]);
  useEffect(() => {
    generation.current++;
    setResults([]);
    setBusy(false);
  }, [query, id]);
  const text = runtime.text(id),
    canSearch = !!text && !!runtime.installed(text.pack);
  const search = () => {
    const gen = ++generation.current;
    setBusy(true);
    setFailed(false);
    setResults([]);
    act(
      runtime
        .saveQuery(query)
        .then(() => runtime.recent())
        .then(setRecent),
    );
    void runtime
      .search(text!, query, () => generation.current !== gen)
      .then(r => {
        if (gen === generation.current) setResults(r);
      })
      .catch(() => {
        if (gen === generation.current) setFailed(true);
      })
      .finally(() => {
        if (gen === generation.current) setBusy(false);
      });
  };
  return (
    <Page title="البحث في القرآن" onBack={() => navigation.goBack()}>
      <SearchField
        label="اسم السورة أو نص الآية"
        value={query}
        onChange={setQuery}
      />
      <Group>
        <SettingRow
          title={editionById(id).title}
          icon="book"
          onPress={() => navigation.navigate('QuranEditions')}
        />
      </Group>
      {!query &&
        recent.map(q => (
          <Button key={q} secondary label={q} onPress={() => setQuery(q)} />
        ))}
      {!!recent.length && (
        <Button
          secondary
          label="مسح سجل البحث"
          onPress={() => act(runtime.clearQueries().then(() => setRecent([])))}
        />
      )}
      <Button
        label="البحث في الآيات"
        disabled={!ready || !canSearch || query.trim().length < 2 || busy}
        onPress={search}
      />
      {!canSearch && (
        <AppText>
          البحث في أسماء السور متاح دون تنزيل. يتطلب البحث في الآيات مصحفا
          مثبتا.
        </AppText>
      )}
      {busy && <StateView title="جارٍ البحث" busy />}
      {failed && (
        <StateView
          title="تعذر البحث في النص المحفوظ"
          action={{label: 'إعادة المحاولة', onPress: search}}
        />
      )}
      {!!query && <AppText role="sectionTitle">السور</AppText>}
      {(query ? searchChapters(query) : []).map(c => (
        <Row
          key={c.number}
          title={`${number(c.number)} · ${c.name}`}
          onPress={() =>
            navigation.navigate('QuranReader', {
              editionId: id,
              surah: c.number,
              verse: 1,
            })
          }
        />
      ))}
      {!!query && !searchChapters(query).length && !results.length && !busy && (
        <StateView title="لا توجد نتائج معروضة" />
      )}
      {results.map(r => (
        <Card key={`${r.locator.surah}:${r.locator.verse}`}>
          <AppText>
            {ltr(`${number(r.locator.surah)}:${number(r.locator.verse)}`)}
          </AppText>
          <Text
            numberOfLines={4}
            style={{
              fontFamily: r.fontFamily,
              fontSize: 26,
              lineHeight: 49.4,
              includeFontPadding: true,
              textAlign: 'right',
              writingDirection: 'rtl',
              color: palette.textPrimary,
            }}>
            {r.text}
          </Text>
          <Button
            label="فتح الآية"
            onPress={() => navigation.navigate('QuranReader', r.locator)}
          />
        </Card>
      ))}
      {!!results.length && (
        <AppText role="caption">
          حتى 50 نتيجة. افتح الآية لرؤية نصها بالخط المطابق؛ لا تضاف علامات إلى
          النص الأصلي.
        </AppText>
      )}
    </Page>
  );
}

export function QuranBookmarksScreen({navigation}: any) {
  const {number} = useFormat();
  const runtime = useQuran(),
    [rows, setRows] = useState<Bookmark[]>([]),
    [failed, setFailed] = useState(false);
  const refresh = () => {
    setFailed(false);
    void runtime
      .bookmarks()
      .then(setRows)
      .catch(() => setFailed(true));
  };
  useOnFocus(refresh, [runtime]);
  return (
    <Page title="العلامات المحفوظة" onBack={() => navigation.goBack()}>
      <Segments
        value="quran"
        options={[
          {value: 'quran', label: 'القرآن'},
          {value: 'devotional', label: 'الأذكار والأدعية'},
        ]}
        onChange={v => {
          if (v === 'devotional') navigation.navigate('Bookmarks');
        }}
      />
      {failed ? (
        <StateView
          title="تعذر قراءة العلامات"
          action={{label: 'إعادة المحاولة', onPress: refresh}}
        />
      ) : !rows.length ? (
        <StateView
          title="لا توجد علامات قراءة"
          description="احفظ علامة من القارئ للرجوع إليها. تبقى العلامة حتى إذا حذفت المصحف."
        />
      ) : (
        rows.map(
          b =>
            b.kind === 'quran-verse' && (
              <Group key={b.bookmarkId}>
                <SettingRow
                  title={chapters[b.surah - 1].name}
                  detail={
                    editionsTitle(b.editionId) + ' · الآية ' + number(b.verse)
                  }
                  icon="bookmark"
                  onPress={() => navigation.navigate('QuranReader', b)}
                />
                <IconButton
                  name="trash"
                  label="إزالة العلامة"
                  onPress={() =>
                    act(removeBookmark(b.bookmarkId).then(refresh))
                  }
                />
              </Group>
            ),
        )
      )}
    </Page>
  );
}

function editionsTitle(id: string) {
  try {
    return editionById(id).title;
  } catch {
    return 'مصحف غير متاح';
  }
}

export function QuranSourceScreen({route, navigation}: any) {
  const runtime = useQuran(),
    e = editionById(route.params.editionId),
    t = runtime.text(e.id, route.params.packVersion);
  const report = `Edition: ${e.id}\nVersion: ${t?.pack.version ?? 'unavailable'}\nNumbering: ${e.numbering}\nSurah: ${route.params.surah ?? ''}\nVerse: ${route.params.verse ?? ''}\n\n`;
  const email = noteData.email;
  return (
    <Page title="معلومات المصحف" onBack={() => navigation.goBack()}>
      <Group>
        <SettingRow title={e.title} detail={e.publisher} icon="book" />
      </Group>
      <Banner text="لا تعني إتاحة المصدر اعتماد التطبيق أو مراجعته من الناشر." />
      <Button
        secondary
        label="موقع المصدر"
        onPress={() =>
          navigation.navigate('ExternalLink', {
            title: 'موقع المصدر',
            url: e.url,
          })
        }
      />
      <Button
        label="الإبلاغ عن ملاحظة"
        onPress={() =>
          navigation.navigate('ExternalLink', {
            title: 'ملاحظة في المصحف',
            url: `mailto:${email}?subject=${encodeURIComponent('Roqia Quran content report')}&body=${encodeURIComponent(report)}`,
          })
        }
      />
    </Page>
  );
}
