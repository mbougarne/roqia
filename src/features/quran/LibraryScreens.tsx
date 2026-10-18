import React, {useState} from 'react';
import {Alert} from 'react-native';
import {
  AppText,
  Button,
  Card,
  Input,
  Page,
  Row,
  StateView,
} from '../../design/ui';
import {number, bytes, ltr} from '../../design/format';
import {
  editions,
  editionById,
  searchChapters,
  type EditionId,
  type Locator,
} from './domain';
import {useLibrary, useOnFocus, useQuran} from './context';
export const act = (promise: Promise<unknown>) => {
  void promise.catch(() =>
    Alert.alert(
      'تعذر إتمام العملية',
      'حاول مرة أخرى. تقدمك ومحتواك المحفوظ لا يتغيران.',
    ),
  );
};
export function QuranLibraryScreen({navigation}: any) {
  const {runtime, ready, error, retry} = useLibrary();
  const [id, setId] = useState<EditionId>(editions[0].id),
    [resume, setResume] = useState<Locator | null>(null),
    [query, setQuery] = useState('');
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
    <Page title="القرآن الكريم">
      <Row
        title={edition.title}
        detail="تغيير المصحف"
        icon="book"
        onPress={() => navigation.navigate('QuranEditions')}
      />
      {error ? (
        <StateView
          title="تعذر فتح المكتبة"
          action={{label: 'إعادة المحاولة', onPress: retry}}
        />
      ) : !ready ? (
        <StateView title="جارٍ فتح المكتبة" busy />
      ) : !installed ? (
        <Card>
          <AppText role="sectionTitle">اختر مصحفك للقراءة دون اتصال</AppText>
          <AppText>
            يمكنك البحث في أسماء السور الآن. اختيار الرواية لا يبدأ التنزيل.
          </AppText>
          <Button
            label="اختيار المصحف"
            onPress={() => navigation.navigate('QuranEditions')}
          />
        </Card>
      ) : (
        <AppText>المصحف محفوظ على جهازك</AppText>
      )}
      {resume && (
        <Button
          label={`متابعة القراءة · ${number(resume.surah)}:${number(resume.verse)}`}
          onPress={() => navigation.navigate('QuranReader', resume)}
        />
      )}
      <Button
        secondary
        label="البحث في القرآن"
        icon="search"
        onPress={() => navigation.navigate('QuranSearch')}
      />
      <Button
        secondary
        label="علامات القراءة"
        icon="bookmark"
        onPress={() => navigation.navigate('QuranBookmarks')}
      />
      <Button
        secondary
        label="القراء والتنزيلات الصوتية"
        icon="download"
        onPress={() => navigation.navigate('QuranAudio')}
      />
      <Input label="البحث عن سورة" value={query} onChangeText={setQuery} />
      {searchChapters(query).map(c => (
        <Row
          key={c.number}
          title={`${number(c.number)} · ${c.name}`}
          detail={`${number(edition.riwaya === 'warsh' ? c.warshVerses : c.hafsVerses)} آيات`}
          icon="book"
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
          }
        />
      ))}
      {!searchChapters(query).length && (
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
      {editions.map(e => {
        const t = runtime.text(e.id),
          installed = t && runtime.installed(t.pack);
        return (
          <Card key={e.id}>
            <AppText role="sectionTitle">{e.title}</AppText>
            <AppText role="caption">
              {e.recommended ? 'الخيار المقترح · ' : ''}
              {e.publisher}
            </AppText>
            <AppText>
              {installed
                ? 'جاهز دون اتصال'
                : t
                  ? 'متاح للتنزيل'
                  : 'غير متاح للتنزيل بعد'}
            </AppText>
            <AppText role="caption">
              {t
                ? 'نص قابل للقراءة والبحث مع الخط المطابق'
                : 'تتوفر القراءة بعد إتمام مراجعة المصدر والخط.'}
            </AppText>
            <Button
              label={selected === e.id ? 'المصحف المفضل' : 'اختيار هذه الرواية'}
              selected={selected === e.id}
              secondary={selected !== e.id}
              onPress={() =>
                act(runtime.select(e.id).then(() => setSelected(e.id)))
              }
            />
            <Button
              secondary
              label="تفاصيل المصحف والتنزيل"
              disabled={!ready || error}
              onPress={() =>
                navigation.navigate('QuranDownload', {editionId: e.id})
              }
            />
          </Card>
        );
      })}
      <Button
        secondary
        label="العودة دون تنزيل"
        onPress={() => navigation.goBack()}
      />
    </Page>
  );
}
export function MushafDownloadScreen({route, navigation}: any) {
  const {runtime, ready, error, retry} = useLibrary(),
    e = editionById(route.params.editionId),
    t = runtime.text(e.id),
    installed = t && runtime.installed(t.pack);
  return (
    <Page title="تنزيل المصحف" onBack={() => navigation.goBack()}>
      <AppText role="sectionTitle">{e.title}</AppText>
      <AppText>{e.publisher}</AppText>
      {error ? (
        <StateView
          title="تعذر فتح التنزيل"
          action={{label: 'إعادة المحاولة', onPress: retry}}
        />
      ) : !t ? (
        <StateView
          title="المصحف غير متاح للتنزيل بعد"
          description="لن يبدأ أي تنزيل حتى تكتمل مراجعة النص والخط والمصدر."
        />
      ) : (
        <Card>
          <AppText>
            {installed
              ? 'جاهز دون اتصال'
              : `حجم الحزمة: ${ltr(bytes(t.pack.assets.reduce((s, a) => s + a.bytes, 0)))}`}
          </AppText>
          <AppText role="caption">
            النص والخط المطابق محفوظان معا. تنطبق سياسة الشبكة المختارة في
            الإعدادات.
          </AppText>
          <Button
            label={installed ? 'فتح المصحف' : 'تنزيل هذا المصحف'}
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
        </Card>
      )}
      <Button
        secondary
        label="معلومات المصدر"
        onPress={() => navigation.navigate('QuranSource', {editionId: e.id})}
      />
      <Button
        secondary
        label="إدارة التنزيلات"
        onPress={() => navigation.navigate('Downloads')}
      />
    </Page>
  );
}
