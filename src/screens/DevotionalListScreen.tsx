import React, {useContext} from 'react';
import {FlatList, I18nManager, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {type DataProps} from '../data';
import {type RepeatContextState} from '../store';
import {useScreenAudioPlayback} from '../hooks/useScreenAudioPlayback';
import {AppText, Button, IconButton, usePalette} from '../design/ui';
import {number, ltr} from '../design/format';
import {ReadingCard} from '../features/devotional/ReadingCard';
import {useConfirmReset} from '../features/devotional/ResetConfirmation';
import {reloadBookmarks, useBookmarks} from '../features/devotional/bookmarks';
export function DevotionalListScreen({
  items,
  title,
  repeatCtx,
  root = false,
}: {
  items: DataProps[];
  title: string;
  scope?: string;
  repeatCtx: React.Context<RepeatContextState>;
  root?: boolean;
}) {
  const confirmReset = useConfirmReset();
  const navigation = useNavigation<any>(),
    p = usePalette();
  const {repeatCounts, decrementRepeat, resetRepeats} = useContext(repeatCtx);
  const audio = useScreenAudioPlayback(
      items,
      items.length === 1 ? `devotional-item:${items[0].id}` : undefined,
    ),
    saved = useBookmarks();
  const completed = items.filter(
    i => (i.repeat ?? 0) > 0 && repeatCounts[i.id] === 0,
  ).length;
  const total = items.filter(i => (i.repeat ?? 0) > 0).length;
  return (
    <View style={{flex: 1, backgroundColor: p.background}}>
      <View
        style={{
          paddingHorizontal: 16,
          minHeight: 56,
          flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
        }}>
        <IconButton
          name="search"
          label="البحث في المحتوى"
          onPress={() => navigation.navigate('Search')}
        />
        <AppText
          role="screenTitle"
          accessibilityRole="header"
          style={{flex: 1}}>
          {title}
        </AppText>
        {!root && (
          <IconButton
            name="chevron-right"
            label="رجوع"
            onPress={() => navigation.goBack()}
          />
        )}
      </View>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        initialNumToRender={3}
        windowSize={5}
        contentContainerStyle={{
          padding: 20,
          gap: 16,
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
        ListHeaderComponent={
          <View style={{gap: 12}}>
            <AppText role="caption">{`${ltr(`${number(completed)} / ${number(total)}`)} مكتمل · يبقى تقدمك محفوظا`}</AppText>
            <Button
              icon={
                audio.isPlaylistActive && !audio.isAudioPaused
                  ? 'pause'
                  : 'play'
              }
              label={
                audio.isPlaylistActive && !audio.isAudioPaused
                  ? 'إيقاف مؤقت'
                  : 'استماع للكل'
              }
              onPress={() => {
                void audio.onPlayAllPress();
              }}
            />
            <Button
              secondary
              icon="reset"
              label="إعادة عدادات هذه الصفحة"
              onPress={() =>
                confirmReset('إعادة عدادات هذه الصفحة؟', () =>
                  resetRepeats(
                    Object.fromEntries(items.map(i => [i.id, i.repeat ?? 0])),
                  ),
                )
              }
            />
            {audio.error && (
              <AppText accessibilityRole="alert">
                تعذر تشغيل الصوت. أعد المحاولة من زر الاستماع.
              </AppText>
            )}
            {saved.error && (
              <Button
                secondary
                label="إعادة تحميل المحفوظات"
                onPress={() => {
                  void reloadBookmarks().catch(() => undefined);
                }}
              />
            )}
          </View>
        }
        renderItem={({item, index}) => (
          <ReadingCard
            item={item}
            index={index}
            count={repeatCounts[item.id] ?? item.repeat ?? 0}
            bookmarkReady={saved.loaded && !saved.error}
            saved={saved.items.some(
              b => b.kind === 'devotional' && b.contentId === item.id,
            )}
            audio={audio}
            onCount={() => decrementRepeat(item.id)}
            onReset={() => resetRepeats({[item.id]: item.repeat ?? 0})}
          />
        )}
      />
    </View>
  );
}
