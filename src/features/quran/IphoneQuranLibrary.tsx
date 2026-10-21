import React, {useState} from 'react';
import {Pressable, View} from 'react-native';

import {useLibrary, useOnFocus} from './context';
import {
  chapters,
  editionById,
  editions,
  type EditionId,
  type Locator,
} from './domain';
import {QuranIndex} from './QuranIndex';
import {Group, SettingRow, rtlRow} from '../../design/components';
import {
  AppText,
  AppIcon,
  Button,
  Card,
  IconButton,
  Page,
  StateView,
} from '../../design/ui';
import {useFormat} from '../../design/useFormat';

export function IphoneQuranLibrary({navigation}: any) {
  const {runtime, ready, error, retry} = useLibrary(),
    {number} = useFormat();
  const [id, setId] = useState<EditionId>(editions[0].id),
    [resume, setResume] = useState<Locator | null>(null),
    [loaded, setLoaded] = useState(false),
    [selectionError, setSelectionError] = useState(false),
    [attempt, setAttempt] = useState(0);
  useOnFocus(() => {
    let active = true;
    void runtime
      .preferred()
      .then(async e => {
        const position = await runtime.resume(e.id);
        if (active) {
          setId(e.id);
          setResume(position);
          setLoaded(true);
          setSelectionError(false);
        }
      })
      .catch(() => {
        if (active) setSelectionError(true);
      });
    return () => {
      active = false;
    };
  }, [runtime, attempt]);
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
            label="البحث في آيات القرآن"
            onPress={() => navigation.navigate('QuranSearch')}
          />
          <IconButton
            name="bookmark"
            label="علامات القراءة"
            onPress={() => navigation.navigate('QuranBookmarks')}
          />
        </View>
      }>
      {error || selectionError ? (
        <StateView
          title="تعذر فتح المكتبة"
          action={{
            label: 'إعادة المحاولة',
            onPress: () => {
              setSelectionError(false);
              setAttempt(n => n + 1);
              retry();
            },
          }}
        />
      ) : !ready || !loaded ? (
        <StateView title="جارٍ فتح القرآن الكريم…" busy />
      ) : (
        <>
          <Group>
            <SettingRow
              title={edition.title}
              detail={installed ? 'محفوظ على جهازك' : 'اختيار المصحف وتنزيله'}
              icon="book"
              onPress={() => navigation.navigate('QuranEditions')}
            />
          </Group>
          {resume && (
            <Group>
              <SettingRow
                title="متابعة القراءة"
                detail={`${chapters[resume.surah - 1].name} · الآية ${number(resume.verse)}`}
                icon="book"
                onPress={() => navigation.navigate('QuranReader', resume)}
              />
            </Group>
          )}
          {!installed && (
            <Card>
              <AppText>نزّل المصحف مرة واحدة للقراءة دون اتصال.</AppText>
              <Button
                label="تنزيل المصحف"
                onPress={() =>
                  navigation.navigate('QuranDownload', {editionId: id})
                }
              />
            </Card>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الاستماع للقرآن"
            style={{
              ...rtlRow,
              alignItems: 'center',
              minHeight: 44,
              gap: 8,
              paddingHorizontal: 8,
            }}
            onPress={() =>
              navigation.navigate('QuranPlayer', {
                editionId: id,
                surah: resume?.surah ?? 1,
              })
            }>
            <AppIcon name="headphones" size={20} />
            <AppText role="label">الاستماع للقرآن</AppText>
          </Pressable>
          {text && (
            <QuranIndex
              editionId={id}
              packVersion={text.pack.version}
              onSelect={target =>
                installed
                  ? navigation.navigate('QuranReader', target)
                  : navigation.navigate('QuranDownload', {editionId: id})
              }
            />
          )}
        </>
      )}
    </Page>
  );
}
