import React, {useContext, useState} from 'react';
import {Pressable, View, useWindowDimensions} from 'react-native';
import {
  Disclosure,
  Segments,
  Ornament,
  Group,
  SettingRow,
  rtlRow,
} from '../design/components';
import Svg, {Circle} from 'react-native-svg';
import {tasbihatData} from '../data';
import {tasbihatRepeatContext} from '../store';
import {AppText, Button, Page, Sheet, usePalette} from '../design/ui';
import {number} from '../design/format';
import {ReadingCard} from '../features/devotional/ReadingCard';
import {useConfirmReset} from '../features/devotional/ResetConfirmation';
import {useBookmarks, reloadBookmarks} from '../features/devotional/bookmarks';
import {itemTitle} from '../features/devotional/discovery';
import {useScreenAudioPlayback} from '../hooks/useScreenAudioPlayback';
export function TasbihatScreen({navigation}: any) {
  const confirmReset = useConfirmReset();
  const {fontScale} = useWindowDimensions();
  const [id, setId] = useState(tasbihatData[0].id),
    [choosing, setChoosing] = useState(false);
  const state = useContext(tasbihatRepeatContext),
    saved = useBookmarks(),
    audio = useScreenAudioPlayback(tasbihatData),
    p = usePalette();
  const index = tasbihatData.findIndex(i => i.id === id),
    item = tasbihatData[index];
  const count = state.repeatCounts[id] ?? item.repeat ?? 0,
    max = item.repeat ?? 0;
  return (
    <Page title="التسبيح" onBack={() => navigation.goBack()}>
      <Segments
        value={id}
        options={tasbihatData
          .slice(0, 3)
          .map(i => ({value: i.id, label: itemTitle(i)}))}
        onChange={setId}
      />
      {fontScale > 1.2 && (
        <AppText role="devotional" style={{textAlign: 'center'}}>
          {item.content}
        </AppText>
      )}
      <View style={{alignItems: 'center', gap: 12}}>
        <View
          style={{
            width: 240,
            height: 240,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Svg
            width={240}
            height={240}
            viewBox="0 0 200 200"
            style={{position: 'absolute'}}
            accessible={false}>
            <Circle
              cx={100}
              cy={100}
              r={90}
              stroke={p.borderSubtle}
              strokeWidth={8}
              fill="none"
            />
            <Circle
              cx={100}
              cy={100}
              r={90}
              stroke={p.actionPrimary}
              strokeWidth={8}
              fill="none"
              strokeDasharray={`${565 * (max ? (max - count) / max : 0)} 565`}
              rotation={-90}
              origin="100,100"
            />
          </Svg>
          {fontScale <= 1.2 && (
            <AppText role="devotional" style={{textAlign: 'center'}}>
              {item.content}
            </AppText>
          )}
          <AppText role="counter" style={{textAlign: 'center'}}>
            {number(count)}
          </AppText>
          <AppText role="caption">المتبقي</AppText>
        </View>
        <AppText role="caption">{`العدد الأصلي ${number(max)}`}</AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="اضغط بعد التسبيح"
        accessibilityState={{disabled: count === 0}}
        disabled={count === 0}
        onPress={() => state.decrementRepeat(id)}
        style={({pressed}) => ({
          alignSelf: 'center',
          width: 104,
          height: 104,
          borderRadius: 52,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: p.actionPrimary,
          opacity: pressed || count === 0 ? 0.6 : 1,
        })}>
        <AppText
          role="label"
          style={{color: p.textOnAction, textAlign: 'center'}}>
          {count === 0 ? 'اكتمل' : 'سبّح'}
        </AppText>
      </Pressable>
      {saved.error && (
        <Button
          secondary
          label="إعادة تحميل المحفوظات"
          onPress={() => {
            void reloadBookmarks().catch(() => undefined);
          }}
        />
      )}
      <Ornament />
      <Group>
        <SettingRow title="العدد الأصلي" detail={number(max)} icon="tasbih" />
        <SettingRow
          title="اختيار التسبيح"
          icon="book"
          onPress={() => setChoosing(true)}
        />
        {item.audioFile && (
          <SettingRow
            title="استماع"
            icon="volume"
            onPress={() => void audio.onAudioPress(item.audioFile!)}
          />
        )}
      </Group>
      <Button
        secondary
        label="إعادة عدادات هذه الصفحة"
        onPress={() =>
          confirmReset('إعادة جميع عدادات التسبيح؟', () =>
            state.resetRepeats(
              Object.fromEntries(tasbihatData.map(i => [i.id, i.repeat ?? 0])),
            ),
          )
        }
      />
      <Disclosure title="النص والمحفوظات">
        <ReadingCard
          item={item}
          index={index}
          count={count}
          bookmarkReady={saved.loaded && !saved.error}
          saved={saved.items.some(
            b => b.kind === 'devotional' && b.contentId === id,
          )}
          audio={audio}
          onCount={() => state.decrementRepeat(id)}
          onReset={() => state.resetRepeats({[id]: max})}
        />
      </Disclosure>
      <Sheet
        title="اختيار التسبيح"
        visible={choosing}
        onClose={() => setChoosing(false)}>
        {tasbihatData.map(i => (
          <Button
            key={i.id}
            label={itemTitle(i)}
            secondary={i.id !== id}
            selected={i.id === id}
            onPress={() => {
              setId(i.id);
              setChoosing(false);
            }}
          />
        ))}
      </Sheet>
    </Page>
  );
}
