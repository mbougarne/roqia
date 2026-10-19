import {useNavigation} from '@react-navigation/native';
import React, {useContext, useState} from 'react';
import {FlatList, I18nManager, Pressable, View} from 'react-native';

import {type DataProps} from '../data';
import {
  SearchField,
  Segments,
  FeatureCard,
  Progress,
  rtlRow,
} from '../design/components';
import {ltr} from '../design/format';
import {PanelArtwork} from '../design/PanelArtwork';
import {
  AppIcon,
  AppText,
  Button,
  IconButton,
  StateView,
  usePalette,
} from '../design/ui';
import {useFormat} from '../design/useFormat';
import {reloadBookmarks, useBookmarks} from '../features/devotional/bookmarks';
import {matches} from '../features/devotional/discovery';
import {ReadingCard} from '../features/devotional/ReadingCard';
import {useConfirmReset} from '../features/devotional/ResetConfirmation';
import {useScreenAudioPlayback} from '../hooks/useScreenAudioPlayback';
import {type RepeatContextState, themeContext} from '../store';

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
  const {number} = useFormat();
  const confirmReset = useConfirmReset();
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState<'all' | 'saved'>('all');
  const dua = title === 'الأدعية';
  const {uiScale} = useContext(themeContext);
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
  const adhkar = !root && !dua && items.length > 1;
  const total = items.filter(i => (i.repeat ?? 0) > 0).length;
  const controls = (
    <View style={{backgroundColor: p.background, paddingVertical: 8, gap: 8}}>
      <View style={{...rtlRow, gap: 12}}>
        <View style={{flex: 1}}>
          <Button
            icon={
              audio.isPlaylistActive && !audio.isAudioPaused ? 'pause' : 'play'
            }
            label={
              audio.isPlaylistActive && !audio.isAudioPaused
                ? 'إيقاف مؤقت'
                : 'استماع للكل'
            }
            onPress={() => void audio.onPlayAllPress()}
          />
        </View>
        <View style={{flex: 1, gap: 6}}>
          <AppText role="caption">{`${ltr(`${number(completed)} / ${number(total)}`)} مكتمل`}</AppText>
          <Progress value={total ? completed / total : 0} />
        </View>
      </View>
    </View>
  );
  return (
    <View style={{flex: 1, backgroundColor: p.background}}>
      <View
        style={{
          paddingHorizontal: 16,
          minHeight: dua ? 64 : 56,
          flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
        }}>
        <IconButton
          name="search"
          label="البحث في المحتوى"
          onPress={() => navigation.navigate('Search')}
        />
        {adhkar && (
          <AppIcon
            name={title === 'أذكار الصباح' ? 'sun' : 'moon'}
            color={p.accent}
            size={28}
          />
        )}
        <AppText
          role="screenTitle"
          accessibilityRole="header"
          style={{
            flex: 1,
            textAlign: root ? 'right' : 'center',
            paddingHorizontal: 8,
            ...(dua && {fontSize: 24 * uiScale, lineHeight: 38 * uiScale}),
          }}>
          {title}
        </AppText>
        {dua && <AppIcon name="hands" color={p.accent} size={28} />}
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
            : adhkar
              ? [null, ...items]
              : items
        }
        keyExtractor={item => item?.id ?? 'sticky-progress'}
        stickyHeaderIndices={adhkar ? [1] : undefined}
        initialNumToRender={3}
        windowSize={5}
        contentContainerStyle={{
          padding: 16,
          paddingTop: 8,
          gap: dua ? 16 : 12,
          maxWidth: 560,
          width: '100%',
          alignSelf: 'center',
        }}
        ListHeaderComponent={
          <View style={{gap: dua ? 16 : 12}}>
            {dua && (
              <>
                <AppText
                  role="body"
                  style={{textAlign: 'center', color: p.textSecondary}}>
                  أدعية من القرآن والسنة
                </AppText>
                <SearchField
                  label="ابحث في الأدعية"
                  value={query}
                  onChange={setQuery}
                />
                <Segments
                  value={filter}
                  options={[
                    {value: 'all', label: 'الكل'},
                    {value: 'saved', label: 'المفضلة'},
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
                  overflow: 'hidden',
                  backgroundColor: p.actionPrimary,
                  opacity: pressed ? 0.8 : 1,
                })}>
                <PanelArtwork color={p.textOnAction} />
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
            ) : !adhkar && !dua ? (
              controls
            ) : null}

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
        ListEmptyComponent={
          dua ? (
            <StateView
              title={
                filter === 'saved' && saved.error
                  ? 'تعذر تحميل المفضلة'
                  : filter === 'saved' && !saved.loaded
                    ? 'جار تحميل المفضلة'
                    : filter === 'saved'
                      ? 'لا توجد أدعية مفضلة'
                      : 'لا توجد نتائج'
              }
              busy={filter === 'saved' && !saved.loaded && !saved.error}
              description="غيّر البحث أو احفظ دعاء من زر الإشارة في بطاقته."
            />
          ) : undefined
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
        renderItem={({item, index}) =>
          item === null ? (
            controls
          ) : (
            <ReadingCard
              item={item}
              showCompletion={root}
              dua={dua}
              index={adhkar ? index - 1 : index}
              count={repeatCounts[item.id] ?? item.repeat ?? 0}
              bookmarkReady={saved.loaded && !saved.error}
              saved={saved.items.some(
                b => b.kind === 'devotional' && b.contentId === item.id,
              )}
              audio={audio}
              onCount={() => decrementRepeat(item.id)}
              onReset={() => resetRepeats({[item.id]: item.repeat ?? 0})}
            />
          )
        }
      />
    </View>
  );
}
