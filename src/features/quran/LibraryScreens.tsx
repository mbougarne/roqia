import React, {useState} from 'react';
import {Alert} from 'react-native';

import {useLibrary, useOnFocus} from './context';
import {editionById} from './domain';
import {Banner, RadioRow, Group, SettingRow} from '../../design/components';
import {AppText, Button, Page, StateView} from '../../design/ui';

export {QuranLibraryScreen} from './QuranLibrary';

export const act = (promise: Promise<unknown>) => {
  void promise.catch(() =>
    Alert.alert(
      'تعذر إتمام العملية',
      'حاول مرة أخرى. تقدمك ومحتواك المحفوظ لا يتغيران.',
    ),
  );
};

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
