import React, {useContext, useState} from 'react';
import {FlatList, I18nManager, Pressable, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {type DataProps} from '../data';
import {type RepeatContextState} from '../store';
import {useScreenAudioPlayback} from '../hooks/useScreenAudioPlayback';
import {AppIcon, AppText, Button, IconButton, usePalette} from '../design/ui';
import {
  SearchField,
  Segments,
  FeatureCard,
  Progress,
  rtlRow,
} from '../design/components';
import {matches} from '../features/devotional/discovery';
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
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState<'all' | 'saved'>('all');
  const dua = title === 'الأدعية';
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
          style={{
            flex: 1,
            textAlign: root ? 'right' : 'center',
            paddingHorizontal: 8,
          }}>
          {title}
        </AppText>
        {root && <AppIcon name="medallion" size={32} color={p.accent} />}
        {!root && (
          <IconButton
            name="chevron-right"
            label="رجوع"
            onPress={() => navigation.goBack()}
          />
        )}
      </View>
      <FlatList
        data={
          dua
            ? items.filter(
                i =>
                  matches(i, query, 'all') &&
                  (filter === 'all' ||
                    saved.items.some(
                      b => b.kind === 'devotional' && b.contentId === i.id,
                    )),
              )
            : items
        }
        keyExtractor={item => item.id}
        initialNumToRender={3}
        windowSize={5}
        contentContainerStyle={{
          padding: 16,
          paddingTop: 8,
          gap: 12,
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
        ListHeaderComponent={
          <View style={{gap: 12}}>
            {dua && (
              <>
                <SearchField
                  label="ابحث في الأدعية"
                  value={query}
                  onChange={setQuery}
                />
                <Segments
                  value={filter}
                  options={[
                    {value: 'all', label: 'الكل'},
                    {value: 'saved', label: 'المحفوظات'},
                  ]}
                  onChange={setFilter}
                />
              </>
            )}
            {!root && !dua && (
              <FeatureCard
                title={title === 'أذكار الصباح' ? 'بداية يوم مبارك' : title}
                detail="من أذكار اليوم · اقرأ بهدوء وطمأنينة"
                art={title === 'أذكار الصباح' ? 'morning' : 'evening'}
              />
            )}
            {root ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  audio.isPlaylistActive && !audio.isAudioPaused
                    ? 'إيقاف مؤقت'
                    : 'استماع للكل'
                }
                onPress={() => void audio.onPlayAllPress()}
                style={({pressed}) => ({
                  ...rtlRow,
                  minHeight: 88,
                  padding: 16,
                  borderRadius: 14,
                  backgroundColor: p.actionPrimary,
                  opacity: pressed ? 0.8 : 1,
                })}>
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: p.textOnAction,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <AppIcon
                    name={
                      audio.isPlaylistActive && !audio.isAudioPaused
                        ? 'pause'
                        : 'play'
                    }
                    color={p.actionPrimary}
                    size={28}
                  />
                </View>
                <AppText
                  role="sectionTitle"
                  style={{flex: 1, textAlign: 'center', color: p.textOnAction}}>
                  استماع للكل
                </AppText>
                <AppIcon name="headphones" size={44} color={p.textOnAction} />
              </Pressable>
            ) : (
              <>
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
                  onPress={() => void audio.onPlayAllPress()}
                />
                <Progress value={total ? completed / total : 0} />
              </>
            )}
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
        ListFooterComponent={
          <View style={{gap: 12}}>
            {root && (
              <>
                <AppText role="caption">{`${number(completed)} / ${number(total)} مكتمل · يبقى تقدمك محفوظا`}</AppText>
                <Progress value={total ? completed / total : 0} />
              </>
            )}
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
