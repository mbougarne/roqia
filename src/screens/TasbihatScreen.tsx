import React, {useContext, useState} from 'react';
import {View} from 'react-native';
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
      <Button
        secondary
        label="اختيار التسبيح"
        onPress={() => setChoosing(true)}
      />
      <View style={{alignItems: 'center', gap: 12}}>
        <View
          style={{
            width: 200,
            height: 200,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Svg
            width={200}
            height={200}
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
          <AppText role="screenTitle" style={{textAlign: 'center'}}>
            {number(count)}
          </AppText>
          <AppText role="caption">المتبقي</AppText>
        </View>
        <AppText role="caption">{`العدد الأصلي ${number(max)}`}</AppText>
      </View>
      <Button
        label={count === 0 ? 'اكتمل التسبيح' : 'اضغط بعد التسبيح'}
        disabled={count === 0}
        onPress={() => {
          state.decrementRepeat(id);
        }}
      />
      {saved.error && (
        <Button
          secondary
          label="إعادة تحميل المحفوظات"
          onPress={() => {
            void reloadBookmarks().catch(() => undefined);
          }}
        />
      )}
      <ReadingCard
        item={item}
        index={index}
        count={count}
        hideCounter
        audio={audio}
        bookmarkReady={saved.loaded && !saved.error}
        saved={saved.items.some(
          b => b.kind === 'devotional' && b.contentId === id,
        )}
        onCount={() => state.decrementRepeat(id)}
        onReset={() => state.resetRepeats({[id]: max})}
      />
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
