import {Text} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {
  AppText,
  Button,
  Card,
  Input,
  Page,
  Row,
  StateView,
  usePalette,
  Sheet,
} from '../../design/ui';
import {number, bytes, ltr} from '../../design/format';
import {
  chapters,
  editionById,
  searchChapters,
  type EditionId,
  type Locator,
} from './domain';
import {useLibrary, useOnFocus, useQuran} from './context';
import {
  readerDefaults,
  type ReaderPreferences,
  supportsKeepAwake,
} from './runtime';
import {act} from './LibraryScreens';
import {type Bookmark} from '../../repositories/models';
import {removeBookmark} from '../devotional/bookmarks';
import {noteData} from '../../data';
export function QuranPreferencesScreen({route, navigation}: any) {
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
  const change = (patch: Partial<ReaderPreferences>) =>
    act(
      runtime
        .savePreferences(id, {...prefs, ...patch})
        .then(() => setPrefs({...prefs, ...patch})),
    );
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
          <AppText role="sectionTitle">حجم نص القرآن</AppText>
          {[22, 26, 30, 34].map(size => (
            <Button
              key={size}
              label={number(size)}
              selected={prefs.size === size}
              secondary={prefs.size !== size}
              onPress={() => change({size})}
            />
          ))}
          <AppText role="sectionTitle">تباعد الأسطر</AppText>
          {[1.7, 1.9, 2.2].map(lineHeight => (
            <Button
              key={lineHeight}
              label={ltr(String(lineHeight))}
              selected={prefs.lineHeight === lineHeight}
              secondary={prefs.lineHeight !== lineHeight}
              onPress={() => change({lineHeight})}
            />
          ))}
          <Button
            label="آيات منفصلة"
            selected={prefs.view === 'verses'}
            secondary={prefs.view !== 'verses'}
            onPress={() => change({view: 'verses'})}
          />
          <Button
            label="قراءة متصلة"
            selected={prefs.view === 'continuous'}
            secondary={prefs.view !== 'continuous'}
            onPress={() => change({view: 'continuous'})}
          />
          <Button
            label={
              prefs.keepAwake
                ? 'إبقاء الشاشة مضاءة: مفعل'
                : 'إبقاء الشاشة مضاءة: متوقف'
            }
            selected={prefs.keepAwake}
            disabled={!supportsKeepAwake()}
            onPress={() => change({keepAwake: !prefs.keepAwake})}
          />
          <AppText role="caption">
            يعمل إبقاء الشاشة مضاءة فقط أثناء ظهور القارئ.{' '}
            {supportsKeepAwake() ? '' : 'غير متاح على هذا النظام بعد.'}
          </AppText>
          <Button
            secondary
            label="اختيار الترجمة"
            onPress={() =>
              navigation.navigate('QuranTranslations', {editionId: id})
            }
          />
        </>
      )}
    </Page>
  );
}
export function TranslationScreen({route, navigation}: any) {
  const {runtime, ready, error, retry} = useLibrary(),
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
  const choices = runtime.catalog.translations.filter(t => t.editionId === id);
  return (
    <Page title="ترجمات المعاني" onBack={() => navigation.goBack()}>
      <AppText>الترجمة شرح للمعاني، وليست بديلا للنص العربي.</AppText>
      <Button
        label="دون ترجمة"
        selected={!selected}
        secondary={!!selected}
        onPress={() => select(null)}
      />
      {error && (
        <StateView
          title="تعذر قراءة التنزيلات"
          action={{label: 'إعادة المحاولة', onPress: retry}}
        />
      )}
      {e.riwaya === 'warsh' ? (
        <StateView
          title="الترجمة غير متاحة لورش"
          description="لن نربط ترجمة حفص بأرقام آيات ورش دون مراجعة المطابقة. يمكنك اختيار حفص لقراءة ترجماته عند توفرها."
        />
      ) : !choices.length ? (
        <StateView
          title="الفرنسية والإنجليزية غير متاحتين للتنزيل بعد"
          description="تظهر الترجمات هنا بعد مراجعة ملفاتها ومطابقتها ومصادرها."
        />
      ) : (
        choices.map(t => (
          <Card key={t.id}>
            <AppText role="sectionTitle">
              {t.language === 'fr' ? 'Français' : 'English'} · {t.title}
            </AppText>
            <AppText>
              {runtime.installed(t.pack)
                ? 'محفوظة دون اتصال'
                : ltr(bytes(t.pack.assets.reduce((n, a) => n + a.bytes, 0)))}
            </AppText>
            <Button
              label={`${runtime.installed(t.pack) ? 'اختيار' : 'تنزيل'} ${t.language === 'fr' ? 'الفرنسية' : 'الإنجليزية'}`}
              disabled={!ready || error}
              selected={selected === t.id}
              secondary={selected !== t.id}
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
            <Button
              secondary
              label="معلومات الترجمة"
              onPress={() => setNotice(t.notice)}
            />
          </Card>
        ))
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
      <Input
        label="اسم السورة أو نص الآية"
        value={query}
        onChangeText={setQuery}
      />
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
      {searchChapters(query).map(c => (
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
    <Page title="علامات القراءة" onBack={() => navigation.goBack()}>
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
              <Card key={b.bookmarkId}>
                <AppText>{editionsTitle(b.editionId)}</AppText>
                <AppText>
                  {ltr(
                    `${number(b.surah)}:${number(b.verse)} · ${b.packVersion}`,
                  )}
                </AppText>
                <Button
                  label="فتح موضع القراءة"
                  onPress={() => navigation.navigate('QuranReader', b)}
                />
                <Button
                  secondary
                  label="إزالة العلامة"
                  onPress={() =>
                    act(removeBookmark(b.bookmarkId).then(refresh))
                  }
                />
              </Card>
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
      <Card>
        <AppText role="sectionTitle">{e.title}</AppText>
        <AppText>{e.publisher}</AppText>
        <AppText
          selectable
          style={{writingDirection: 'ltr', textAlign: 'left'}}>
          {e.id}
        </AppText>
        <AppText
          selectable
          style={{writingDirection: 'ltr', textAlign: 'left'}}>
          {e.numbering}
        </AppText>
        <AppText>
          {t ? `الإصدار ${ltr(t.pack.version)}` : 'الحزمة غير منشورة بعد'}
        </AppText>
        <AppText>
          لا تعني إتاحة المصدر اعتماد التطبيق أو مراجعته من الناشر.
        </AppText>
      </Card>
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
      <AppText role="sectionTitle">إشعارات المصدر</AppText>
      {t && (
        <AppText
          selectable
          style={{writingDirection: 'auto', textAlign: 'auto'}}>
          {t.notice}
        </AppText>
      )}
    </Page>
  );
}
